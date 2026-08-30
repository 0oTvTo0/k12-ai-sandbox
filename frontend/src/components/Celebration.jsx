// 喝彩动画：运行成功时撒花 + 弹出随机鼓励语。使用 canvas-confetti。
import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";

export default function Celebration({ show, message, onDone }) {
  const timerRef = useRef(null);

  useEffect(() => {
    if (!show) return;

    // 第一波：从两侧撒花
    const duration = 2500;
    const end = Date.now() + duration;
    const colors = ["#5b73f5", "#a855f7", "#ffb020", "#22c55e", "#f43f5e", "#7b97fc"];

    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();

    // 2.5 秒后第二波：中心爆炸
    timerRef.current = setTimeout(() => {
      confetti({
        particleCount: 80,
        spread: 100,
        origin: { x: 0.5, y: 0.4 },
        colors,
        startVelocity: 35,
      });
      onDone?.();
    }, duration);

    return () => clearTimeout(timerRef.current);
  }, [show, onDone]);

  if (!show || !message) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-pop-in pointer-events-none">
      <div className="glass-strong px-6 py-3 font-extrabold text-lg text-center"
           style={{ background: "linear-gradient(135deg, var(--ok), var(--accent))", color: "#fff" }}>
        🎉 {message}
      </div>
    </div>
  );
}
