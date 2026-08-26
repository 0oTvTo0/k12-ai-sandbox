// 编辑器工具栏：运行/跟踪/停止/保存/求助/字体缩放/stdin输入
import { useState } from "react";

export default function Toolbar({
  onRun, onTrace, onStop, onSave, onAskAI,
  running, fontSize, onFontChange,
  canStop, stdin, onStdinChange,
}) {
  const [showStdin, setShowStdin] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
      {/* 运行按钮 */}
      <button
        onClick={onRun}
        disabled={running}
        className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm
                   disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all shadow shadow-emerald-200 dark:shadow-none"
      >
        <span>▶</span> 运行
      </button>

      {/* 单步追踪 */}
      <button
        onClick={onTrace}
        disabled={running}
        className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-violet-500 hover:bg-violet-600 text-white font-bold text-sm
                   disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all shadow shadow-violet-200 dark:shadow-none"
      >
        <span>🔍</span> 追踪
      </button>

      {/* 停止（作业运行中才亮） */}
      <button
        onClick={onStop}
        disabled={!canStop}
        className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm
                   disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all shadow shadow-rose-200 dark:shadow-none"
      >
        <span>⏹</span> 停止
      </button>

      <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-0.5" />

      {/* AI 求助 */}
      <button
        onClick={onAskAI}
        className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-grape hover:bg-purple-600 text-white font-bold text-sm
                   active:scale-95 transition-all shadow shadow-purple-200 dark:shadow-none animate-pop-in"
      >
        <span>🤖</span> 求助老师
      </button>

      {/* 保存 */}
      <button
        onClick={onSave}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-sm font-bold
                   hover:bg-amber-200 dark:hover:bg-amber-500/30 active:scale-95 transition-all"
      >
        <span>💾</span> 保存
      </button>

      {/* stdin 输入框 */}
      <div className="relative ml-1">
        <button
          onClick={() => setShowStdin(!showStdin)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold
                     hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
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
              className="w-48 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600
                         bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-200
                         focus:outline-none focus:ring-2 focus:ring-brand-400 shadow-md"
            />
          </div>
        )}
      </div>

      <div className="flex-1" />

      {/* 字体大小 */}
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 rounded-lg px-1.5 py-1">
        <button
          onClick={() => onFontChange(-1)}
          className="w-6 h-6 rounded text-sm font-bold text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-600 transition-colors"
        >
          A<span className="text-[10px]">-</span>
        </button>
        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono min-w-7 text-center">
          {fontSize}
        </span>
        <button
          onClick={() => onFontChange(+1)}
          className="w-6 h-6 rounded text-sm font-bold text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-600 transition-colors"
        >
          A<span className="text-[10px]">+</span>
        </button>
      </div>
    </div>
  );
}
