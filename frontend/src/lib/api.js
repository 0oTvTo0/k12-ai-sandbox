// 后端 API 客户端：统一封装所有 HTTP 调用
import axios from "axios";

const BASE = "http://localhost:8000";

const http = axios.create({ baseURL: BASE, timeout: 15000 });

// ---- 代码执行 ----
export async function runCode({ code, stdin = "", mode = "run" }) {
  const { data } = await http.post("/run", { code, stdin, mode });
  const jobId = data.job_id;
  return pollResult(jobId);
}

// 轮询直到拿到结构化结果（与后端 pending/done 协议对齐）
async function pollResult(jobId, intervalMs = 400, maxTries = 120) {
  for (let i = 0; i < maxTries; i++) {
    const { data } = await http.get(`/result/${jobId}`);
    if (data.status === "done") return data.result; // ExecResult 对象
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("等待结果超时，请重试");
}

// ---- AI 导师 ----
export async function askAI({ code = "", question = "", output = "", history = [], kind = "help" }) {
  const { data } = await http.post(
    "/ai/help",
    { code, question, output, history, kind },
    { timeout: 70000 } // AI 推理较慢，单独放宽
  );
  return data; // { reply, emotion, error_line }
}

// ---- 游戏化内容 ----
export async function getExamples() {
  const { data } = await http.get("/examples");
  return data.examples;
}

export async function getChallenges() {
  const { data } = await http.get("/challenges");
  return data.challenges;
}

export async function getDailyChallenge() {
  const { data } = await http.get("/challenges/daily");
  return data;
}

export async function getEncouragement() {
  const { data } = await http.get("/encouragement");
  return data.message;
}
