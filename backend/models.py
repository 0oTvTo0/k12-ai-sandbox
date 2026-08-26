"""
Pydantic 数据模型：定义前后端之间的"契约"。
结构化字段（错误行号、错误类型、执行耗时）让前端能把红波浪线画到正确的行。
"""
from typing import Optional
from pydantic import BaseModel, Field
import config


# ---------- 代码执行 ----------
class CodeRequest(BaseModel):
    code: str = Field(..., max_length=config.MAX_CODE_CHARS, description="学生代码")
    lang: str = Field(default="python")
    stdin: str = Field(default="", description="可选：程序的标准输入，供 input() 使用")
    mode: str = Field(default="run", description="run=普通运行 | trace=单步追踪调试")


class TraceEvent(BaseModel):
    """单步追踪的一步：执行到某一行时，局部变量的快照。"""
    line: int
    event: str                      # line / call / return / exception
    locals_snapshot: dict[str, str] = {}   # 变量名 -> repr 字符串（已截断）


class ExecResult(BaseModel):
    """结构化执行结果：前端据此渲染输出、错误标记、追踪视图。"""
    status: str                     # success / error / timeout / blocked
    stdout: str = ""
    stderr: str = ""
    error_type: Optional[str] = None   # 例如 ZeroDivisionError
    error_line: Optional[int] = None   # 出错行号（用于 Monaco 红波浪）
    duration_ms: int = 0
    trace: list[TraceEvent] = []       # 仅 trace 模式
    blocked_reasons: list[str] = []    # 仅 status=blocked 时，静态拦截原因


# ---------- AI 导师 ----------
class ChatMessage(BaseModel):
    role: str                       # "user" | "assistant" | "system"
    content: str


class AIHelpRequest(BaseModel):
    """学生主动求助 / 报错自动分析 / 对话追问。"""
    code: str = Field(default="", max_length=config.MAX_CODE_CHARS)
    question: str = Field(default="", max_length=2000)
    output: str = Field(default="", max_length=config.MAX_OUTPUT_CHARS)  # 运行输出/报错
    history: list[ChatMessage] = []     # 对话历史，支持多轮追问
    kind: str = Field(default="help")   # help=求助 | error=报错分析 | chat=闲聊追问 | improve=优化建议


class AIHelpResponse(BaseModel):
    reply: str
    emotion: str = "happy"          # AI 老师的表情：happy / think / encourage / celebrate
    error_line: Optional[int] = None    # AI 推断出的问题行（尽力而为）


# ---------- 挑战 / 游戏化 ----------
class Challenge(BaseModel):
    id: str
    title: str
    difficulty: str                 # ⭐ / ⭐⭐ / ⭐⭐⭐
    description: str
    starter_code: str = ""
    hint: str = ""