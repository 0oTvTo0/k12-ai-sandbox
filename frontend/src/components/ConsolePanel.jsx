// 结果面板：严格编译器式状态机（FR-05 / FR-10）
//   idle    未运行      → 吉祥物引导
//   running 运行中      → 光带动画
//   error   出错/超时/拦截/取消 → 红黑「错误墙」+ 定位 + 问老师 + Traceback
//   success 成功        → 输出页（trace 模式含 🔍 追踪 Tab）
// 挑战模式下未通过只显示反馈墙，不显示输出（P2 启用）
import { useState } from "react";
import Mascot from "./Mascot";

// 儿童友好的错误解释
const ERROR_FRIENDLY = {
  ZeroDivisionError: "除零错误：除法里不能出现 0 哦！0 就像黑洞，会把数字吸走～",
  NameError: "名字没定义：这个变量或函数还没被创建就被使用了，检查是不是拼错了？",
  SyntaxError: "语法错误：这句话电脑没听懂。检查括号、冒号、引号是不是漏了或多了？",
  TypeError: "类型错误：不同类型的东西混在一起算啦，比如数字 + 文字。",
  IndentationError: "缩进错误：Python 靠缩进分块，检查空格是不是忽多忽少？",
  IndexError: "越界错误：下标超出了列表的长度，数数看到底有几个元素？",
  KeyError: "钥匙错误：字典里没有这个键，就像抽屉上没有这个标签。",
  ValueError: "取值错误：类型对但值不对，比如 int(\"abc\") 想把字母变数字。",
  RecursionError: "递归太深：函数自己调用自己太多层啦，检查一下退出条件。",
};

const STATUS_FRIENDLY = {
  timeout: "超时啦：代码跑得太久被喊停了，可能写了个死循环？",
  blocked: "安全拦截：这行代码太危险，小码星球不允许！",
  cancelled: "已停止：你手动停止了运行。",
};

