// 小码星球 · 主应用
import { useState, useEffect, useCallback, useRef } from "react";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import CodeEditor from "./components/CodeEditor";
import Toolbar from "./components/Toolbar";
import ConsolePanel from "./components/ConsolePanel";
import AITutor from "./components/AITutor";
import Achievements from "./components/Achievements";
import Celebration from "./components/Celebration";
import RewardOverlay from "./components/RewardOverlay";
import ProfileGate from "./components/ProfileGate";
import { getEncouragement, judgeChallenge } from "./lib/api";
import {
  migrateLegacy, getProfiles, getActiveProfile,
  saveTheme, loadTheme, saveFontSize, loadFontSize,
  saveDraft, loadDraft, getStats, recordRun, getUnlockedBadges,
  addHistory, markChallengeDone, getDoneChallenges,
  getChallengeProgress, saveChallengeProgress,
  unlockTitle, unlockSkin, unlockMascotWear,
  getEquippedSkin, saveEquippedSkin, getEquippedWear, saveEquippedWear,
  BADGE_DEFS,
} from "./lib/storage";
import axios from "axios";

const POLL_INTERVAL = 400;
const POLL_MAX = 120; // 48 秒
const BACKEND = "http://localhost:8000";

// 新档案首次打开的欢迎代码（FR-02）
const HELLO_WORLD = `# 🌟 欢迎来到小码星球！
# 点击上方 ▶ 运行，看看会发生什么

print("Hello, World!")
print("你好，小小程序员！")
`;

// 挑战系统元数据（与后端 gamification.py 对齐）
const TIER_IDS = (t) => [`c${t}-1`, `c${t}-2`, `c${t}-3`, `c${t}-4`];
const ALL_CHALLENGE_IDS = [1, 2, 3, 4, 5].flatMap(TIER_IDS);
const TIER_META = {
  1: { name: "新手村·史莱姆", monster: "👾", badge: "slime_hunter", badgeIcon: "🥚", title: "史莱姆猎手", skin: null, mascot: "cap", mascotName: "小帽子 🧢" },
  2: { name: "迷雾森林·哥布林", monster: "👺", badge: "goblin_slayer", badgeIcon: "👺", title: "哥布林克星", skin: null, mascot: "glasses", mascotName: "小眼镜 🕶️" },
  3: { name: "火焰山·喷火龙", monster: "🐲", badge: "dragon_tamer", badgeIcon: "🐲", title: "喷火征服者", skin: "glass-night", mascot: "cape", mascotName: "小披风 🧣" },
  4: { name: "天空之城·大魔王", monster: "😈", badge: "sky_king", badgeIcon: "😈", title: "天空霸主", skin: null, mascot: "crown", mascotName: "小皇冠 👑" },
  5: { name: "终焉之塔·远古龙", monster: "🐉", badge: "dragon_king", badgeIcon: "🐉", title: "龙之征服者", skin: "cyber-wings", mascot: "wings", mascotName: "小翅膀 🦋" },
};

