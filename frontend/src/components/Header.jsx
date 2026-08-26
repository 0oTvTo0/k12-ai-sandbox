// 顶部栏：Logo、标题、学习连胜、主题切换、成就入口
import Mascot from "./Mascot";

export default function Header({ theme, onToggleTheme, streak, badgeCount, onOpenAchievements, mascotEmotion }) {
  return (
    <header className="flex items-center gap-3 px-4 py-2.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur border-b border-indigo-100 dark:border-slate-700 shadow-sm">
      {/* Logo + 标题 */}
      <div className="flex items-center gap-2.5">
        <div className="animate-float">
          <Mascot emotion={mascotEmotion} size={42} />
        </div>
        <div>
          <h1 className="text-xl font-extrabold bg-gradient-to-r from-brand-500 via-grape to-berry bg-clip-text text-transparent leading-tight">
            小码星球
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 -mt-0.5">K12 AI 编程乐园</p>
        </div>
      </div>

      <div className="flex-1" />

      {/* 连胜火焰 */}
      {streak > 0 && (
        <div
          className="flex items-center gap-1 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-300 text-sm font-bold animate-pop-in"
          title={`已连续 ${streak} 次运行成功`}
        >
          <span className="text-base">🔥</span> {streak} 连胜
        </div>
      )}

      {/* 成就徽章 */}
      <button
        onClick={onOpenAchievements}
        className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-sm hover:scale-105 active:scale-95 transition-transform"
        title="我的成就徽章"
      >
        <span className="text-base">🏅</span>
        <span className="hidden sm:inline">成就</span>
        {badgeCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-berry text-white text-[11px] font-bold flex items-center justify-center">
            {badgeCount}
          </span>
        )}
      </button>

      {/* 主题切换 */}
      <button
        onClick={onToggleTheme}
        className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-slate-700 flex items-center justify-center text-lg hover:scale-110 active:scale-95 transition-transform"
        title={theme === "light" ? "切换到暗色模式" : "切换到亮色模式"}
      >
        {theme === "light" ? "🌙" : "☀️"}
      </button>
    </header>
  );
}
