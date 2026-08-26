"""
AI 编程导师：对接 DeepSeek（OpenAI 兼容接口）。

设计要点（对应任务"幽默、循循善诱、交互性强"）：
  * 人设：K12 编程老师"小码老师"，幽默、有耐心、用孩子听得懂的比喻。
  * 反常识教学法：苏格拉底式引导——给提示、抛问题，**故意不直接甩完整答案**，
    倒逼学生动脑，学习留存率更高（可演示时再给台阶）。
  * 结构化返回：要求模型输出 JSON（reply + emotion + error_line），
    前端据此切换老师表情、并在编辑器上补错误标记。
  * 健壮性：模型若没按 JSON 返回，降级为纯文本，绝不让接口 500。
"""
import json
import re
import httpx
from typing import Optional

import config
from models import ChatMessage

# 系统提示词：人设 + 教学策略 + 输出契约
SYSTEM_PROMPT = """你叫"小码老师"，是一位教小学生和初中生学 Python 的编程老师。

【性格】
- 超级幽默、有耐心、充满热情，像一个会讲段子的大哥哥/大姐姐。
- 爱用生活里的比喻讲代码（比如：变量是贴了标签的盒子，循环是复读机，列表是一排小抽屉）。
- 学生取得一点进步就大力夸奖，学生出错时温柔鼓励，绝不批评。

【教学原则 - 非常重要】
- 不要直接给出完整的正确答案代码！先给提示、打个比方、或者反问一个引导性问题，让孩子自己想出来。
- 只有当学生明显卡壳、问了两三遍还不会时，才给出一小段示例，并讲清楚每一行是干嘛的。
- 讲解要短、要活泼，多用 emoji，一次别超过 150 字，别把孩子看晕了。
- 如果发现代码能优化或有好玩的拓展，可以主动提一句，激发好奇心。

【输出格式 - 严格遵守】
你必须只返回一个 JSON 对象，不要有任何多余文字，格式如下：
{"reply": "要说的话（中文，活泼，带emoji）", "emotion": "happy", "error_line": null}

- reply：你对学生说的话。
- emotion：只能是 "happy"(开心) / "think"(思考) / "encourage"(鼓励) / "celebrate"(庆祝) 之一。
- error_line：如果代码有错，填出错的行号（整数）；没有错误就填 null。
"""

# 不同求助类型的引导语（拼进 user message，帮模型对齐场景）
_KIND_HINTS = {
    "help": "学生主动向你求助，请看看他的代码，用引导的方式帮他。",
    "error": "学生的代码运行报错了，请先用幽默的方式安抚他，再引导他找到并修复错误。",
    "chat": "学生在和你聊天/追问，请接着上文耐心解答。",
    "improve": "学生的代码能跑通，请夸他，然后给一个有趣的优化建议或拓展小挑战。",
}


def _build_messages(req) -> list[dict]:
    """组装发给模型的消息列表：system + 场景提示 + 代码/报错 + 历史 + 本次问题。"""
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    hint = _KIND_HINTS.get(req.kind, _KIND_HINTS["help"])
    context_parts = [f"【场景】{hint}"]

    if req.code.strip():
        context_parts.append(f"【学生的代码】\n```python\n{req.code}\n```")
    if req.output.strip():
        context_parts.append(f"【运行结果 / 报错信息】\n{req.output}")

    # 把场景+代码+报错作为第一条 user 消息
    messages.append({"role": "user", "content": "\n\n".join(context_parts)})

    # 追加多轮对话历史（追问用），最多保留最近 8 条，防止 context 过长
    for m in req.history[-8:]:
        if m.role in ("user", "assistant"):
            messages.append({"role": m.role, "content": m.content})

    # 本次真正的问题
    if req.question.strip():
        messages.append({"role": "user", "content": req.question})
    elif req.kind == "error":
        messages.append({"role": "user", "content": "老师，我的代码报错了，快帮我看看～"})

    return messages


def _parse_ai_json(text: str) -> dict:
    """尽力把模型输出解析成 {reply, emotion, error_line}；失败则降级为纯文本。"""
    cleaned = text.strip()
    # 去掉可能的 markdown 代码围栏
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", cleaned, flags=re.MULTILINE).strip()

    # 尝试直接解析，或截取第一个 {...} 块
    candidate = cleaned
    if not cleaned.startswith("{"):
        m = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
        if m:
            candidate = m.group(0)

    try:
        data = json.loads(candidate)
        reply = str(data.get("reply", "")).strip() or text.strip()
        emotion = str(data.get("emotion", "happy")).strip()
        if emotion not in ("happy", "think", "encourage", "celebrate"):
            emotion = "happy"
        error_line = data.get("error_line")
        error_line = int(error_line) if isinstance(error_line, (int, float)) else None
        return {"reply": reply, "emotion": emotion, "error_line": error_line}
    except (json.JSONDecodeError, ValueError, TypeError):
        # 降级：整段当成回复，情绪默认 happy
        return {"reply": text.strip(), "emotion": "happy", "error_line": None}


async def ask_ai(req) -> dict:
    """调用 DeepSeek，返回 {reply, emotion, error_line}。网络/超时错误也优雅降级。"""
    if not config.DEEPSEEK_API_KEY:
        return {
            "reply": "老师还没有领到通往知识星球的钥匙（DEEPSEEK_API_KEY）🔑。"
                     "请在项目根目录的 .env 里配置好密钥再召唤我哦～",
            "emotion": "think",
            "error_line": None,
        }
    messages = _build_messages(req)
    headers = {
        "Authorization": f"Bearer {config.DEEPSEEK_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": config.DEEPSEEK_MODEL,
        "messages": messages,
        "max_tokens": config.AI_MAX_TOKENS,
        "temperature": 0.7,
        "stream": False,
    }
    url = f"{config.DEEPSEEK_BASE_URL.rstrip('/')}/chat/completions"

    try:
        async with httpx.AsyncClient(timeout=config.AI_TIMEOUT_SECONDS) as client:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            text = data["choices"][0]["message"]["content"]
            return _parse_ai_json(text)
    except httpx.TimeoutException:
        return {
            "reply": "哎呀，老师这会儿网络有点卡，像乌龟爬山一样慢 🐢。稍等一下再问我一次好不好？",
            "emotion": "think",
            "error_line": None,
        }
    except httpx.HTTPStatusError as e:
        return {
            "reply": f"唔，老师的大脑服务器打了个喷嚏（{e.response.status_code}）🤧。请过一会儿再试试～",
            "emotion": "think",
            "error_line": None,
        }
    except Exception as e:  # 兜底：任何意外都不能让接口崩
        return {
            "reply": "老师刚刚被一道难题绊了一下脚 😵，没接到你的问题。再问一次吧！",
            "emotion": "think",
            "error_line": None,
        }
