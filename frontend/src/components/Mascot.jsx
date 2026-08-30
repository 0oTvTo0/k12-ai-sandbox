// AI 老师"小码"的卡通形象：纯 SVG 绘制，随 emotion 切换表情。
// wear: 换装列表 ["cap","glasses","cape","crown","wings"]（挑战奖励解锁）
// emotion: idle | happy | think | encourage | celebrate
export default function Mascot({ emotion = "idle", size = 56, className = "", wear = [] }) {
  // 不同表情下的眼睛与嘴巴
  const eyes = {
    idle: { left: "M32 44 a5 6 0 1 0 0.1 0", right: "M68 44 a5 6 0 1 0 0.1 0", type: "dot" },
    happy: { type: "smile" },
    think: { type: "think" },
    encourage: { type: "wink" },
    celebrate: { type: "star" },
  };
  const e = eyes[emotion] || eyes.idle;

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`select-none ${className}`}
      role="img"
      aria-label="小码老师"
    >
      {/* 披风（换装） */}
      {wear.includes("cape") && (
        <path d="M20 40 Q6 70 14 96 L86 96 Q94 70 80 40 Q64 52 50 52 Q36 52 20 40 Z"
              fill="#b14eff" opacity="0.85" stroke="#7a2bd4" strokeWidth="2" />
      )}
      {/* 翅膀（换装） */}
      {wear.includes("wings") && (
        <>
          <path d="M20 42 Q2 30 6 12 Q22 16 30 34 Z" fill="#00e5ff" opacity="0.9" stroke="#0891b2" strokeWidth="1.5" />
          <path d="M80 42 Q98 30 94 12 Q78 16 70 34 Z" fill="#00e5ff" opacity="0.9" stroke="#0891b2" strokeWidth="1.5" />
        </>
      )}

      {/* 天线 + 顶部小灯（庆祝时变色） */}
      <line x1="50" y1="14" x2="50" y2="6" stroke="#8b93b8" strokeWidth="3" strokeLinecap="round" />
      <circle cx="50" cy="5" r="4" fill={emotion === "celebrate" ? "#ffb020" : "#5b73f5"}>
        {emotion === "celebrate" && (
          <animate attributeName="opacity" values="1;0.3;1" dur="0.6s" repeatCount="indefinite" />
        )}
      </circle>

      {/* 皇冠（换装） */}
      {wear.includes("crown") && (
        <path d="M30 20 L36 8 L48 17 L58 6 L72 18 L68 22 L32 22 Z" fill="#ffb020" stroke="#d97706" strokeWidth="1.5" />
      )}
      {/* 帽子（换装） */}
      {wear.includes("cap") && (
        <path d="M24 20 Q24 4 50 4 Q76 4 76 20 Z" fill="#ff6b9d" stroke="#e04078" strokeWidth="2" />
      )}

      {/* 头部 */}
      <rect x="16" y="16" width="68" height="60" rx="20" fill="#ffffff" stroke="#5b73f5" strokeWidth="3.5" />
      {/* 脸颊红晕 */}
      <circle cx="26" cy="58" r="4.5" fill="#ffc9d4" opacity="0.8" />
      <circle cx="74" cy="58" r="4.5" fill="#ffc9d4" opacity="0.8" />

      {/* 眼睛 */}
      <g className="mascot-eyes">
        {e.type === "dot" && (
          <>
            <circle cx="34" cy="44" r="5" fill="#2b3350" />
            <circle cx="66" cy="44" r="5" fill="#2b3350" />
            <circle cx="35.5" cy="42.5" r="1.6" fill="#fff" />
            <circle cx="67.5" cy="42.5" r="1.6" fill="#fff" />
          </>
        )}
        {e.type === "smile" && (
          <>
            <path d="M28 46 q6 -8 12 0" stroke="#2b3350" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            <path d="M60 46 q6 -8 12 0" stroke="#2b3350" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          </>
        )}
        {e.type === "think" && (
          <>
            <circle cx="34" cy="42" r="4.5" fill="#2b3350" />
            <path d="M60 44 q6 -6 12 0" stroke="#2b3350" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          </>
        )}
        {e.type === "wink" && (
          <>
            <path d="M28 44 h12" stroke="#2b3350" strokeWidth="3.5" strokeLinecap="round" />
            <circle cx="66" cy="44" r="5" fill="#2b3350" />
            <circle cx="67.5" cy="42.5" r="1.6" fill="#fff" />
          </>
        )}
        {e.type === "star" && (
          <>
            <path d="M34 38 l2 4 4 0.6 -3 3 0.8 4.4 -3.8 -2 -3.8 2 0.8 -4.4 -3 -3 4 -0.6 z" fill="#ffb020" />
            <path d="M66 38 l2 4 4 0.6 -3 3 0.8 4.4 -3.8 -2 -3.8 2 0.8 -4.4 -3 -3 4 -0.6 z" fill="#ffb020" />
          </>
        )}
      </g>

      {/* 眼镜（换装） */}
      {wear.includes("glasses") && (
        <>
          <circle cx="34" cy="44" r="8.5" fill="none" stroke="#2b3350" strokeWidth="2.5" />
          <circle cx="66" cy="44" r="8.5" fill="none" stroke="#2b3350" strokeWidth="2.5" />
          <line x1="42.5" y1="44" x2="57.5" y2="44" stroke="#2b3350" strokeWidth="2.5" />
        </>
      )}

      {/* 嘴巴 */}
      {emotion === "think" ? (
        <path d="M42 62 q8 -3 16 0" stroke="#2b3350" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      ) : emotion === "celebrate" ? (
        <path d="M40 58 q10 12 20 0 z" fill="#2b3350" />
      ) : (
        <path d="M40 60 q10 9 20 0" stroke="#2b3350" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      )}

      {/* 庆祝时的派对帽 */}
      {emotion === "celebrate" && (
        <g transform="rotate(-18 78 18)">
          <path d="M70 20 L86 20 L78 2 z" fill="#a855f7" />
          <circle cx="78" cy="2" r="3.5" fill="#ffb020" />
        </g>
      )}
    </svg>
  );
}
