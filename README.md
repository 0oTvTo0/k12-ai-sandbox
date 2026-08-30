# 🚀 小码星球 · K12 AI 编程乐园

> 面向中小学生的**安全在线 Python 编程学习环境** —— 「教学助手对话智能体」的编程环境模块。
> 学生在线编写、运行、调试 Python 代码，AI 老师实时辅导，游戏化激励贯穿全程。

[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.116+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![DeepSeek](https://img.shields.io/badge/AI-DeepSeek-4D6BFE)](https://api.deepseek.com)

---

## ✨ 功能特性

| 模块 | 功能 |
|---|---|
| 🎨 双主题视觉 | 日间「玻璃晴空」苹果毛玻璃风 / 暗夜「赛博霓虹」未来主义（星空粒子、霓虹网格） |
| 📝 代码编辑 | Monaco 编辑器：语法高亮、括号自动闭合/配色、缩进参考线、代码折叠、中文代码片段、Ctrl+Enter 运行、状态栏 |
| ▶️ 运行 / 🔍 追踪 / ⏹ 停止 | 普通执行、单步变量追踪、实时取消（Redis pub/sub） |
| 💥 编译器式结果面板 | 四态状态机：错误红黑墙（错误类型大字 + 儿童友好解释 + 定位 + 问老师 + Traceback）/ 成功输出页 / 追踪 Tab |
| 👩‍🏫 AI 编程导师 | DeepSeek v4 Flash「小码老师」：幽默引导、多轮追问、报错自动分析 |
| 📝 AI 代码批注 | 老师在代码上圈画批注（WPS 审阅式）：行号罩色 + 编号批注栏 + 双向联动 + 「知错就改」徽章 |
| ⚔️ 打怪通关挑战 | 5 关 × 4 题 = 20 题梯度题库 + 自动判题（多组测试用例）+ 锁关解锁 |
| 🎖️ 奖励体系 | 15 枚徽章 + 称号 + 编辑器皮肤（玻璃之夜/赛博之翼）+ 吉祥物换装（帽/镜/披风/冠/翅） |
| 👤 学生档案 | 多档案隔离（历史/成就/挑战进度/AI 对话/皮肤各自独立），首启建档 + hello world 欢迎 |
| ⌨️ stdin 输入 | 为 `input()` 提供标准输入 |
| 💾 历史记录 | 每档案最近 30 条代码自动保存 + 草稿防丢失 |

## 🏗️ 系统架构

```
学生浏览器 (React 19 + Monaco + Tailwind v4)
    │
    ├─ POST /run ──────────► FastAPI ──lpush──► Redis 队列 ──brpop──► Worker
    ├─ GET  /status/:id ───► FastAPI ──get───► Redis 状态（pending/done）
    ├─ GET  /result/:id ───► FastAPI ──get───► Redis 结构化结果（ExecResult）
    ├─ POST /cancel/:id ───► FastAPI ──pub───► Redis job_cancel ──sub──► Worker 杀进程
    ├─ POST /ai/help ──────► FastAPI ────────► DeepSeek API（AI 导师）
    ├─ GET  /examples ─────► FastAPI（静态示例库）
    └─ GET  /challenges ───► FastAPI（挑战卡片）

Worker ──Popen──► python -I -X utf8 sandbox_runner.py（隔离子进程，临时目录）
                       │
                       ├─ 0. AST 静态分析（运行前拦截）
                       ├─ 1. 运行时 import 钩子 / 受限 builtins
                       ├─ 2. -I 隔离模式 + 白名单环境变量
                       └─ 3. psutil 监控线程（256MB / 8s 熔断）
```

## 🛡️ 安全设计（4 层纵深防御，Windows 无需 Docker）

| 层 | 机制 | 作用 |
|---|---|---|
| 0 | **AST 静态分析**（[security.py](backend/security.py)） | 运行前拦截危险 import / 调用 / dunder |
| 1 | **运行时 import 钩子 + 每学生独立 builtins**（[sandbox_runner.py](backend/sandbox_runner.py)） | 兜底混淆绕过，互不污染 |
| 2 | **隔离子进程 `python -I -X utf8`**（[worker.py](backend/worker.py)） | 白名单环境变量、独立临时目录、无站点包 |
| 3 | **psutil 资源熔断** | 内存超 256MB / 执行超 8s 自动 kill 进程树 |

**禁用的模块**：`os`、`sys`、`subprocess`、`socket`、`ctypes`、`pickle` 等
**禁用的内置**：`open`、`eval`、`exec`、`compile`、`getattr` 等

## 📁 目录结构

```
k12_ai_sandbox/
├── README.md                # 本文档
├── start.bat                # Windows 一键启动（含自动打开浏览器）
├── requirements.txt         # 后端依赖（Python）
├── .env.example             # 环境变量模板（复制为 .env 填入密钥）
├── backend/                 # FastAPI + Worker + 加固沙箱
│   ├── main.py              #   FastAPI 主应用（/run /ai/help /challenges/judge ...）
│   ├── worker.py            #   Redis 队列消费者 + 执行器 + 判题器 + 取消监听
│   ├── sandbox_runner.py    #   子进程内安全运行器（import 钩子 / 受限 builtins / trace）
│   ├── security.py          #   AST 静态安全分析
│   ├── ai_tutor.py          #   DeepSeek AI 导师（人设 / 行号批注 / JSON 契约）
│   ├── gamification.py      #   20 道挑战题 + 关卡元数据 + 鼓励语
│   ├── config.py            #   全局配置（所有魔法数字集中在此）
│   └── models.py            #   Pydantic 前后端数据契约
├── frontend/                # React 19 + Vite + Tailwind v4
│   └── src/
│       ├── App.jsx          #   主应用（档案门 + 运行状态机 + 挑战模式 + 批注状态）
│       ├── index.css        #   双主题令牌（玻璃晴空/赛博霓虹）+ 动效
│       ├── lib/api.js       #   API 客户端（含判题轮询）
│       ├── lib/storage.js   #   localStorage（档案隔离：历史/成就/进度/皮肤/对话）
│       └── components/      #   Header / Sidebar(关卡地图) / CodeEditor / Toolbar /
│                            #   ConsolePanel(四态) / AITutor / AnnotationPanel /
│                            #   Mascot / Achievements(试衣间) / RewardOverlay /
│                            #   ParticleCanvas / ProfileGate / Celebration
├── tests/
│   ├── test_sandbox.py      # 沙箱单元自测 16 项（无需启动服务）
│   └── test_api.py          # API 集成自测 15 项（执行/判题/AI 契约）
└── docs/
    ├── PRD.md               # v3.0 产品需求文档（实施蓝图）
    ├── requirements.md      # 原始优化需求文档（含密钥处已打码）
    └── development-notes.md # 开发提示词（设计决策记录）
```

## 🚀 快速开始

### 前置条件

| 依赖 | 版本 | 说明 |
|---|---|---|
| Python | 3.12+ | 需能创建 venv |
| Node.js | 20+ | 前端构建 |
| Redis | 任意 | 默认端口 6379，需本机运行 |

### 方式一：一键启动（Windows）

```bat
start.bat
```

脚本自动完成：检查 Redis → 启动 Worker → 启动后端 API(:8000) → 启动前端(:5173) → **自动打开浏览器**。
按任意键可一键关闭所有服务。

### 方式二：手动启动

**1. 准备 Python 环境**

```bash
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
```

**2. 配置 AI 导师（可选，不配则 AI 老师休假）**

```bash
copy .env.example .env
# 编辑 .env，填入真实 DEEPSEEK_API_KEY
```

**3. 启动 Redis**（未安装可参考 [Redis for Windows 安装](https://github.com/redis-windows/redis-windows)）

```bash
redis-server
```

**4. 启动沙箱 Worker**（终端 1）

```bash
cd backend
..\.venv\Scripts\python.exe worker.py
```

**5. 启动后端 API**（终端 2）

```bash
cd backend
..\.venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000
```

**6. 启动前端**（终端 3，首次需 `npm install`）

```bash
cd frontend
npm install
npm run dev
```

**7. 打开浏览器**

```
http://localhost:5173
```

### 环境变量

| 变量 | 默认值 | 说明 |
|---|---|---|
| `DEEPSEEK_API_KEY` | 空（AI 功能关闭） | DeepSeek 密钥，从 `.env` 读取 |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com` | API 地址 |
| `DEEPSEEK_MODEL` | `deepseek-v4-flash` | 模型名（v4 flash 性价比高） |
| `REDIS_HOST` / `REDIS_PORT` | `localhost` / `6379` | Redis 连接 |

## 🔌 API 一览

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/run` | 提交代码 `{code, lang, stdin, mode}`，返回 `{job_id}` |
| GET | `/status/{job_id}` | 查询状态 `pending` / `done` / `unknown` |
| GET | `/result/{job_id}` | 获取结构化结果（`ExecResult` 或 `JudgeVerdict`） |
| POST | `/cancel/{job_id}` | 取消执行（Redis pub/sub 实时杀进程） |
| POST | `/ai/help` | AI 导师 `{code, question, output, history, kind}` → 含 `annotations` 批注 |
| GET | `/challenges` | 挑战列表（20 题，判题字段不外泄） |
| GET | `/challenges/tiers` | 关卡元数据（怪物/奖励文案） |
| GET | `/challenges/daily` | 每日一题 |
| GET | `/challenges/{id}` | 单题详情 |
| POST | `/challenges/{id}/judge` | 提交判题（复用 Redis 队列异步判题） |
| GET | `/encouragement` | 随机鼓励语 |
| GET | `/health` | 健康检查（含 Redis 连通性） |

`ExecResult` 结构（前端据此渲染输出/错误标记/追踪）：

```json
{
  "status": "success | error | timeout | blocked",
  "stdout": "...", "stderr": "...",
  "error_type": "ZeroDivisionError",
  "error_line": 2,
  "duration_ms": 157,
  "trace": [{"line": 1, "event": "line", "locals_snapshot": {"x": "3"}}],
  "blocked_reasons": ["禁用了模块 os"]
}
```

## 🧪 测试

```bash
# 单元级：沙箱安全与功能（无需启动服务）
.venv\Scripts\python.exe tests\test_sandbox.py

# 集成级：走完整 HTTP + Redis 链路（需先运行 start.bat）
.venv\Scripts\python.exe tests\test_api.py
```

两个测试均以退出码 0/1 表示通过/失败，可直接接入 CI。

## ❓ 常见问题

| 问题 | 解决 |
|---|---|
| 双击 start.bat 报「Redis 未运行」 | 先启动 redis-server |
| start.bat 报「未找到虚拟环境」 | 按提示执行 `python -m venv .venv` + `pip install -r requirements.txt` |
| AI 老师不回复 | 检查根目录 `.env` 是否存在且密钥有效；未配置时返回「备课中」提示语 |
| 端口 8000/5173 被占用 | `netstat -ano | findstr :8000` 找到 PID 后 `taskkill /F /PID <pid>` |
| 前端中文乱码 | 后端子进程已固定 `-X utf8`；如终端乱码仅影响显示，不影响功能 |
| 子进程残留 | start.bat 关闭时按窗口标题 `taskkill /FI "WINDOWTITLE eq 小码*"` 统一清理 |

## 📌 交接说明（给接手优化的同事）

1. **安全红线**：任何优化都不得绕过 4 层沙箱防线；改动 `security.py` / `sandbox_runner.py` 前先跑 `tests\test_sandbox.py` 回归（16 项）。
2. **密钥管理**：密钥只存在于根目录 `.env`（已被 `.gitignore` 忽略），不要写回代码；如果本仓库曾泄露过密钥，建议到 DeepSeek 控制台轮换。
3. **配置集中**：超时/内存/截断等阈值全部在 `backend/config.py`，改参数只动这一处。
4. **前后端契约**：字段结构以 `backend/models.py` 为准；判题字段（`judge_expected`/`judge_cases`）只存在于后端，`/challenges` 接口已剔除。
5. **异步模型**：执行/判题链路是「入队 → 轮询」；实时性要求高时可加 SSE 推送，但不要破坏现有轮询兜底。
6. **AI 网络**：后端 AI 调用强制 `trust_env=False` 直连（本机系统代理不通 DeepSeek）；换网络环境时注意。
7. **多档案**：所有前端状态按档案隔离（localStorage key 前缀 `k12:{profileId}:`），新功能接入时沿用此约定。
8. **PRD**：v3.0 完整蓝图见 [docs/PRD.md](docs/PRD.md)；原始需求见 [docs/requirements.md](docs/requirements.md)。

## 📄 许可与致谢

- 原型参考：Secure Sandbox（GitHub 开源项目，FastAPI 代码执行服务）
- 竞赛项目（2026 暑期），供学习交流使用
