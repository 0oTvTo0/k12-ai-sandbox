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
import ProfileGate from "./components/ProfileGate";
import { getEncouragement } from "./lib/api";
import {
  migrateLegacy, getProfiles, getActiveProfile,
  saveTheme, loadTheme, saveFontSize, loadFontSize,
  saveDraft, loadDraft, getStats, recordRun, getUnlockedBadges,
  addHistory,
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

export default function App() {
  // ---- 学生档案（多用户隔离，FR-03） ----
  const [activeProfile, setActiveProfile] = useState(() => getActiveProfile());
  const [gate, setGate] = useState(() => {
    const hasActive = !!getActiveProfile();
    return {
      open: !hasActive,
      mode: getProfiles().length ? "switch" : "welcome",
    };
  });

  useEffect(() => {
    migrateLegacy(); // 幂等：清理 v2.0 旧数据（用户已确认清零）
  }, []);

  const handleProfileDone = useCallback((profile, isNew) => {
    setActiveProfile(profile);
    setTheme(loadTheme());        // 每个档案独立主题
    setFontSize(loadFontSize());  // 每个档案独立字号
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
  }, []);

  // 运行 / 追踪
  const handleRun = useCallback(async (mode = "run") => {
    if (running) return;
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

      // 轮询直到得到结构化结果
      let res;
      for (let i = 0; i < POLL_MAX; i++) {
        if (state.cancelled) break;
        const { data: d } = await axios.get(`${BACKEND}/result/${state.jobId}`);
        if (d.status === "done") { res = d.result; break; }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL));
      }
      if (!res) {
        // 被取消或超时
        res = state.cancelled
          ? { status: "cancelled", stdout: "", stderr: "⏹ 已停止。" }
          : { status: "timeout", stdout: "", stderr: "⏰ 等待结果超时。" };
      }

      setResult(res);
      if (res.error_line) setErrorLine(res.error_line);
      const usedTrace = mode === "trace";
      const newBadges = recordRun(res.status, { usedTrace });
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
  }, [running]);

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

  useEffect(() => { saveDraft(code); }, [code]);

  // ---- AI 导师 ----
  const [aiOpen, setAiOpen] = useState(false);
  const handleAskAI = useCallback(() => setAiOpen(true), []);
  const handleAIErrorLine = useCallback((line) => {
    if (line != null) setErrorLine(line);
  }, []);

  // ---- 侧边栏 ----
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  // ---- 成就 ----
  const [showAchievements, setShowAchievements] = useState(false);
  const [newBadges, setNewBadges] = useState([]);
  const handleOpenAchievements = useCallback(() => setShowAchievements(true), []);
  const handleUnlockBadges = useCallback((badges) => {
    setNewBadges((b) => [...b, ...badges]);
  }, []);

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

  // key=档案id：切换档案时整个工作区重挂载，重新读取该档案的草稿/历史/主题
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
        />

        {/* 编辑区 */}
        <div className="flex-1 flex flex-col min-w-0 glass overflow-hidden">
          <Toolbar
            onRun={() => handleRun("run")}
            onTrace={() => handleRun("trace")}
            onStop={handleStop}
            onSave={() => addHistory(codeRef.current, "saved")}
            onAskAI={handleAskAI}
            running={running}
            fontSize={fontSize}
            onFontChange={(d) => setFontSize((s) => Math.max(10, Math.min(26, s + d)))}
            canStop={running}
            stdin={stdinData}
            onStdinChange={setStdinData}
          />

          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-[3] min-h-0">
              <CodeEditor
                code={code}
                onChange={setCode}
                dark={dark}
                fontSize={fontSize}
                errorLine={errorLine}
              />
            </div>
            <div className="flex-[2] min-h-0 border-t border-(--hairline)">
              <ConsolePanel result={result} running={running} />
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
              />
            </div>
          </div>
        )}
      </div>

      <Achievements
        open={showAchievements}
        onClose={() => setShowAchievements(false)}
        newlyUnlocked={newBadges}
      />
      <Celebration
        show={showCelebration}
        message={celebrationMsg}
        onDone={() => setShowCelebration(false)}
      />
    </div>
  );
}
