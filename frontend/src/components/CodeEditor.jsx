// Monaco 编辑器封装：真实 IDE 手感（FR-04）
// - 语法高亮 / 红波浪错误 / 侧边圆点 / 跳转定位（保留）
// - 括号引号自动闭合、括号颜色配对、缩进参考线、代码折叠、当前行高亮
// - Ctrl+Enter 运行、Ctrl+Shift+Enter 追踪
// - 中文代码片段（CompletionProvider + 工具栏 🧩 菜单插入）
// - 底部状态栏（行:列 | Python 3 | 状态）
import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import Editor from "@monaco-editor/react";

// 中文代码片段（工具栏 🧩 菜单 + 输入补全共用）
export const SNIPPETS = [
  { label: "🔁 for 循环", keywords: ["for", "循环"], code: "for i in range(5):\n    print(i)\n" },
  { label: "🤔 if 判断", keywords: ["if", "判断"], code: 'x = 10\nif x > 5:\n    print("x 大于 5")\nelse:\n    print("x 小于等于 5")\n' },
  { label: "🔂 while 循环", keywords: ["while", "循环"], code: 'n = 0\nwhile n < 5:\n    print("第", n, "次")\n    n += 1\n' },
  { label: "🏗️ 定义函数", keywords: ["def", "函数"], code: 'def greet(name):\n    print("你好，", name)\n\ngreet("小明")\n' },
  { label: "📋 列表遍历", keywords: ["list", "列表"], code: "nums = [1, 2, 3]\nfor n in nums:\n    print(n)\n" },
  { label: "🖨️ 打印输出", keywords: ["print", "打印"], code: 'print("你好，世界！")\n' },
];

