// 顶部栏：Logo、连胜、成就入口、学生档案菜单、主题切换
import { useState } from "react";
import Mascot from "./Mascot";

export default function Header({
  theme, onToggleTheme, streak, badgeCount,
  onOpenAchievements, onOpenProfiles, onNewProfile, profile,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const mascotEmotion = streak > 0 ? "happy" : "idle";

  return (
    <header className="glass flex items-center gap-3 px-4 py-2.5 m-2.5 mb-0 relative z-20">
      {/* Logo + 标题 */}
      <div className="flex items-center gap-2.5">
        <div className="animate-float">
          <Mascot emotion={mascotEmotion} size={42} />
        </div>
        <div>
          <h1 className="text-xl font-extrabold bg-gradient-to-r from-(--accent) via-(--accent-2) to-(--err) bg-clip-text text-transparent leading-tight">
            小码星球
          </h1>
          <p className="text-[11px] text-sub -mt-0.5">K12 AI 编程乐园</p>
        </div>
      </div>

      <div className="flex-1" />

      {/* 连胜火焰 */}
      {streak > 0 && (
        <div
          className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold animate-pop-in"
          style={{ background: "color-mix(in srgb, var(--warn) 14%, transparent)", color: "var(--warn)" }}
          title={`已连续 ${streak} 次运行成功`}
        >
          <span className="text-base">🔥</span> {streak} 连胜
        </div>
      )}

      {/* 成就徽章 */}
      <button onClick={onOpenAchievements} className="icon-btn relative" title="我的成就徽章">
        <span className="text-base">🏅</span>
        {badgeCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 px-1 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
                style={{ background: "var(--err)" }}>
            {badgeCount}
          </span>
        )}
      </button>

      {/* 主题切换 */}
      <button
        onClick={onToggleTheme}
        className="icon-btn text-lg"
        title={theme === "light" ? "切换到暗夜模式" : "切换到晴空模式"}
      >
        {theme === "light" ? "🌙" : "☀️"}
      </button>

      {/* 学生档案菜单 */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full glass hover-tint"
          title="切换学生档案"
        >
          <span className="text-2xl leading-none">{profile?.avatar || "🐱"}</span>
          <span className="text-sm font-bold text-main max-w-20 truncate hidden sm:inline">
            {profile?.name || "同学"}
          </span>
          <span className="text-[10px] text-sub">▾</span>
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-full mt-2 w-52 glass-strong p-2 z-40 animate-pop-in">
              <button
                onClick={() => { setMenuOpen(false); onOpenProfiles(); }}
                className="w-full text-left px-3 py-2 rounded-xl text-sm font-bold text-main hover-tint"
              >
                🔄 切换档案
              </button>
              <button
                onClick={() => { setMenuOpen(false); onNewProfile(); }}
                className="w-full text-left px-3 py-2 rounded-xl text-sm font-bold text-main hover-tint"
              >
                ➕ 新建档案
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
