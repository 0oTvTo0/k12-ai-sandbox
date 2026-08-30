// 左侧可收起面板：每日挑战 / 运行历史（示例栏已按 FR-09 移除，内容并入挑战题库）
import { useState, useEffect } from "react";
import { getChallenges } from "../lib/api";
import { getHistory } from "../lib/storage";

export default function Sidebar({ onLoadCode, collapsed, onToggle, challengeMode }) {
  const [tab, setTab] = useState("challenges"); // challenges | history
  const [challenges, setChallenges] = useState([]);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    getChallenges().then(setChallenges).catch(() => {});
    setHistory(getHistory());
  }, []);

  const refreshHistory = () => setHistory(getHistory());

  if (collapsed) {
    return (
      <button
        onClick={onToggle}
        className="glass w-10 self-stretch flex items-center justify-center text-sub hover:text-accent transition-colors"
        title="展开侧边栏"
      >
        <span className="text-lg">▶</span>
      </button>
    );
  }

  const tabs = [
    { key: "challenges", icon: "🎯", label: "挑战" },
    { key: "history", icon: "📜", label: "历史" },
  ];

  return (
    <div className="w-72 shrink-0 glass flex flex-col overflow-hidden">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-(--hairline)">
        <span className="font-extrabold text-sm text-accent">导航面板</span>
        <button
          onClick={onToggle}
          className="text-sub hover:text-main text-xs"
          title="收起侧边栏"
        >
          ◀
        </button>
      </div>

      {/* 标签切换 */}
      <div className="flex border-b border-(--hairline)">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); if (t.key === "history") refreshHistory(); }}
            className={`tab-btn ${tab === t.key ? "active" : ""}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* 内容列表 */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {tab === "challenges" &&
          (challenges.length === 0 ? (
            <p className="text-xs text-faint text-center mt-8">
              正在加载挑战…
            </p>
          ) : (
            challenges.map((ch) => (
              <button
                key={ch.id}
                onClick={() => onLoadCode(ch.starter_code)}
                className="w-full text-left p-2.5 rounded-2xl hover-tint group"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-main group-hover:text-(--warn)">
                    {ch.title}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: "color-mix(in srgb, var(--warn) 15%, transparent)", color: "var(--warn)" }}>
                    {ch.difficulty}
                  </span>
                </div>
                <div className="text-[11px] text-sub mt-0.5">
                  {ch.description}
                </div>
              </button>
            ))
          ))}

        {tab === "history" &&
          (history.length === 0 ? (
            <p className="text-xs text-faint text-center mt-8">
              还没有运行历史，快来写代码吧！
            </p>
          ) : (
            history.map((h, i) => (
              <button
                key={i}
                onClick={() => onLoadCode(h.code)}
                className="w-full text-left p-2 rounded-2xl hover-tint group"
              >
                <div className="flex items-center gap-1.5 text-[10px] text-faint">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    h.status === "success" ? "bg-(--ok)" :
                    h.status === "error" ? "bg-(--err)" : "bg-(--text-3)"
                  }`} />
                  {new Date(h.time).toLocaleString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </div>
                <code className="block text-[11px] text-sub group-hover:text-main truncate mt-0.5 font-mono leading-relaxed">
                  {h.code.split("\n").slice(0, 3).join(" · ")}
                </code>
              </button>
            ))
          ))}
      </div>
    </div>
  );
}
