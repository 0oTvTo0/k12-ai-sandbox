// 成就徽章展示弹窗：盘点已解锁和待解锁的成就
import { useState, useEffect } from "react";
import { BADGE_DEFS, getUnlockedBadges, getStats } from "../lib/storage";

export default function Achievements({ open, onClose, newlyUnlocked }) {
  const [unlocked, setUnlocked] = useState([]);
  const [stats, setStats] = useState({});
  const [animateId, setAnimateId] = useState(null);

  useEffect(() => {
    if (open) {
      setUnlocked(getUnlockedBadges());
      setStats(getStats());
      // 如果有新解锁的，弹出来时就高亮它
      if (newlyUnlocked && newlyUnlocked.length) {
        setAnimateId(newlyUnlocked[newlyUnlocked.length - 1].id);
        setTimeout(() => setAnimateId(null), 2000);
      }
    }
  }, [open, newlyUnlocked]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-[420px] max-h-[85vh] overflow-y-auto p-6 animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题 */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-200">
            🏅 我的成就
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 hover:text-slate-600
                       dark:hover:text-slate-200 font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 总体统计 */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <StatTile icon="🚀" label="总运行" value={stats.runs || 0} />
          <StatTile icon="✅" label="成功" value={stats.success || 0} />
          <StatTile icon="🔥" label="最多连胜" value={stats.bestStreak || 0} />
        </div>

        {/* 徽章网格 */}
        <div className="grid grid-cols-4 gap-3">
          {BADGE_DEFS.map((def) => {
            const owned = unlocked.includes(def.id);
            const isNew = def.id === animateId;
            return (
              <div
                key={def.id}
                className={`flex flex-col items-center gap-1 p-3 rounded-2xl text-center transition-all ${
                  owned
                    ? "bg-amber-50 dark:bg-amber-500/10"
                    : "bg-slate-50 dark:bg-slate-700/30 opacity-40 grayscale"
                } ${isNew ? "ring-4 ring-amber-400 animate-wiggle" : ""}`}
              >
                <span className={`text-2xl ${isNew ? "animate-bounce-soft" : ""}`}>
                  {def.icon}
                </span>
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 leading-tight">
                  {def.name}
                </span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 leading-tight">
                  {def.desc}
                </span>
              </div>
            );
          })}
        </div>

        {/* 新解锁弹窗 */}
        {newlyUnlocked && newlyUnlocked.length > 0 && (
          <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-500/15 dark:to-yellow-500/15 text-center animate-pop-in">
            <p className="text-lg font-extrabold text-amber-700 dark:text-amber-300">
              🎉 解锁新成就！
            </p>
            <div className="flex justify-center gap-3 mt-2">
              {newlyUnlocked.map((b) => (
                <span key={b.id} className="text-3xl animate-float">
                  {b.icon}
                </span>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold
                     text-sm transition-colors active:scale-[0.98]"
        >
          知道了！
        </button>
      </div>
    </div>
  );
}

function StatTile({ icon, label, value }) {
  return (
    <div className="flex flex-col items-center p-2 rounded-xl bg-slate-50 dark:bg-slate-700/50">
      <span className="text-lg">{icon}</span>
      <span className="text-lg font-extrabold text-slate-800 dark:text-slate-200">{value}</span>
      <span className="text-[10px] text-slate-500 dark:text-slate-400">{label}</span>
    </div>
  );
}