const CodeEditor = forwardRef(function CodeEditor(
  { code, onChange, dark, fontSize, errorLine, onRun, onTrace, statusText = "就绪", skin = null,
    annotations = [], activeAnnotationId = null, annotationFocus = null, onGlyphClick },
  ref
) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef([]);
  const annDecorationsRef = useRef([]);
  const flashDecorationsRef = useRef([]);
  const [pos, setPos] = useState({ line: 1, column: 1 });

  // 对外暴露：插入片段 / 聚焦（供 Toolbar 🧩 菜单调用）
  useImperativeHandle(ref, () => ({
    insertSnippet(text) {
      const editor = editorRef.current;
      if (!editor) return;
      const sel = editor.getSelection();
      editor.executeEdits("snippet", [{ range: sel, text }]);
      editor.focus();
    },
    focus() {
      editorRef.current?.focus();
    },
  }));

  const handleMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // 奖励皮肤主题（P2 挑战奖励解锁，覆盖默认暗色）
    monaco.editor.defineTheme("glass-night", {
      base: "vs-dark", inherit: true, rules: [],
      colors: {
        "editor.background": "#0f1729",
        "editorLineNumber.foreground": "#5d6f94",
        "editorLineNumber.activeForeground": "#8fa3c8",
        "editorCursor.foreground": "#7b97fc",
        "editor.selectionBackground": "#3b5bdb55",
        "editorGutter.background": "#0f1729",
        "editorWidget.background": "#131c33",
      },
    });
    monaco.editor.defineTheme("cyber-wings", {
      base: "vs-dark", inherit: true, rules: [
        { token: "keyword", foreground: "00e5ff" },
        { token: "string", foreground: "ff9d5c" },
        { token: "number", foreground: "b14eff" },
        { token: "comment", foreground: "5d6f94", fontStyle: "italic" },
      ],
      colors: {
        "editor.background": "#0a0e1c",
        "editorLineNumber.foreground": "#3d4d75",
        "editorLineNumber.activeForeground": "#00e5ff",
        "editorCursor.foreground": "#00e5ff",
        "editor.selectionBackground": "#b14eff44",
        "editorGutter.background": "#0a0e1c",
        "editorWidget.background": "#0e1428",
        "editorIndentGuide.activeBackground": "#00e5ff33",
      },
    });

    // 快捷键：Ctrl+Enter 运行 / Ctrl+Shift+Enter 追踪
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => onRun?.());
    if (onTrace) {
      editor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter,
        () => onTrace?.()
      );
    }

    // 状态栏：光标位置
    editor.onDidChangeCursorPosition((e) => {
      setPos((p) =>
        p.line === e.position.lineNumber && p.column === e.position.column
          ? p
          : { line: e.position.lineNumber, column: e.position.column }
      );
    });

    // 批注角标点击 → 通知外部（批注栏联动）
    editor.onMouseDown((e) => {
      if (e.target?.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN && onGlyphClick) {
        onGlyphClick(e.target.position.lineNumber);
      }
    });

    // 中文代码片段补全
    monaco.languages.registerCompletionItemProvider("python", {
      triggerCharacters: [" ", "f", "i", "w", "d", "p", "l"],
      provideCompletionItems(model, position) {
        const word = model.getWordUntilPosition(position);
        const range = new monaco.Range(
          position.lineNumber, word.startColumn,
          position.lineNumber, word.endColumn
        );
        const kw = word.word.toLowerCase();
        const suggestions = SNIPPETS
          .filter((s) => s.keywords.some((k) => k.includes(kw) || kw.includes(k)))
          .map((s) => ({
            label: s.label,
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: s.code,
            range,
            detail: "小码星球代码片段",
          }));
        return { suggestions };
      },
    });
  };

  // errorLine 变化时，重画错误标记并滚动到该行
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    if (errorLine && errorLine >= 1) {
      monaco.editor.setModelMarkers(editor.getModel(), "k12", [
        {
          severity: monaco.MarkerSeverity.Error,
          message: "💥 这一行出问题啦，快检查看看！",
          startLineNumber: errorLine,
          startColumn: 1,
          endLineNumber: errorLine,
          endColumn: editor.getModel().getLineMaxColumn(Math.min(errorLine, editor.getModel().getLineCount())),
        },
      ]);
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [
        {
          range: new monaco.Range(errorLine, 1, errorLine, 1),
          options: {
            isWholeLine: true,
            className: "error-line-decoration",
            glyphMarginClassName: "error-line-glyph",
            glyphMarginHoverMessage: { value: "错误在这里" },
          },
        },
      ]);
      editor.revealLineInCenter(errorLine);
    } else {
      monaco.editor.setModelMarkers(editor.getModel(), "k12", []);
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
    }
  }, [errorLine]);

  // 批注装饰：半透明罩色 + 行号区编号角标（error红/warn橙/tip蓝）
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    if (annotations.length) {
      const decos = [];
      annotations.forEach((a, i) => {
        decos.push({
          range: new monaco.Range(a.start_line, 1, a.end_line || a.start_line, 1),
          options: {
            isWholeLine: true,
            glyphMarginClassName: `annotation-glyph annotation-glyph-${a.severity}`,
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          },
        });
        // 罩色用 overlay 方式：半透明整行背景
        decos.push({
          range: new monaco.Range(a.start_line, 1, a.end_line || a.start_line, 1),
          options: {
            isWholeLine: true,
            className: "annotation-tint-" + a.severity,
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          },
        });
      });
      annDecorationsRef.current = editor.deltaDecorations(annDecorationsRef.current, decos);
    } else {
      annDecorationsRef.current = editor.deltaDecorations(annDecorationsRef.current, []);
    }
  }, [annotations]);

  // 批注聚焦：滚动到行 + 短暂闪烁高亮
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco || !annotationFocus) return;
    editor.revealLineInCenter(annotationFocus);
    flashDecorationsRef.current = editor.deltaDecorations(flashDecorationsRef.current, [
      {
        range: new monaco.Range(annotationFocus, 1, annotationFocus, 1),
        options: { isWholeLine: true, className: "annotation-flash" },
      },
    ]);
    const t = setTimeout(() => {
      flashDecorationsRef.current = editor.deltaDecorations(flashDecorationsRef.current, []);
    }, 1600);
    return () => clearTimeout(t);
  }, [annotationFocus]);

  // 主题解析：奖励皮肤优先（均为深色）；无皮肤时跟随亮/暗主题
  const editorTheme = skin === "glass-night" ? "glass-night"
    : skin === "cyber-wings" ? "cyber-wings"
    : dark ? "vs-dark" : "vs";

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          defaultLanguage="python"
          value={code}
          onChange={(v) => onChange(v ?? "")}
          onMount={handleMount}
          theme={editorTheme}
          options={{
            fontSize,
            fontFamily: '"Fira Code", "JetBrains Mono", Consolas, monospace',
            fontLigatures: true,
            minimap: { enabled: false },
            smoothScrolling: true,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            glyphMargin: true,
            lineNumbersMinChars: 3,
            padding: { top: 12, bottom: 12 },
            renderLineHighlight: "all",
            roundedSelection: true,
            cursorSmoothCaretAnimation: "on",
            // --- 真实 IDE 手感 ---
            autoClosingBrackets: "always",
            autoClosingQuotes: "always",
            autoSurround: "languageDefined",
            bracketPairColorization: { enabled: true },
            guides: { indentation: true, bracketPairs: true },
            folding: true,
            foldingHighlight: true,
            showFoldingControls: "always",
            renderWhitespace: "selection",
            matchBrackets: "always",
            suggestOnTriggerCharacters: true,
            quickSuggestions: { other: true, comments: false, strings: false },
          }}
        />
      </div>
      {/* 状态栏 */}
      <div className="flex items-center gap-3 px-3 h-6 border-t border-(--hairline) text-[11px] text-sub font-mono shrink-0">
        <span>行 {pos.line}, 列 {pos.column}</span>
        <span className="chip">Python 3</span>
        <span className="ml-auto flex items-center gap-1">
          {statusText === "运行中…" && <span className="w-1.5 h-1.5 rounded-full bg-(--warn) animate-pulse inline-block" />}
          {statusText}
        </span>
        <span className="text-faint hidden sm:inline">Ctrl+Enter 运行</span>
      </div>
    </div>
  );
});

export default CodeEditor;