export default function App() {
  // ---- 学生档案（多用户隔离，FR-03） ----
  const [activeProfile, setActiveProfile] = useState(() => getActiveProfile());
  const [gate, setGate] = useState(() => {
    const hasActive = !!getActiveProfile();
    return { open: !hasActive, mode: getProfiles().length ? "switch" : "welcome" };
  });

  useEffect(() => {
    migrateLegacy(); // 幂等：清理 v2.0 旧数据（用户已确认清零）
  }, []);

  const handleProfileDone = useCallback((profile) => {
    setActiveProfile(profile);
    setTheme(loadTheme());
    setFontSize(loadFontSize());
    setProgress(getChallengeProgress());
    setSkin(getEquippedSkin());
    setWear(getEquippedWear());
    setGate({ open: false, mode: "switch" });
  }, []);

  // ---- 主题 & 字体（每档案独立） ----
  const [theme, setTheme] = useState(() => loadTheme());
  const [fontSize, setFontSize] = useState(() => loadFontSize());

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    saveFontSize(fontSize);
  }, [fontSize]);

  // ---- stdin（声明在 handleRun 之前，否则闭包引用不到） ----
  const [stdinData, setStdinData] = useState("");

  // ---- 执行状态 ----
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const runningRef = useRef(null); // { jobId, cancelled }
  const stdinRef = useRef("");
  stdinRef.current = stdinData;

  const loadCode = useCallback((newCode) => {
    setCode(newCode);
    setResult(null);
    setErrorLine(null);
    setJudgeVerdict(null);
  }, []);

  // ---- 挑战模式（P2） ----
  const [challenge, setChallenge] = useState(null);
  const [judgeVerdict, setJudgeVerdict] = useState(null);
  const [progress, setProgress] = useState(() => getChallengeProgress());
  const [reward, setReward] = useState(null);

  const handleSelectChallenge = useCallback((ch) => {
    setChallenge(ch);
    setCode(ch.starter_code);
    setResult(null);
    setJudgeVerdict(null);
    setErrorLine(null);
  }, []);

  const handleExitChallenge = useCallback(() => {
    setChallenge(null);
    setJudgeVerdict(null);
    setResult(null);
    setErrorLine(null);
  }, []);

  // 运行 / 追踪（挑战模式下变为判题）
  const handleRun = useCallback(async (mode = "run") => {
    if (running) return;

    // ---- 挑战判题流程 ----
    if (challenge) {
      setRunning(true);
      setResult({ status: "running" });
      setJudgeVerdict(null);
      try {
        const v = await judgeChallenge(challenge.id, codeRef.current);
        setJudgeVerdict(v);
        addHistory(codeRef.current, v.passed ? "success" : "error");
        if (v.passed) {
          const newly = markChallengeDone(challenge.id);
          if (newly.length) setNewBadges((b) => [...b, ...newly]);
          const next = { ...progress, [challenge.id]: "passed" };
          saveChallengeProgress(next);
          setProgress(next);

          // 关卡通关奖励（本关 4 题全过 且 本关此前未完成）
          const meta = TIER_META[challenge.tier];
          const tierWasDone = TIER_IDS(challenge.tier).every((id) => progress[id] === "passed");
          const tierNowDone = TIER_IDS(challenge.tier).every((id) => next[id] === "passed");
          if (tierNowDone && !tierWasDone && meta) {
            const items = [{ icon: meta.badgeIcon, label: `徽章「${meta.title}」` }];
            unlockTitle(meta.title);
            items.push({ icon: "🏅", label: `称号「${meta.title}」` });
            if (meta.skin) {
              unlockSkin(meta.skin);
              items.push({ icon: "🎨", label: `编辑器皮肤「${meta.skin === "glass-night" ? "玻璃之夜" : "赛博之翼"}」` });
            }
            if (meta.mascot) {
              unlockMascotWear(meta.mascot);
              items.push({ icon: "🧸", label: `吉祥物${meta.mascotName}` });
            }
            const allDone = ALL_CHALLENGE_IDS.every((id) => next[id] === "passed");
            setReward({
              tier: challenge.tier,
              tierName: meta.name,
              monster: meta.monster,
              title: meta.title,
              badgeDef: BADGE_DEFS.find((b) => b.id === meta.badge) || null,
              items,
              allDone,
            });
          }
          setResult({ status: "success" });
          setCelebrationMsg("挑战通关！你太厉害了！🎉");
          setShowCelebration(true);
        } else {
          const next = { ...progress, [challenge.id]: "failed" };
          saveChallengeProgress(next);
          setProgress(next);
          setResult({ status: "error" });
        }
      } catch (err) {
        setResult({ status: "error", stderr: "判题服务连接失败：" + err.message });
      }
      setRunning(false);
      return;
    }

    // ---- 普通运行 / 追踪 ----
    setRunning(true);
    setResult({ status: "running" });
    setErrorLine(null);

    const state = { cancelled: false };
    runningRef.current = state;

    try {
      const { data } = await axios.post(`${BACKEND}/run`, {
        code: codeRef.current, stdin: stdinRef.current, mode,
      });
      state.jobId = data.job_id;

      let res;
      for (let i = 0; i < POLL_MAX; i++) {
        if (state.cancelled) break;
        const { data: d } = await axios.get(`${BACKEND}/result/${state.jobId}`);
        if (d.status === "done") { res = d.result; break; }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL));
      }
      if (!res) {
        res = state.cancelled
          ? { status: "cancelled", stdout: "", stderr: "⏹ 已停止。" }
          : { status: "timeout", stdout: "", stderr: "⏰ 等待结果超时。" };
      }

      setResult(res);
      if (res.error_line) setErrorLine(res.error_line);
      const usedTrace = mode === "trace";
      // 知错就改：上一次运行报错（或有 error 级批注），本次成功
      const hadErrorBefore =
        result?.status === "error" || result?.status === "timeout" ||
        annotations.some((a) => a.severity === "error");
      const newBadges = recordRun(res.status, { usedTrace, hadErrorBefore });
      if (newBadges.length) setNewBadges((b) => [...b, ...newBadges]);
      if (res.status === "success") {
        setCelebrationMsg(await getEncouragement());
        setShowCelebration(true);
      }
      addHistory(codeRef.current, res.status);
    } catch (err) {
      setResult({ status: "error", stderr: "连接后端失败：" + err.message });
    }
    setRunning(false);
    runningRef.current = null;
    }, [running, challenge, progress, result, annotations]);

  // 停止：发取消请求 + 本地标记，中止轮询
  const handleStop = useCallback(async () => {
    const state = runningRef.current;
    if (!state) return;
    state.cancelled = true;
    try {
      if (state.jobId) await axios.post(`${BACKEND}/cancel/${state.jobId}`);
    } catch { /* 网络错误也继续 */ }
  }, []);

  // ---- 代码编辑器 ----
  const [code, setCode] = useState(() => loadDraft() || HELLO_WORLD);
  const [errorLine, setErrorLine] = useState(null);
  const codeRef = useRef(code);
  codeRef.current = code;
  const editorRef = useRef(null);

  useEffect(() => { saveDraft(code); }, [code]);

  // ---- AI 导师 ----
  const [aiOpen, setAiOpen] = useState(false);
  const handleAskAI = useCallback(() => setAiOpen(true), []);
  const handleAIErrorLine = useCallback((line) => {
    if (line != null) setErrorLine(line);
  }, []);

  // ---- AI 批注联动（FR-07） ----
  const [annotations, setAnnotations] = useState([]);
  const [activeAnnotationId, setActiveAnnotationId] = useState(null);
  const [annotationFocus, setAnnotationFocus] = useState(null); // {line, n}

  const handleAnnotationsChange = useCallback((list) => {
    setAnnotations(list || []);
    setActiveAnnotationId(null);
  }, []);

  const handleFocusAnnotation = useCallback((id) => {
    setActiveAnnotationId(id);
    const ann = annotations.find((a) => a.id === id);
    if (ann) setAnnotationFocus({ line: ann.start_line, n: Date.now() });
  }, [annotations]);

  const handleAcceptAnnotation = useCallback((id) => {
    setAnnotations((list) => list.filter((a) => a.id !== id));
  }, []);

  const handleAcceptAll = useCallback(() => setAnnotations([]), []);

  // 点击编辑器行号区角标 → 高亮对应批注（双向联动）
  const handleGlyphClick = useCallback((line) => {
    const ann = annotations.find((a) => line >= a.start_line && line <= (a.end_line || a.start_line));
    if (ann) handleFocusAnnotation(ann.id);
  }, [annotations, handleFocusAnnotation]);

  // ---- 侧边栏 ----
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  // ---- 成就 ----
  const [showAchievements, setShowAchievements] = useState(false);
  const [newBadges, setNewBadges] = useState([]);
  const handleOpenAchievements = useCallback(() => setShowAchievements(true), []);
  const handleUnlockBadges = useCallback((badges) => {
    setNewBadges((b) => [...b, ...badges]);
  }, []);

  // ---- 皮肤 / 换装（奖励体系） ----
  const [skin, setSkin] = useState(() => getEquippedSkin());
  const [wear, setWear] = useState(() => getEquippedWear());

  // ---- 喝彩 ----
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationMsg, setCelebrationMsg] = useState("");

  // ---- 档案门未完成：只显示欢迎/建档 ----
  if (gate.open || !activeProfile) {
    return (
      <ProfileGate
        mode={gate.mode}
        onDone={handleProfileDone}
        onClose={() => setGate({ open: false, mode: "switch" })}
      />
    );
  }

  // ---- 衍生值 ----
  const dark = theme === "dark";
  const stats = getStats();
  const badgeCount = getUnlockedBadges().length;
  const mascotEmotion = running ? "think" : result?.status === "success" ? "happy" : "idle";

  return (
    <div key={activeProfile.id} className="h-screen flex flex-col">
      <Header
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
        streak={stats.streak}
        badgeCount={badgeCount}
        onOpenAchievements={handleOpenAchievements}
        onOpenProfiles={() => setGate({ open: true, mode: "switch" })}
        onNewProfile={() => setGate({ open: true, mode: "create" })}
        profile={activeProfile}
      />

      {/* 三栏 */}
      <div className="flex flex-1 min-h-0 px-2.5 pb-2.5 gap-2.5">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((c) => !c)}
          onLoadCode={loadCode}
          onSelectChallenge={handleSelectChallenge}
          activeChallengeId={challenge?.id}
          challengeMode={!!challenge}
          progress={progress}
        />

        {/* 编辑区 */}
        <div className="flex-1 flex flex-col min-w-0 glass overflow-hidden">
          <Toolbar
            onRun={() => handleRun("run")}
            onTrace={() => handleRun("trace")}
            onStop={handleStop}
            onSave={() => addHistory(codeRef.current, "saved")}
            onAskAI={handleAskAI}
            onInsertSnippet={(t) => editorRef.current?.insertSnippet(t)}
            onExitChallenge={challenge ? handleExitChallenge : undefined}
            running={running}
            fontSize={fontSize}
            onFontChange={(d) => setFontSize((s) => Math.max(10, Math.min(26, s + d)))}
            canStop={running}
            stdin={stdinData}
            onStdinChange={setStdinData}
            challengeLabel={challenge ? `第${challenge.tier}关 · ${challenge.title}` : null}
          />

          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-[3] min-h-0">
              <CodeEditor
                ref={editorRef}
                code={code}
                onChange={setCode}
                dark={dark}
                fontSize={fontSize}
                errorLine={errorLine}
                onRun={() => handleRun("run")}
                onTrace={() => handleRun("trace")}
                statusText={running ? "运行中…" : challenge ? "挑战模式" : "就绪"}
                skin={skin}
                annotations={annotations}
                activeAnnotationId={activeAnnotationId}
                annotationFocus={annotationFocus}
                onGlyphClick={handleGlyphClick}
              />
            </div>
            <div className="flex-[2] min-h-0 border-t border-(--hairline)">
              <ConsolePanel
                result={result}
                running={running}
                code={code}
                onLocateError={(line) => setErrorLine(line)}
                onAskAI={handleAskAI}
                challengeMode={!!challenge}
                judgeVerdict={judgeVerdict}
              />
            </div>
          </div>
        </div>

        {/* AI 导师 */}
        {aiOpen && (
          <div className="w-80 shrink-0 glass flex flex-col overflow-hidden animate-slide-up">
            <button
              onClick={() => setAiOpen(false)}
              className="self-end m-2 text-faint hover:text-main text-sm px-2"
            >
              关闭 ✕
            </button>
            <div className="flex-1 min-h-0">
              <AITutor
                code={code}
                output={result ? (result.stdout || result.stderr || "") : ""}
                errorLine={errorLine}
                onFocusLine={handleAIErrorLine}
                onUnlockBadges={handleUnlockBadges}
                annotations={annotations}
                onAnnotationsChange={handleAnnotationsChange}
                activeAnnotationId={activeAnnotationId}
                onFocusAnnotation={handleFocusAnnotation}
                onAcceptAnnotation={handleAcceptAnnotation}
                onAcceptAll={handleAcceptAll}
              />
            </div>
          </div>
        )}
      </div>

      <Achievements
        open={showAchievements}
        onClose={() => setShowAchievements(false)}
        newlyUnlocked={newBadges}
        skin={skin}
        onEquipSkin={(id) => { saveEquippedSkin(id); setSkin(id); }}
        wear={wear}
        onEquipWear={(ids) => { saveEquippedWear(ids); setWear(ids); }}
      />
      <Celebration
        show={showCelebration}
        message={celebrationMsg}
        onDone={() => setShowCelebration(false)}
      />
      <RewardOverlay reward={reward} onDone={() => setReward(null)} />
    </div>
  );
}
