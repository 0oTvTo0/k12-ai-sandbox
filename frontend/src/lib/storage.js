// 本地存储：历史记录、成就徽章、学习统计、偏好设置
// 全部存在浏览器 localStorage，无需登录即可累积成就；后续可平滑迁移到后端账号体系。

const K = {
  HISTORY: "k12_history",
  STATS: "k12_stats",
  BADGES: "k12_badges",
  DRAFT: "k12_draft",
  THEME: "k12_theme",
  FONT: "k12_font",
  DONE_CHALLENGES: "k12_done_challenges",
};

function read(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}
function write(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    /* 存储满了就静默失败，不影响主流程 */
  }
}

// ---------- 历史记录（最近 30 条） ----------
export function getHistory() {
  return read(K.HISTORY, []);
}
export function addHistory(code, status) {
  const list = getHistory();
  list.unshift({ code, status, time: Date.now() });
  write(K.HISTORY, list.slice(0, 30));
}
export function clearHistory() {
  write(K.HISTORY, []);
}

// ---------- 草稿自动保存 ----------
export function saveDraft(code) {
  write(K.DRAFT, code);
}
export function loadDraft() {
  return read(K.DRAFT, null);
}

// ---------- 偏好 ----------
export function saveTheme(t) { write(K.THEME, t); }
export function loadTheme() { return read(K.THEME, "light"); }
export function saveFontSize(s) { write(K.FONT, s); }
export function loadFontSize() { return read(K.FONT, 15); }

// ---------- 学习统计 ----------
export function getStats() {
  return read(K.STATS, {
    runs: 0, success: 0, streak: 0, bestStreak: 0,
    errorsFixed: 0, traceUsed: 0, aiAsks: 0,
  });
}

// 记录一次运行结果，返回"本次新解锁的徽章"列表（用于弹窗庆祝）
export function recordRun(status, { hadErrorBefore = false, usedTrace = false } = {}) {
  const s = getStats();
  s.runs += 1;
  if (usedTrace) s.traceUsed += 1;
  if (status === "success") {
    if (hadErrorBefore) s.errorsFixed += 1;
    s.success += 1;
    s.streak += 1;
    s.bestStreak = Math.max(s.bestStreak, s.streak);
  } else if (status === "error") {
    s.streak = 0;
  }
  write(K.STATS, s);
  return unlockBadges(s);
}

export function recordAiAsk() {
  const s = getStats();
  s.aiAsks += 1;
  write(K.STATS, s);
  return unlockBadges(s);
}

// ---------- 挑战完成 ----------
export function getDoneChallenges() {
  return read(K.DONE_CHALLENGES, []);
}
export function markChallengeDone(id) {
  const done = getDoneChallenges();
  if (!done.includes(id)) {
    done.push(id);
    write(K.DONE_CHALLENGES, done);
  }
  const s = getStats();
  return unlockBadges(s);
}

// ---------- 成就徽章定义 ----------
export const BADGE_DEFS = [
  { id: "first_run", icon: "🌱", name: "第一步", desc: "运行了第一段代码", test: (s) => s.runs >= 1 },
  { id: "first_ok", icon: "✨", name: "初次成功", desc: "第一次让代码跑通", test: (s) => s.success >= 1 },
  { id: "streak3", icon: "🔥", name: "三连胜利", desc: "连续 3 次运行成功", test: (s) => s.bestStreak >= 3 },
  { id: "streak5", icon: "🏆", name: "五连胜", desc: "连续 5 次运行成功", test: (s) => s.bestStreak >= 5 },
  { id: "bug_hunter", icon: "🐛", name: "捉虫小能手", desc: "成功修复 5 个错误", test: (s) => s.errorsFixed >= 5 },
  { id: "detective", icon: "🔍", name: "调试侦探", desc: "使用 1 次单步追踪", test: (s) => s.traceUsed >= 1 },
  { id: "curious", icon: "🤖", name: "好问宝宝", desc: "向 AI 老师提问 3 次", test: (s) => s.aiAsks >= 3 },
  { id: "hardwork", icon: "📚", name: "勤奋练习", desc: "累计运行 20 次", test: (s) => s.runs >= 20 },
  { id: "challenger", icon: "🎯", name: "挑战达人", desc: "完成 3 个挑战", test: (s) => getDoneChallenges().length >= 3 },
];

export function getUnlockedBadges() {
  return read(K.BADGES, []);
}

// 检查并解锁新徽章，返回本次"新解锁"的徽章定义数组
function unlockBadges(stats) {
  const unlocked = getUnlockedBadges();
  const newly = [];
  for (const def of BADGE_DEFS) {
    if (!unlocked.includes(def.id) && def.test(stats)) {
      unlocked.push(def.id);
      newly.push(def);
    }
  }
  if (newly.length) write(K.BADGES, unlocked);
  return newly;
}
