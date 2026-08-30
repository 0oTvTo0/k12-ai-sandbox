// 通关奖励全屏弹层：3D 翻转徽章 + 粒子雨 + 奖励清单 + 称号大字
// reward: { tier, tierName, monster, badgeDef?, title, items: [{icon,label}], allDone }
import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";

export default function RewardOverlay({ reward, onDone }) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (!reward || firedRef.current) return;
    firedRef.current = true;

    // 粒子雨
    const end = Date.now() + 3000;
    const colors = ["#00e5ff", "#b14eff", "#ffb020", "#34e2a0", "#ff6b9d"];
    (function frame() {
      confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0, y: 0.6 }, colors });
      confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1, y: 0.6 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
    setTimeout(() => {
      confetti({ particleCount: 120, spread: 120, origin: { x: 0.5, y: 0.4 }, colors, startVelocity: 40 });
    }, 800);
  }, [reward]);

  if (!reward) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-md p-4">
      <div className="glass-strong w-[440px] max-h-[88vh] overflow-y-auto p-7 text-center animate-pop-in">
        <p className="text-sub text-sm mb-1">
          🎉 你击败了 {reward.monster} {reward.tierName}！
        </p>
        <h2 className="text-3xl font-extrabold text-main mb-5 animate-bounce-soft">
          通关成功！
        </h2>

        {/* 3D 翻转徽章 */}
        <div className="flex justify-center mb-6" style={{ perspective: "900px" }}>
          <div
            className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl"
            style={{
              background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
              animation: "flip-3d 0.8s cubic-bezier(.2,.8,.2,1) both",
              boxShadow: "0 0 40px rgba(0,229,255,.35)",
              transform: "rotateY(180deg)",
            }}
          >
            <span style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
              {reward.badgeDef?.icon || "🏅"}
            </span>
          </div>
        </div>

        {/* 称号大字 */}
        {reward.title && (
          <div className="mb-5">
            <p className="text-xs text-sub mb-1">获得称号</p>
            <p className="text-2xl font-extrabold bg-gradient-to-r from-(--accent) via-(--accent-2) to-(--warn) bg-clip-text text-transparent">
              {reward.title}
            </p>
          </div>
        )}

        {/* 奖励清单 */}
        {reward.items?.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-5">
            {reward.items.map((it) => (
              <div key={it.label} className="glass rounded-2xl p-3 flex items-center gap-2 animate-fade-up">
                <span className="text-2xl">{it.icon}</span>
                <span className="text-xs font-bold text-main text-left leading-tight">{it.label}</span>
              </div>
            ))}
          </div>
        )}

        {reward.allDone && (
          <p className="text-sm font-bold text-(--warn) mb-4 animate-glow rounded-xl py-2 px-3"
             style={{ background: "color-mix(in srgb, var(--warn) 12%, transparent)" }}>
            🌟 全部 20 关通关！你就是传说中的「小码传说」！
          </p>
        )}

        <button onClick={onDone} className="btn btn-primary w-full justify-center py-2.5">
          太棒了！
        </button>
      </div>
    </div>
  );
}