export default function ConsolePanel({ result, running, code, onLocateError, onAskAI, challengeMode = false, judgeVerdict = null }) {
  const [showTraceback, setShowTraceback] = useState(false);
  const [traceTab, setTraceTab] = useState(false);

  const status = result?.status;
  const isDone = !!result && !running;

  // ---------- idle ----------
  if (!result && !running) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
        <div className="animate-breathe"><Mascot emotion="idle" size={64} /></div>
        <p className="text-sub text-sm">
          写点什么，然后点 <span className="text-accent font-bold">▶ 运行</span> 看看会发生什么～
        </p>
      </div>
    );
  }

  // ---------- running ----------
  if (running || status === "running") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <div className="relative w-48 h-1.5 rounded-full overflow-hidden glass">
          <div className="absolute top-0 bottom-0 w-16 rounded-full animate-lightbar"
               style={{ background: "linear-gradient(90deg, transparent, var(--accent), transparent)", animation: "lightbar 1.2s ease-in-out infinite" }} />
        </div>
        <p className="text-sub text-sm">代码正在执行中，请稍候…</p>
      </div>
    );
  }

  // ---------- 挑战未通过（P2 启用） ----------
  if (challengeMode && judgeVerdict && !judgeVerdict.passed) {
    return (
      <div className="flex flex-col h-full p-4 gap-3" style={{ background: "linear-gradient(160deg, #2a0808, #4a0d0d)", color: "#ffd7dc" }}>
        <div className="flex items-center gap-3">
          <span className="text-4xl">🤔</span>
          <div>
            <p className="text-xl font-extrabold text-[#ff6b6b]">还没通关哦！</p>
            <p className="text-sm opacity-80 mt-0.5">{judgeVerdict.feedback || "再想想，检查一下你的代码～"}</p>
          </div>
        </div>
        <div className="flex gap-2 mt-auto">
          <button className="btn btn-primary text-sm" onClick={onAskAI}>🤖 问问小码老师</button>
        </div>
      </div>
    );
  }

  // ---------- error 错误墙 ----------
  if (status !== "success") {
    const friendly =
      ERROR_FRIENDLY[result?.error_type] ||
      STATUS_FRIENDLY[status] ||
      "程序运行出错啦！看看下面的报错信息～";

    const errorLineNum = result?.error_line;
    const errorLineText = errorLineNum && code
      ? code.split("\n")[errorLineNum - 1]?.trim() || ""
      : "";

    const head =
      status === "error" ? (result.error_type || "程序错误") :
      status === "timeout" ? "运行超时" :
      status === "blocked" ? "安全拦截" :
      status === "cancelled" ? "已停止" : "出错了";

    return (
      <div className="flex flex-col h-full p-4 gap-3 overflow-auto"
           style={{ background: "linear-gradient(160deg, #2a0808, #4a0d0d)", color: "#ffd7dc", border: "1px solid rgba(255,59,48,.35)" }}>
        {/* 大字错误类型 */}
        <div className="flex items-center gap-3">
          <span className="text-4xl animate-bounce-soft">💥</span>
          <div>
            <p className="text-2xl font-extrabold text-[#ff6b6b]">{head}</p>
            <p className="text-sm opacity-90 mt-0.5">{friendly}</p>
          </div>
        </div>

        {/* 出错位置 */}
        {errorLineNum && (
          <div className="rounded-xl p-3 space-y-1.5" style={{ background: "rgba(255,59,48,.12)" }}>
            <p className="text-sm font-bold text-[#ff9d9d]">📍 第 {errorLineNum} 行</p>
            {errorLineText && (
              <pre className="font-mono text-sm whitespace-pre-wrap break-words text-[#ffe3e3]">
                {errorLineText}
              </pre>
            )}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => onLocateError?.(errorLineNum)}
                className="btn px-3 py-1.5 text-sm font-bold"
                style={{ background: "rgba(255,107,107,.2)", color: "#ff9d9d", border: "1px solid rgba(255,107,107,.4)" }}
              >
                📍 定位到错误行
              </button>
              <button
                onClick={onAskAI}
                className="btn px-3 py-1.5 text-sm font-bold"
                style={{ background: "linear-gradient(135deg,#00e5ff,#b14eff)", color: "#08111f" }}
              >
                🤖 问问小码老师
              </button>
            </div>
          </div>
        )}

        {/* 超时/拦截/取消的详细说明 */}
        {result?.stderr && (
          <button
            onClick={() => setShowTraceback((s) => !s)}
            className="text-left text-xs text-[#ff9d9d] underline-offset-2 hover:underline"
          >
            {showTraceback ? "▼ 收起" : "▶ 展开"}报错详情（Traceback）
          </button>
        )}
        {showTraceback && result?.stderr && (
          <pre className="font-mono text-xs whitespace-pre-wrap break-words rounded-xl p-3 overflow-auto max-h-52"
               style={{ background: "rgba(0,0,0,.35)" }}>
            {result.stderr}
          </pre>
        )}

        {/* trace 模式失败时也展示追踪数据 */}
        {result?.trace?.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-bold text-[#ff9d9d]">🔍 运行过程（追踪）</p>
            {result.trace.map((t, i) => (
              <div key={i} className="flex items-start gap-2 text-xs" style={{ color: "rgba(255,215,220,.8)" }}>
                <span className="font-mono min-w-10 opacity-60">第{t.line}行</span>
                <span className="font-mono">
                  {t.locals_snapshot && Object.entries(t.locals_snapshot).map(([k, v]) => `${k}=${v}`).join(",  ")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ---------- success 输出页 ----------
  const hasTrace = (result?.trace?.length || 0) > 0;
  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-(--hairline)">
        <button
          onClick={() => setTraceTab(false)}
          className={`tab-btn ${!traceTab ? "active" : ""}`}
        >
          📤 输出
        </button>
        {hasTrace && (
          <button
            onClick={() => setTraceTab(true)}
            className={`tab-btn ${traceTab ? "active" : ""}`}
          >
            🔍 追踪 <span className="text-[10px] opacity-60">{result.trace.length} 步</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto p-3">
        {!traceTab && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm animate-pop-in"
                 style={{ background: "color-mix(in srgb, var(--ok) 14%, transparent)", color: "var(--ok)" }}>
              <span>✅</span> 运行成功！
              {result.duration_ms != null && <span className="ml-auto text-xs opacity-60">{result.duration_ms}ms</span>}
            </div>
            {result.stdout ? (
              <pre className="whitespace-pre-wrap break-words text-sm font-mono text-main leading-relaxed">
                {result.stdout}
              </pre>
            ) : (
              <p className="text-faint italic text-sm mt-2 text-center">
                程序跑完了，但什么都没打印。试试 <code className="text-accent">print()</code> 输出点什么？
              </p>
            )}
          </div>
        )}
        {traceTab && hasTrace && (
          <div className="space-y-1.5">
            <p className="text-xs text-sub">每行代码执行后，各变量的值：</p>
            {result.trace.map((t, i) => (
              <div key={i} className="flex items-start gap-2 px-2 py-1.5 rounded-xl glass text-xs animate-fade-up">
                <span className="chip shrink-0 mt-0.5">第{t.line}行</span>
                <span className="text-sub font-mono">
                  {t.locals_snapshot && Object.entries(t.locals_snapshot).length
                    ? Object.entries(t.locals_snapshot).map(([k, v]) => <VarChip key={k} k={k} v={v} />)
                    : <span className="text-faint italic">（本行没有变量变化）</span>}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function VarChip({ k, v }) {
  return (
    <span className="inline-flex items-center gap-1 mr-2">
      <span className="text-(--accent)">{k}</span>
      <span className="text-faint">=</span>
      <span className="text-main">{String(v).slice(0, 60)}</span>
    </span>
  );
}
