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
  { code, onChange, dark, fontSize, errorLine, onRun, onTrace, statusText = "就绪" },
  ref
) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef([]);
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          defaultLanguage="python"
          value={code}
          onChange={(v) => onChange(v ?? "")}
          onMount={handleMount}
          theme={dark ? "vs-dark" : "vs"}
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
