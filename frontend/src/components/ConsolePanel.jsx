// 输出控制台：运行结果｜错误详情｜单步追踪 三个标签页
import { useState } from "react";

const TABS = ["📤 输出", "🐞 错误", "🔍 追踪"];

export default function ConsolePanel({ result, running }) {
  const [tab, setTab] = useState(0);

  const status = result?.status; // undefined=未运行, "running", "success","error","timeout","blocked","cancelled"
  const isDone = !!result && !running;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
      {/* 标签栏 */}
      <div className="flex border-b border-slate-200 dark:border-slate-700">
        {TABS.map((t, i) => (
          <button
            key={i}
            onClick={() => setTab(i)}
            className={`flex-1 py-2 text-sm font-bold transition-colors ${
              tab === i
                ? "text-brand-600 dark:text-brand-400 border-b-2 border-brand-500 bg-brand-50/50 dark:bg-brand-500/5"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-auto p-3 text-sm font-mono leading-relaxed">
        {/* === 输出页 === */}
        {tab === 0 && (
          <div>
            {/* 状态条 */}
            {status && (
              <StatusBadge status={status} running={running} duration={result?.duration_ms} />
            )}
            {/* 输出正文 */}
            {result?.stdout ? (
              <pre className="whitespace-pre-wrap break-words text-slate-800 dark:text-slate-200">
                {result.stdout}
              </pre>
            ) : isDone ? (
              <p className="text-slate-400 dark:text-slate-500 italic mt-4 text-center">(
                还没有输出内容呢，快写点代码跑起来吧！)</p>
            ) : null}
          </div>
        )}

        {/* === 错误页 === */}
        {tab === 1 && (
          <div>
            {result?.error_type ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-berry font-bold">
                  <span className="text-lg">💥</span>
                  <span>{result.error_type}</span>
                  {result.error_line && (
                    <span className="text-slate-500 dark:text-slate-400 text-xs font-normal">
                      → 第 {result.error_line} 行
                    </span>
                  )}
                </div>
                {result.stderr && (
                  <pre className="whitespace-pre-wrap break-words text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700 overflow-auto max-h-80">
                    {result.stderr}
                  </pre>
                )}
              </div>
            ) : result?.status === "blocked" ? (
              <div className="text-amber-600 dark:text-amber-400">
                <span className="text-lg">🛡️</span>{" "}
                {result.stderr}
              </div>
            ) : isDone ? (
              <p className="text-slate-400 dark:text-slate-500 italic text-center mt-4">
                {result?.status === "success" ? "🎉 没出 bug，完美！" : ""}
              </p>
            ) : null}
          </div>
        )}

        {/* === 追踪页 === */}
        {tab === 2 && (
          <div className="space-y-1">
            {result?.trace?.length > 0 ? (
              result.trace.map((t, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 px-2 py-1 rounded hover:bg-slate-50 dark:hover:bg-slate-700/30 text-xs group"
                >
                  <span className="text-slate-400 dark:text-slate-500 font-mono min-w-10">
                    第{t.line}行
                  </span>
                  <span className="text-slate-600 dark:text-slate-400 font-mono">
                    {t.locals_snapshot &&
                      Object.entries(t.locals_snapshot)
                        .map(([k, v]) => `${k}=${v}`)
                        .join(",  ")}
                  </span>
                </div>
              ))
            ) : isDone ? (
              <p className="text-slate-400 dark:text-slate-500 italic text-center mt-4">
                点击工具栏的 <strong>🔍 追踪</strong> 按钮，就能看到每一步变量的变化啦！
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

/** 执行状态彩色标签 */
function StatusBadge({ status, running, duration }) {
  if (running) {
    return (
      <div className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 font-sans text-sm animate-pulse">
        <span>⏳</span> 代码正在执行中，请稍候...
      </div>
    );
  }

  const cfg = {
    success:  { icon: "✅", label: "运行成功！", cl: "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
    error:    { icon: "❌", label: "出错了", cl: "bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300" },
    timeout:  { icon: "⏰", label: "被喊停了（超时或内存超标）", cl: "bg-orange-100 dark:bg-orange-500/15 text-orange-700 dark:text-orange-300" },
    blocked:  { icon: "🛡️", label: "安全拦截", cl: "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300" },
    cancelled:{ icon: "⏹", label: "已停止", cl: "bg-slate-100 dark:bg-slate-500/15 text-slate-600 dark:text-slate-400" },
  }[status];

  if (!cfg) return null;
  return (
    <div className={`flex items-center gap-2 mb-2 px-3 py-1.5 rounded-lg ${cfg.cl} font-sans text-sm animate-pop-in`}>
      <span>{cfg.icon}</span> {cfg.label}
      {duration != null && <span className="ml-auto text-xs opacity-60">{duration}ms</span>}
    </div>
  );
}
