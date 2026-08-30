// 编辑器工具栏：运行/追踪/停止/求助/保存/片段/stdin/字号
import { useState } from "react";
import { SNIPPETS } from "./CodeEditor";

export default function Toolbar({
  onRun, onTrace, onStop, onSave, onAskAI, onInsertSnippet, onExitChallenge,
  running, fontSize, onFontChange,
  canStop, stdin, onStdinChange,
  challengeLabel,
}) {
  const [showStdin, setShowStdin] = useState(false);
  const [showSnippets, setShowSnippets] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-(--hairline)">
      {/* 运行按钮 */}
      <button onClick={onRun} disabled={running} className="btn btn-primary" title="Ctrl+Enter">
        <span>▶</span> 运行
      </button>

      {/* 单步追踪 */}
      <button
        onClick={onTrace}
        disabled={running}
        className="btn bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white
                   disabled:opacity-45 disabled:cursor-not-allowed
                   shadow shadow-violet-200 dark:shadow-none"
        title="Ctrl+Shift+Enter"
      >
        <span>🔍</span> 追踪
      </button>

      {/* 停止（运行中才亮） */}
      <button
        onClick={onStop}
        disabled={!canStop}
        className="btn bg-gradient-to-r from-rose-500 to-red-500 text-white
                   disabled:opacity-30 disabled:cursor-not-allowed
                   shadow shadow-rose-200 dark:shadow-none"
      >
        <span>⏹</span> 停止
      </button>

      <div className="w-px h-6 bg-(--hairline) mx-0.5" />

      {/* AI 求助 */}
      <button
        onClick={onAskAI}
        className="btn animate-pop-in"
        style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
      >
        <span>🤖</span> 求助老师
      </button>

      {/* 代码片段菜单 */}
      <div className="relative">
        <button
          onClick={() => setShowSnippets((s) => !s)}
          className="btn btn-ghost"
          title="插入常用代码片段"
        >
          🧩 片段
        </button>
        {showSnippets && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setShowSnippets(false)} />
            <div className="absolute top-full mt-1 left-0 w-56 glass-strong p-1.5 z-40 animate-pop-in space-y-0.5">
              {SNIPPETS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => { onInsertSnippet?.(s.code); setShowSnippets(false); }}
                  className="w-full text-left px-3 py-2 rounded-xl text-sm text-main hover-tint"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 保存 */}
      <button onClick={onSave} className="btn btn-ghost">
        <span>💾</span> 保存
      </button>

      {/* stdin 输入框 */}
      <div className="relative ml-1">
        <button
          onClick={() => setShowStdin(!showStdin)}
          className="btn btn-ghost text-xs"
        >
          {showStdin ? "📥" : "📤"} 输入
        </button>
        {showStdin && (
          <div className="absolute top-full mt-1 left-0 z-20 animate-slide-up">
            <input
              type="text"
              value={stdin}
              onChange={(e) => onStdinChange(e.target.value)}
              placeholder="给 input() 准备的数据..."
              className="w-48 px-3 py-1.5 rounded-xl glass text-sm text-main placeholder:text-faint
                         focus:outline-none focus:ring-2 focus:ring-(--accent)"
            />
          </div>
        )}
      </div>

      {/* 挑战模式标识 */}
      {challengeLabel && (
        <>
          <span className="chip animate-pop-in" title="当前挑战">
            ⚔️ {challengeLabel}
          </span>
          {onExitChallenge && (
            <button
              onClick={onExitChallenge}
              className="btn btn-ghost text-xs"
              title="退出挑战模式"
            >
              ✖ 退出
            </button>
          )}
        </>
      )}

      <div className="flex-1" />

      {/* 字体大小 */}
      <div className="flex items-center gap-1 glass rounded-full px-1.5 py-0.5">
        <button
          onClick={() => onFontChange(-1)}
          className="w-6 h-6 rounded-full text-sm font-bold text-sub hover:text-main hover:bg-(--hairline) transition-colors"
          title="减小字号"
        >
          A<span className="text-[10px]">-</span>
        </button>
        <span className="text-xs text-sub font-mono min-w-7 text-center">
          {fontSize}
        </span>
        <button
          onClick={() => onFontChange(+1)}
          className="w-6 h-6 rounded-full text-sm font-bold text-sub hover:text-main hover:bg-(--hairline) transition-colors"
          title="增大字号"
        >
          A<span className="text-[10px]">+</span>
        </button>
      </div>
    </div>
  );
}
