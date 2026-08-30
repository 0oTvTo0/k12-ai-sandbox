// 本地存储：学生档案 + 按档案隔离的历史/成就/统计/草稿/偏好/AI 对话/挑战进度
// 全部存在浏览器 localStorage。每次新建档案 = "新客户第一次使用"的干净状态。
// 后续可平滑迁移到后端账号体系（key 结构已按 profileId 分层）。

const K = {
  PROFILES: "k12_profiles",
  ACTIVE: "k12_active_profile",
};

// v2.0 时代的旧 key（无档案概念）——首次启动时全部清除（用户已确认清零重来）
const LEGACY_KEYS = [
  "k12_history", "k12_stats", "k12_badges", "k12_draft",
  "k12_theme", "k12_font", "k12_done_challenges",
];

export function migrateLegacy() {
  try {
    LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
  } catch { /* 隐私模式下静默失败 */ }
}

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
  } catch { /* 存储满了就静默失败，不影响主流程 */ }
}

// ==================== 学生档案 ====================
export function getProfiles() {
  return read(K.PROFILES, []);
}

export function getActiveProfile() {
  const id = read(K.ACTIVE, null);
  if (!id) return null;
  return getProfiles().find((p) => p.id === id) || null;
}

export function createProfile(name, avatar) {
  const p = {
    id: "p_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    name: name.trim().slice(0, 12),
    avatar: avatar || "🐱",
    createdAt: Date.now(),
  };
  const profiles = getProfiles();
  profiles.push(p);
  write(K.PROFILES, profiles);
  write(K.ACTIVE, p.id);
  return p;
}

export function switchProfile(id) {
  if (getProfiles().some((p) => p.id === id)) write(K.ACTIVE, id);
}

export function updateProfile(id, patch) {
  const profiles = getProfiles().map((p) => (p.id === id ? { ...p, ...patch } : p));
  write(K.PROFILES, profiles);
}

/** 当前档案专属 key；无档案时回退到匿名前缀（不会发生，App 有 ProfileGate 兜底） */
const pk = (key) => `k12:${getActiveProfile()?.id || "anon"}:${key}`;

// ==================== 历史记录（每档案最近 30 条） ====================
export function getHistory() {
  return read(pk("history"), []);
}
export function addHistory(code, status) {
  const list = getHistory();
  list.unshift({ code, status, time: Date.now() });
  write(pk("history"), list.slice(0, 30));
}
export function clearHistory() {
  write(pk("history"), []);
}

// ==================== 草稿自动保存 ====================
export function saveDraft(code) {
  write(pk("draft"), code);
}
export function loadDraft() {
  return read(pk("draft"), null);
}

// ==================== 偏好（每档案独立主题/字号） ====================
export function saveTheme(t) { write(pk("settings"), { ...read(pk("settings"), {}), theme: t }); }
export function loadTheme() { return read(pk("settings"), {}).theme || "light"; }
export function saveFontSize(s) { write(pk("settings"), { ...read(pk("settings"), {}), fontSize: s }); }
export function loadFontSize() { return read(pk("settings"), {}).fontSize || 15; }

// ==================== AI 对话历史（每档案最多 30 条） ====================
export function getAIChat() {
  return read(pk("ai_chat"), []);
}
export function saveAIChat(history) {
  write(pk("ai_chat"), history.slice(-30));
}
export function clearAIChat() {
  write(pk("ai_chat"), []);
}

// ==================== 学习统计 ====================
export function getStats() {
  return read(pk("stats"), {
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
  write(pk("stats"), s);
  return unlockBadges(s);
}

export function recordAiAsk() {
  const s = getStats();
  s.aiAsks += 1;
  write(pk("stats"), s);
  return unlockBadges(s);
}

// ==================== 挑战完成 ====================
export function getDoneChallenges() {
  return read(pk("done_challenges"), []);
}
export function markChallengeDone(id) {
  const done = getDoneChallenges();
  if (!done.includes(id)) {
    done.push(id);
    write(pk("done_challenges"), done);
  }
  return unlockBadges(getStats());
}

// 挑战进度（每次提交结果，供关卡地图渲染）: { [challengeId]: "passed" | "failed" }
export function getChallengeProgress() {
  return read(pk("challenge_progress"), {});
}
export function saveChallengeProgress(progress) {
  write(pk("challenge_progress"), progress);
}

// ==================== 编辑器皮肤 / 吉祥物换装 / 称号（奖励体系，P2 启用） ====================
export function getSkins() {
  return read(pk("skins"), []);
}
export function unlockSkin(id) {
  const list = getSkins();
  if (!list.includes(id)) { list.push(id); write(pk("skins"), list); }
}
export function saveEquippedSkin(id) {
  write(pk("settings"), { ...read(pk("settings"), {}), skin: id });
}
export function getEquippedSkin() {
  return read(pk("settings"), {}).skin || null;
}

export function getMascotWear() {
  return read(pk("mascot"), []);
}
export function unlockMascotWear(id) {
  const list = getMascotWear();
  if (!list.includes(id)) { list.push(id); write(pk("mascot"), list); }
}
export function saveEquippedWear(ids) {
  write(pk("settings"), { ...read(pk("settings"), {}), wear: ids });
}
export function getEquippedWear() {
  return read(pk("settings"), {}).wear || [];
}

export function getTitles() {
  return read(pk("titles"), []);
}
export function unlockTitle(id) {
  const list = getTitles();
  if (!list.includes(id)) { list.push(id); write(pk("titles"), list); }
}

// ==================== 成就徽章定义 ====================
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
  return read(pk("badges"), []);
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
  if (newly.length) write(pk("badges"), unlocked);
  return newly;
}
