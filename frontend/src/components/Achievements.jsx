// 成就徽章展示弹窗：徽章盘点 + 称号 + 编辑器皮肤 + 吉祥物换装（试衣间）
import { useState, useEffect } from "react";
import {
  BADGE_DEFS, getUnlockedBadges, getStats,
  getSkins, getTitles, getMascotWear,
} from "../lib/storage";

const SKIN_INFO = {
  "glass-night": { name: "玻璃之夜", desc: "深蓝玻璃质感编辑器" },
  "cyber-wings": { name: "赛博之翼", desc: "霓虹青紫配色编辑器" },
};

const WEAR_INFO = {
  cap: { name: "小帽子", icon: "🧢" },
  glasses: { name: "小眼镜", icon: "🕶️" },
  cape: { name: "小披风", icon: "🧣" },
  crown: { name: "小皇冠", icon: "👑" },
  wings: { name: "小翅膀", icon: "🦋" },
};

export default function Achievements({ open, onClose, newlyUnlocked, skin, onEquipSkin, wear, onEquipWear }) {
  const [unlocked, setUnlocked] = useState([]);
  const [stats, setStats] = useState({});
  const [animateId, setAnimateId] = useState(null);
  const [titles, setTitles] = useState([]);
  const [skins, setSkins] = useState([]);
  const [wearOwned, setWearOwned] = useState([]);

  useEffect(() => {
    if (open) {
      setUnlocked(getUnlockedBadges());
      setStats(getStats());
      setTitles(getTitles());
      setSkins(getSkins());
      setWearOwned(getMascotWear());
      // 如果有新解锁的，弹出来时就高亮它
      if (newlyUnlocked && newlyUnlocked.length) {
        setAnimateId(newlyUnlocked[newlyUnlocked.length - 1].id);
        setTimeout(() => setAnimateId(null), 2000);
      }
    }
  }, [open, newlyUnlocked]);

  if (!open) return null;

  const toggleWear = (id) => {
    const next = wear.includes(id) ? wear.filter((w) => w !== id) : [...wear, id];
    onEquipWear?.(next);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="glass-strong w-[460px] max-h-[88vh] overflow-y-auto p-6 animate-pop-in"
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
        <SectionTitle>徽章</SectionTitle>
        <div className="grid grid-cols-4 gap-2.5 mb-5">
          {BADGE_DEFS.map((def) => {
            const owned = unlocked.includes(def.id);
            const isNew = def.id === animateId;
            return (
              <div
                key={def.id}
                className={`flex flex-col items-center gap-1 p-2.5 rounded-2xl text-center transition-all ${
                  owned ? "glass" : "opacity-40 grayscale glass"
                } ${isNew ? "ring-2 ring-(--warn) animate-wiggle" : ""}`}
              >
                <span className={`text-2xl ${isNew ? "animate-bounce-soft" : ""}`}>
                  {def.icon}
                </span>
                <span className="text-[10px] font-bold text-main leading-tight">
                  {def.name}
                </span>
                <span className="text-[8px] text-sub leading-tight">
                  {def.desc}
                </span>
              </div>
            );
          })}
        </div>

        {/* 称号 */}
        <SectionTitle>称号</SectionTitle>
        <div className="flex flex-wrap gap-2 mb-5">
          {titles.length === 0 ? (
            <p className="text-xs text-faint">通关挑战可获得称号！</p>
          ) : (
            titles.map((t) => (
              <span key={t} className="chip text-xs px-2.5 py-1 animate-pop-in">
                🏅 {t}
              </span>
            ))
          )}
        </div>

        {/* 编辑器皮肤 */}
        <SectionTitle>编辑器皮肤</SectionTitle>
        <div className="space-y-2 mb-5">
          {skins.length === 0 ? (
            <p className="text-xs text-faint">通关第 3、5 关可解锁炫酷皮肤！</p>
          ) : (
            skins.map((s) => (
              <div key={s} className="flex items-center gap-2 glass rounded-2xl p-2.5">
                <span className="text-xl">🎨</span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-main">{SKIN_INFO[s]?.name || s}</p>
                  <p className="text-[10px] text-sub">{SKIN_INFO[s]?.desc}</p>
                </div>
                <button
                  onClick={() => onEquipSkin?.(s)}
                  className={`btn text-xs ${skin === s ? "btn-primary" : "btn-ghost"}`}
                >
                  {skin === s ? "✓ 使用中" : "装备"}
                </button>
              </div>
            ))
          )}
        </div>

        {/* 吉祥物换装 */}
        <SectionTitle>吉祥物换装</SectionTitle>
        <div className="grid grid-cols-2 gap-2 mb-2">
          {wearOwned.length === 0 ? (
            <p className="text-xs text-faint col-span-2">通关挑战给小码老师换装！</p>
          ) : (
            wearOwned.map((w) => (
              <button
                key={w}
                onClick={() => toggleWear(w)}
                className={`flex items-center gap-2 rounded-2xl p-2.5 text-left transition-all ${
                  wear.includes(w) ? "glass ring-2 ring-(--accent)" : "glass opacity-50"
                }`}
              >
                <span className="text-xl">{WEAR_INFO[w]?.icon}</span>
                <span className="text-xs font-bold text-main">{WEAR_INFO[w]?.name || w}</span>
              </button>
            ))
          )}
        </div>

        {/* 新解锁弹窗 */}
        {newlyUnlocked && newlyUnlocked.length > 0 && (
          <div className="mt-3 p-3 rounded-2xl text-center animate-pop-in"
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

function SectionTitle({ children }) {
  return (
    <p className="text-xs font-extrabold text-sub mb-2 mt-1 uppercase tracking-wide">
      {children}
    </p>
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
