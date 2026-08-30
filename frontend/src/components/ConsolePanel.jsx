// 输出控制台：运行结果｜错误详情｜单步追踪 三个标签页（P1 将重构为四态状态机）
import { useState } from "react";

const TABS = ["📤 输出", "🐞 错误", "🔍 追踪"];

export default function ConsolePanel({ result, running }) {
  const [tab, setTab] = useState(0);

  const status = result?.status; // undefined=未运行, "running", "success","error","timeout","blocked","cancelled"
  const isDone = !!result && !running;

  return (
    <div className="flex flex-col h-full">
      {/* 标签栏 */}
      <div className="flex border-b border-(--hairline)">
        {TABS.map((t, i) => (
          <button
            key={i}
            onClick={() => setTab(i)}
            className={`tab-btn ${tab === i ? "active" : ""}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-auto p-3 text-sm font-mono leading-relaxed text-main">
        {/* === 输出页 === */}
        {tab === 0 && (
          <div>
            {status && (
              <StatusBadge status={status} running={running} duration={result?.duration_ms} />
            )}
            {result?.stdout ? (
              <pre className="whitespace-pre-wrap break-words text-main">
                {result.stdout}
              </pre>
            ) : isDone ? (
              <p className="text-faint italic mt-4 text-center">
                (还没有输出内容呢，快写点代码跑起来吧！)
              </p>
            ) : null}
          </div>
        )}

        {/* === 错误页 === */}
        {tab === 1 && (
          <div>
            {result?.error_type ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-bold text-(--err)">
                  <span className="text-lg">💥</span>
                  <span>{result.error_type}</span>
                  {result.error_line && (
                    <span className="text-sub text-xs font-normal">
                      → 第 {result.error_line} 行
                    </span>
                  )}
                </div>
                {result.stderr && (
                  <pre className="whitespace-pre-wrap break-words text-sub glass p-3 overflow-auto max-h-80">
                    {result.stderr}
                  </pre>
                )}
              </div>
            ) : result?.status === "blocked" ? (
              <div className="text-(--warn)">
                <span className="text-lg">🛡️</span>{" "}
                {result.stderr}
              </div>
            ) : isDone ? (
              <p className="text-faint italic text-center mt-4">
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
                  className="flex items-start gap-2 px-2 py-1 rounded hover:bg-(--hairline) text-xs group"
                >
                  <span className="text-faint font-mono min-w-10">
                    第{t.line}行
                  </span>
                  <span className="text-sub font-mono">
                    {t.locals_snapshot &&
                      Object.entries(t.locals_snapshot)
                        .map(([k, v]) => `${k}=${v}`)
                        .join(",  ")}
                  </span>
                </div>
              ))
            ) : isDone ? (
              <p className="text-faint italic text-center mt-4">
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
      <div className="relative flex items-center gap-2 mb-2 px-3 py-1.5 rounded-xl overflow-hidden text-sm animate-pulse"
           style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)" }}>
        <span className="absolute top-0 bottom-0 w-10 opacity-30 animate-lightbar bg-gradient-to-r from-transparent via-white to-transparent"
              style={{ animation: "lightbar 1.2s ease-in-out infinite" }} />
        <span>⏳</span> 代码正在执行中，请稍候...
      </div>
    );
  }

  const cfg = {
    success:  { icon: "✅", label: "运行成功！", color: "var(--ok)" },
    error:    { icon: "❌", label: "出错了", color: "var(--err)" },
    timeout:  { icon: "⏰", label: "被喊停了（超时或内存超标）", color: "var(--warn)" },
    blocked:  { icon: "🛡️", label: "安全拦截", color: "var(--warn)" },
    cancelled:{ icon: "⏹", label: "已停止", color: "var(--text-2)" },
  }[status];

  if (!cfg) return null;
  return (
    <div className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-xl text-sm animate-pop-in"
         style={{ background: "color-mix(in srgb, " + cfg.color + " 14%, transparent)", color: cfg.color }}>
      <span>{cfg.icon}</span> {cfg.label}
      {duration != null && <span className="ml-auto text-xs opacity-60">{duration}ms</span>}
    </div>
  );
}
