// 右侧面板：AI 老师聊天窗（含对话气泡、情绪头像、多轮追问）
import { useState, useRef, useEffect } from "react";
import { askAI } from "../lib/api";
import { recordAiAsk } from "../lib/storage";
import Mascot from "./Mascot";

export default function AITutor({ code, output, errorLine, onFocusLine, onUnlockBadges }) {
  const [expanded, setExpanded] = useState(false);
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState([]); // [{role, content, emotion?}]
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  // 把有意义的上下文整理给模型，但不塞满屏幕
  const msgs = history.map((h) => ({ role: h.role, content: h.content }));

  const doAsk = async (kind, q) => {
    if (loading) return;
    setLoading(true);
    setExpanded(true);
    setHistory((h) => [...h, { role: "user", content: q }]);

    try {
      const ai = await askAI({ code, question: q, output, history: msgs, kind });
      const emotion = ai.emotion || "happy";
      setHistory((h) => [
        ...h,
        { role: "assistant", content: ai.reply, emotion },
      ]);
      if (ai.error_line != null && onFocusLine) {
        onFocusLine(ai.error_line);
      }
      const newBadges = recordAiAsk();
      if (newBadges.length && onUnlockBadges) onUnlockBadges(newBadges);
    } catch {
      setHistory((h) => [
        ...h,
        { role: "assistant", content: "唔，老师网络卡了一下 😵 请再问一次吧～", emotion: "think" },
      ]);
    }
    setLoading(false);
    setQuestion("");
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, loading]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800">
      {/* 头部：折叠/展开 */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 px-4 py-3 font-bold text-sm text-grape dark:text-purple-400
                   hover:bg-purple-50 dark:hover:bg-purple-500/5 transition-colors"
      >
        <span className="text-lg">🤖</span>
        AI 小码老师
        <span className="ml-auto text-xs text-slate-400">{expanded ? "收起 ▲" : "展开 ▼"}</span>
      </button>

      {expanded && (
        <>
          {/* 快捷入口（未聊天时） */}
          {history.length === 0 && (
            <div className="px-4 pb-3 space-y-1.5">
              <QuickBtn label="🆘 帮我看看这段代码" onClick={() => doAsk("help", "老师，帮我看看这段代码吧？")} />
              {output && (
                <QuickBtn label="💥 这个报错怎么改？" onClick={() => doAsk("error", "代码报错了，怎么修？")} />
              )}
              <QuickBtn label="💡 有没有更好的写法？" onClick={() => doAsk("improve", "我的代码能优化吗？给个建议吧～")} />
            </div>
          )}

          {/* 聊天历史 */}
          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3 text-sm min-h-0">
            {history.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : ""}`}>
                {m.role === "assistant" && (
                  <Mascot emotion={m.emotion || "happy"} size={32} className="shrink-0 mt-0.5" />
                )}
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed animate-pop-in ${
                    m.role === "user"
                      ? "bg-brand-500 text-white rounded-br-md"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-md"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2 items-center text-slate-400 text-xs">
                <Mascot emotion="think" size={28} />
                <span className="animate-pulse">小码老师思考中...</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* 输入框 */}
          <form
            onSubmit={(e) => { e.preventDefault(); if (question.trim()) doAsk("chat", question.trim()); }}
            className="flex gap-2 px-4 py-3 border-t border-slate-200 dark:border-slate-700"
          >
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="追问小码老师..."
              className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600
                         bg-slate-50 dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-200
                         focus:outline-none focus:ring-2 focus:ring-grape focus:border-transparent"
            />
            <button
              type="submit"
              disabled={!question.trim() || loading}
              className="px-4 py-2 rounded-xl bg-grape hover:bg-purple-600 text-white font-bold text-sm
                         disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              发送
            </button>
          </form>
        </>
      )}
    </div>
  );
}

function QuickBtn({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-sm
                 text-grape dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-500/20
                 transition-colors font-medium"
    >
      {label}
    </button>
  );
}
