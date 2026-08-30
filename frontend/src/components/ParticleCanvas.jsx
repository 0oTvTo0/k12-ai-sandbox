// 暗夜模式星空粒子：单层 Canvas，≤100 粒子，只动画透明度/位移（性能红线 §3.3）
import { useEffect, useRef } from "react";

export default function ParticleCanvas({ density = 70 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let w, h, raf;

    const stars = Array.from({ length: Math.min(density, 100) }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.5 + 0.5,
      speed: Math.random() * 0.0008 + 0.0002,   // 缓慢下飘
      a: Math.random() * 0.5 + 0.25,
      tw: Math.random() * Math.PI * 2,          // 闪烁相位
    }));

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        s.y += s.speed;
        if (s.y > 1) { s.y = -0.01; s.x = Math.random(); }
        s.tw += 0.02;
        const alpha = s.a * (0.6 + 0.4 * Math.sin(s.tw));
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180, 210, 255, ${alpha.toFixed(3)})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [density]);

  return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true" />;
}
