"""
K12 AI 编程沙盒 · 后端主应用

路由分组清晰，便于后续对接其他模块（用户系统 / 课程体系 / 学习记录）：
  /run /status /result     —— 代码执行（Redis 队列 + 加固 worker）
  /ai/help                 —— AI 编程导师（DeepSeek）
  /examples /challenges    —— 示例库 / 挑战卡片 / 每日一题 / 鼓励语
  /health                  —— 健康检查
"""
import uuid
import json

import redis
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import config
import gamification
from ai_tutor import ask_ai
from models import CodeRequest, ExecResult, AIHelpRequest, AIHelpResponse

# ---------- Redis ----------
r = redis.Redis(
    host=config.REDIS_HOST,
    port=config.REDIS_PORT,
    decode_responses=True,
    protocol=2,
    socket_timeout=5,
    socket_connect_timeout=5,
)

app = FastAPI(title="K12 AI 编程沙盒 API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== 代码执行 ====================

@app.post("/run")
def run_code(payload: CodeRequest):
    """提交代码：入队并标记 pending，返回 job_id 供前端轮询。"""
    job_id = str(uuid.uuid4())
    job = {
        "id": job_id,
        "code": payload.code,
        "lang": payload.lang,
        "stdin": payload.stdin,
        "mode": payload.mode,
    }
    r.lpush(config.JOB_QUEUE, json.dumps(job))
    r.set(config.STATUS_KEY.format(job_id=job_id), "pending", ex=config.JOB_TTL_SECONDS)
    return {"job_id": job_id}


@app.get("/status/{job_id}")
def get_status(job_id: str):
    status = r.get(config.STATUS_KEY.format(job_id=job_id))
    return {"status": status or "unknown"}


@app.get("/result/{job_id}")
def get_result(job_id: str):
    """返回结构化结果（ExecResult JSON），前端据此渲染输出/错误标记/追踪。"""
    status = r.get(config.STATUS_KEY.format(job_id=job_id))
    if not status:
        return {"status": "unknown", "result": None}
    if status == "pending":
        return {"status": "pending", "result": None}

    raw = r.get(config.RESULT_KEY.format(job_id=job_id))
    if raw is None:
        return {"status": "pending", "result": None}
    # result 已是 ExecResult 的 JSON，直接透传
    return {"status": "done", "result": json.loads(raw)}


# ==================== AI 编程导师 ====================

@app.post("/ai/help", response_model=AIHelpResponse)
async def ai_help(req: AIHelpRequest):
    """统一 AI 入口：求助 / 报错分析 / 对话追问 / 优化建议（由 req.kind 区分）。"""
    data = await ask_ai(req)
    return AIHelpResponse(**data)


# ==================== 游戏化内容 ====================

@app.get("/examples")
def get_examples():
    return {"examples": gamification.get_examples()}


@app.get("/challenges")
def get_challenges():
    return {"challenges": [gamification.public_challenge(c) for c in gamification.get_challenges()]}


@app.get("/challenges/tiers")
def get_tiers():
    return {"tiers": gamification.get_tiers()}


@app.get("/challenges/daily")
def get_daily():
    return gamification.public_challenge(gamification.get_daily_challenge())


@app.get("/challenges/{challenge_id}")
def get_challenge(challenge_id: str):
    ch = gamification.get_challenge_by_id(challenge_id)
    if not ch:
        raise HTTPException(status_code=404, detail="挑战不存在")
    return gamification.public_challenge(ch)


@app.post("/challenges/{challenge_id}/judge")
def judge_challenge(challenge_id: str, payload: CodeRequest):
    """提交判题：复用 Redis 队列，worker 按题目规则逐组跑沙箱。"""
    ch = gamification.get_challenge_by_id(challenge_id)
    if not ch:
        raise HTTPException(status_code=404, detail="挑战不存在")
    job_id = str(uuid.uuid4())
    job = {
        "id": job_id,
        "code": payload.code,
        "kind": "judge",
        "challenge_id": challenge_id,
    }
    r.lpush(config.JOB_QUEUE, json.dumps(job))
    r.set(config.STATUS_KEY.format(job_id=job_id), "pending", ex=config.JOB_TTL_SECONDS)
    return {"job_id": job_id}


@app.get("/encouragement")
def get_encouragement():
    return {"message": gamification.random_encouragement()}


# ==================== 任务取消 ====================

@app.post("/cancel/{job_id}")
def cancel_job(job_id: str):
    """通过 Redis pub/sub 通知 worker 实时 kill 正在执行的子进程。"""
    try:
        r.publish("job_cancel", job_id)
        return {"status": "ok", "message": f"已发送取消指令: {job_id}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


# ==================== 健康检查 ====================

@app.get("/health")
def health():
    try:
        r.ping()
        redis_ok = True
    except Exception:
        redis_ok = False
    return {"status": "ok", "redis": redis_ok, "version": "3.0.0"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
