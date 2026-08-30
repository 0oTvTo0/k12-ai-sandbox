// 左侧可收起面板：打怪通关关卡地图 + 每日挑战 + 运行历史
import { useState, useEffect } from "react";
import { getChallenges, getTiers, getDailyChallenge } from "../lib/api";
import { getHistory } from "../lib/storage";

export default function Sidebar({
  onLoadCode, collapsed, onToggle,
  onSelectChallenge, activeChallengeId, challengeMode, progress,
}) {
  const [tab, setTab] = useState("challenges"); // challenges | history
  const [challenges, setChallenges] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [daily, setDaily] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    getChallenges().then(setChallenges).catch(() => {});
    getTiers().then(setTiers).catch(() => {});
    getDailyChallenge().then(setDaily).catch(() => {});
    setHistory(getHistory());
  }, []);

  const refreshHistory = () => setHistory(getHistory());

  // 关卡解锁：上一关 4 题全过
  const tierUnlocked = (tier) => {
    if (tier <= 1) return true;
    const prevDone = challenges
      .filter((c) => c.tier === tier - 1)
      .every((c) => progress[c.id] === "passed");
    return prevDone;
  };

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
    { key: "challenges", icon: "⚔️", label: "挑战" },
    { key: "history", icon: "📜", label: "历史" },
  ];

  const doneCount = Object.values(progress).filter((v) => v === "passed").length;

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
            {t.key === "challenges" && doneCount > 0 && (
              <span className="ml-1 text-[9px] px-1 rounded-full"
                    style={{ background: "color-mix(in srgb, var(--ok) 20%, transparent)", color: "var(--ok)" }}>
                {doneCount}/20
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 内容列表 */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {tab === "challenges" && (
          <>
            {/* 每日挑战横幅 */}
            {daily && (
              <button
                onClick={() => onSelectChallenge(daily)}
                className="w-full text-left p-3 rounded-2xl animate-glow"
                style={{
                  background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 18%, transparent), color-mix(in srgb, var(--accent-2) 18%, transparent))",
                  border: "1px solid var(--line)",
                }}
              >
                <p className="text-sm font-extrabold text-main">📅 今日挑战</p>
                <p className="text-[11px] text-sub mt-0.5">{daily.title} · {daily.difficulty}</p>
              </button>
            )}

            {/* 关卡地图 */}
            {tiers.map((t) => {
              const unlocked = tierUnlocked(t.tier);
              const tierChallenges = challenges.filter((c) => c.tier === t.tier);
              const tierDone = tierChallenges.filter((c) => progress[c.id] === "passed").length;
              return (
                <div key={t.tier} className="rounded-2xl glass p-2.5 space-y-1.5">
                  {/* 关卡头 */}
                  <div className="flex items-center gap-2 px-1">
                    <span className={`text-xl ${unlocked ? "" : "grayscale opacity-50"}`}>{t.monster}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-extrabold text-main leading-tight">
                        第 {t.tier} 关 · {t.name}
                      </p>
                      <p className="text-[10px] text-sub">{t.reward_desc}</p>
                    </div>
                    <span className="text-[10px] font-bold" style={{ color: "var(--warn)" }}>
                      {tierDone}/4
                    </span>
                  </div>
                  {/* 关卡进度条 */}
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "color-mix(in srgb, var(--text-1) 8%, transparent)" }}>
                    <div className="h-full rounded-full transition-all duration-500"
                         style={{ width: `${tierDone * 25}%`, background: "linear-gradient(90deg, var(--accent), var(--ok))" }} />
                  </div>
                  {/* 题目列表 */}
                  {tierChallenges.map((c) => {
                    const passed = progress[c.id] === "passed";
                    const failed = progress[c.id] === "failed";
                    const active = activeChallengeId === c.id && challengeMode;
                    return (
                      <button
                        key={c.id}
                        disabled={!unlocked}
                        onClick={() => onSelectChallenge(c)}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left transition-all ${
                          active ? "ring-2 ring-(--accent) bg-(--accent)/10" : "hover-tint"
                        } ${!unlocked ? "opacity-45 cursor-not-allowed" : ""}`}
                      >
                        <span className="text-sm w-5 text-center shrink-0">
                          {passed ? "✅" : failed ? "💀" : unlocked ? "○" : "🔒"}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-xs font-bold text-main truncate">
                            {c.boss ? `👑 ${c.title}` : c.title}
                          </span>
                        </span>
                        <span className="text-[9px] font-bold shrink-0" style={{ color: "var(--warn)" }}>
                          {c.difficulty}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </>
        )}

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
