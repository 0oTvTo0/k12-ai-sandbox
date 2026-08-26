"""
全局配置：集中管理所有可调参数，方便后续扩展与对接其他模块。
任何"魔法数字"都应该出现在这里，而不是散落在业务代码里。
"""
import os

from dotenv import load_dotenv

load_dotenv()  # 加载项目根目录 .env（若存在），密钥等敏感信息不要写进代码

# ---------- Redis ----------
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
JOB_QUEUE = "job_queue"                 # 待执行任务队列
STATUS_KEY = "status:{job_id}"          # 任务状态
RESULT_KEY = "result:{job_id}"          # 任务结果（JSON）
JOB_TTL_SECONDS = 3600                  # 状态/结果在 Redis 里的存活时间，避免无限堆积

# ---------- 执行限制（安全核心） ----------
EXEC_TIMEOUT_SECONDS = 8                # 单次运行超时（死循环熔断）
TRACE_TIMEOUT_SECONDS = 8               # 调试追踪模式超时
MAX_MEMORY_MB = 256                     # 子进程内存上限，超出即熔断
MAX_OUTPUT_CHARS = 8000                 # 输出截断，防止 print 炸弹撑爆内存/网络
MAX_CODE_CHARS = 20000                  # 单次提交代码长度上限
MAX_TRACE_EVENTS = 300                  # 调试模式最多记录的步数，防止追踪爆炸
RECURSION_LIMIT = 200                   # 递归深度上限，防栈溢出
MONITOR_INTERVAL_SECONDS = 0.05         # psutil 资源采样间隔

# ---------- DeepSeek AI 导师 ----------
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")  # 从 .env / 环境变量读取，参考 .env.example
DEEPSEEK_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
AI_TIMEOUT_SECONDS = 60                 # AI 请求超时
AI_MAX_TOKENS = 1200                    # 单次回复长度上限

# ---------- CORS ----------
FRONTEND_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]