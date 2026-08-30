// 成就徽章展示弹窗：盘点已解锁和待解锁的成就（P4 加 3D 翻转）
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="glass-strong w-[420px] max-h-[85vh] overflow-y-auto p-6 animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题 */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold text-main">
            🏅 我的成就
          </h2>
          <button
            onClick={onClose}
            className="icon-btn text-sub"
            aria-label="关闭"
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
                  owned ? "glass" : "opacity-40 grayscale glass"
                } ${isNew ? "ring-2 ring-(--warn) animate-wiggle" : ""}`}
              >
                <span className={`text-2xl ${isNew ? "animate-bounce-soft" : ""}`}>
                  {def.icon}
                </span>
                <span className="text-[11px] font-bold text-main leading-tight">
                  {def.name}
                </span>
                <span className="text-[9px] text-sub leading-tight">
                  {def.desc}
                </span>
              </div>
            );
          })}
        </div>

        {/* 新解锁弹窗 */}
        {newlyUnlocked && newlyUnlocked.length > 0 && (
          <div className="mt-4 p-3 rounded-2xl text-center animate-pop-in"
               style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--warn) 18%, transparent), color-mix(in srgb, var(--accent) 18%, transparent))" }}>
            <p className="text-lg font-extrabold text-main">
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
          className="btn btn-primary w-full justify-center mt-4 py-2.5"
        >
          知道了！
        </button>
      </div>
    </div>
  );
}

function StatTile({ icon, label, value }) {
  return (
    <div className="flex flex-col items-center p-2 rounded-2xl glass">
      <span className="text-lg">{icon}</span>
      <span className="text-lg font-extrabold text-main">{value}</span>
      <span className="text-[10px] text-sub">{label}</span>
    </div>
  );
}
