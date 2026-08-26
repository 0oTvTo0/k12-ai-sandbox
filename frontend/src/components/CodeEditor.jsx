// Monaco 编辑器封装：语法高亮 + 错误行红色标记（波浪线/行背景/侧边圆点）+ 跳转定位
import { useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";

export default function CodeEditor({ code, onChange, dark, fontSize, errorLine }) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef([]);

  const handleMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
  };

  // errorLine 变化时，重画错误标记并滚动到该行
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    if (errorLine && errorLine >= 1) {
      // 红色波浪线（hover 出提示）
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
      // 行背景 + 侧边警示圆点
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
      }}
    />
  );
}
