// 左侧可收起面板：包含三页 —— 示例模板 / 每日挑战 / 运行历史
import { useState, useEffect } from "react";
import { getExamples, getChallenges } from "../lib/api";
import { getHistory } from "../lib/storage";

export default function Sidebar({ onLoadCode, collapsed, onToggle }) {
  const [tab, setTab] = useState("examples"); // examples | challenges | history
  const [examples, setExamples] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    getExamples().then(setExamples).catch(() => {});
    getChallenges().then(setChallenges).catch(() => {});
    setHistory(getHistory());
  }, []);

  const refreshHistory = () => setHistory(getHistory());

  if (collapsed) {
    return (
      <button
        onClick={onToggle}
        className="flex items-center justify-center w-10 bg-indigo-50 dark:bg-slate-800 hover:bg-indigo-100
                   dark:hover:bg-slate-700 transition-colors border-r border-indigo-100 dark:border-slate-700"
        title="展开侧边栏"
      >
        <span className="text-indigo-400 dark:text-slate-400 text-lg">▶</span>
      </button>
    );
  }

  const tabs = [
    { key: "examples", icon: "📚", label: "示例" },
    { key: "challenges", icon: "🎯", label: "挑战" },
    { key: "history", icon: "📜", label: "历史" },
  ];

  return (
    <div className="w-72 flex flex-col bg-white dark:bg-slate-800 border-r border-indigo-100 dark:border-slate-700 overflow-hidden">
      {/* 头部 */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-indigo-100 dark:border-slate-700">
        <span className="font-extrabold text-sm text-indigo-600 dark:text-indigo-400">导航面板</span>
        <button
          onClick={onToggle}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
          title="收起侧边栏"
        >
          ◀
        </button>
      </div>

      {/* 标签切换 */}
      <div className="flex border-b border-indigo-100 dark:border-slate-700">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); if (t.key === "history") refreshHistory(); }}
            className={`flex-1 py-2 text-xs font-bold transition-colors ${
              tab === t.key
                ? "text-brand-600 dark:text-brand-400 bg-brand-50/50 dark:bg-brand-500/5 border-b-2 border-brand-500"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* 内容列表 */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {tab === "examples" &&
          examples.map((ex) => (
            <button
              key={ex.id}
              onClick={() => onLoadCode(ex.code)}
              className="w-full text-left p-2.5 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-500/10
                         transition-colors group"
            >
              <div className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-brand-600 dark:group-hover:text-brand-400">
                {ex.title}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {ex.description}
              </div>
              <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded">
                {ex.category}
              </span>
            </button>
          ))}

        {tab === "challenges" &&
          challenges.map((ch) => (
            <button
              key={ch.id}
              onClick={() => onLoadCode(ch.starter_code)}
              className="w-full text-left p-2.5 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-500/10
                         transition-colors group"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400">
                  {ch.title}
                </span>
                <span className="text-[10px] bg-sun/20 text-sun px-1.5 py-0.5 rounded-full font-bold">
                  {ch.difficulty}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {ch.description}
              </div>
            </button>
          ))}

        {tab === "history" &&
          (history.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center mt-8">
              还没有运行历史，快来写代码吧！
            </p>
          ) : (
            history.map((h, i) => (
              <button
                key={i}
                onClick={() => onLoadCode(h.code)}
                className="w-full text-left p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/30
                           transition-colors group"
              >
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    h.status === "success" ? "bg-emerald-400" :
                    h.status === "error" ? "bg-rose-400" : "bg-slate-400"
                  }`} />
                  {new Date(h.time).toLocaleString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </div>
                <code className="block text-[11px] text-slate-700 dark:text-slate-300 truncate mt-0.5 font-mono leading-relaxed">
                  {h.code.split("\n").slice(0, 3).join(" · ")}
                </code>
              </button>
            ))
          ))}
      </div>
    </div>
  );
}
