// 学生档案门：首启欢迎页 / 选择档案 / 新建档案
// mode: "welcome"（首次打开全屏欢迎）| "switch"（切换档案弹层）| "create"（直接建档弹层）
import { useState } from "react";
import Mascot from "./Mascot";
import { createProfile, switchProfile, getProfiles } from "../lib/storage";

const AVATARS = ["🐱", "🦊", "🐼", "🦄", "🐯", "🐨", "🤖", "🐧"];

export default function ProfileGate({ mode, onDone, onClose }) {
  // 步骤：hero(欢迎) → list(选择) → create(建档)
  const [step, setStep] = useState(
    mode === "welcome" ? "hero" : mode === "switch" ? "list" : "create"
  );
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);

  const submitCreate = () => {
    if (!name.trim()) return;
    const p = createProfile(name, avatar);
    onDone(p, true); // isNew=true → 预填 hello world
  };

  const pickProfile = (p) => {
    switchProfile(p.id);
    onDone(p, false);
  };

  // ---------- 全屏欢迎页 ----------
  if (step === "hero") {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-6 text-center px-6">
        <div className="animate-breathe">
          <Mascot emotion="celebrate" size={110} />
        </div>
        <div>
          <h1 className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-(--accent) via-(--accent-2) to-(--err) bg-clip-text text-transparent leading-tight animate-fade-up">
            小码星球
          </h1>
          <p className="text-sub text-base mt-2 animate-fade-up">
            K12 AI 编程乐园 · 写代码、打怪兽、当小小程序员！
          </p>
        </div>
        <button className="btn btn-primary text-lg px-8 py-3 animate-fade-up" onClick={() => setStep("create")}>
          🚀 开始编程
        </button>
      </div>
    );
  }

  // ---------- 选择档案 ----------
  if (step === "list") {
    const profiles = getProfiles();
    return (
      <Modal title="👋 你是谁呀？" onClose={onClose}>
        <div className="space-y-2">
          {profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => pickProfile(p)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl glass hover-tint animate-slide-up"
            >
              <span className="text-2xl">{p.avatar}</span>
              <span className="font-bold text-main">{p.name}</span>
              <span className="ml-auto text-xs text-faint">进入</span>
            </button>
          ))}
          <button
            onClick={() => setStep("create")}
            className="w-full px-4 py-3 rounded-2xl border border-dashed border-(--line) text-sub font-bold hover:text-accent hover:border-(--accent) transition-colors"
          >
            ➕ 新建档案
          </button>
        </div>
      </Modal>
    );
  }

  // ---------- 新建档案 ----------
  return (
    <Modal title="✨ 创建你的小码档案" onClose={mode === "welcome" ? undefined : onClose}>
      <div className="space-y-4">
        {/* 头像选择 */}
        <div>
          <p className="text-xs text-sub font-bold mb-2">选一个喜欢的头像</p>
          <div className="grid grid-cols-4 gap-2">
            {AVATARS.map((a) => (
              <button
                key={a}
                onClick={() => setAvatar(a)}
                className={`text-3xl py-2.5 rounded-2xl transition-all ${
                  avatar === a
                    ? "bg-(--accent)/15 ring-2 ring-(--accent) scale-105"
                    : "glass hover-tint"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
        {/* 昵称 */}
        <div>
          <p className="text-xs text-sub font-bold mb-2">给自己起个名字</p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitCreate()}
            maxLength={12}
            placeholder="比如：小小程序猿"
            autoFocus
            className="w-full px-4 py-2.5 rounded-xl glass text-main placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-(--accent)"
          />
        </div>
        <button
          onClick={submitCreate}
          disabled={!name.trim()}
          className="btn btn-primary w-full justify-center py-2.5"
        >
          🎉 出发！
        </button>
      </div>
    </Modal>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div
        className="glass-strong w-[400px] max-h-[85vh] overflow-y-auto p-6 animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-extrabold text-main">{title}</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="icon-btn text-sub"
              aria-label="关闭"
            >
              ✕
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
