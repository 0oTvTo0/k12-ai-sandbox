# 小码星球 · K12 AI 编程乐园 v3.0 PRD（视觉与体验大改版）

| 项 | 内容 |
|---|---|
| 文档版本 | v1.0（2026-08-27） |
| 状态 | 已定稿，待实施 |
| 实施者 | DeepSeek V4 Flash（按阶段 P0→P4 交付） |
| 目标仓库 | https://github.com/0oTvTo0/k12-ai-sandbox（公开） |
| 适用范围 | 全部前端（React 19 + Vite + Tailwind v4 + Monaco）+ 部分后端（挑战/判题/AI 批注） |

---

## 1. 背景与目标

现有 v2.0 已具备：Monaco 编辑器、沙箱执行（4 层安全）、AI 导师（DeepSeek）、4 道静态挑战、9 枚徽章、历史记录。用户反馈：视觉粗糙、挑战太少无梯度、AI 与代码无联动、结果展示不像真实编译器、无多用户隔离。

**v3.0 目标**：白天苹果毛玻璃风 / 暗夜赛博霓虹风双主题；卡通化 + 轻量伪 3D 动效；挑战系统重构为 5 关 × 4 题 = 20 题的"打怪通关"题库（自动判题 + 丰富奖励）；AI 老师可直接在代码上做批注（WPS 审阅式）；结果面板严格区分"错误墙/输出页"；编辑器更接近真实 IDE；多学生档案隔离；性能丝滑（目标 60fps，实机 RTX 4060 + 8GB RAM）。

---

## 2. 现状基线（实施前必读）

### 2.1 仓库结构
```
k12_ai_sandbox/
├── start.bat            # 一键启动（自动开浏览器）
├── requirements.txt     # 后端依赖
├── .env                 # DeepSeek 密钥（gitignored，勿提交）
├── backend/
│   ├── main.py          # FastAPI：/run /status /result /cancel /ai/help /examples /challenges /challenges/daily /encouragement /health
│   ├── worker.py        # Redis 队列消费者 + execute_code() + 取消监听
│   ├── sandbox_runner.py# 子进程运行器（import 钩子/受限 builtins/trace）
│   ├── security.py      # AST 静态分析（不要动安全层！）
│   ├── ai_tutor.py      # DeepSeek 调用 + 提示词 + JSON 解析
│   ├── gamification.py  # EXAMPLES(6) / CHALLENGES(4) / ENCOURAGEMENTS
│   ├── config.py        # 全部阈值与配置（含 dotenv 加载）
│   └── models.py        # Pydantic 契约：CodeRequest/ExecResult/TraceEvent/AIHelpRequest/AIHelpResponse/Challenge/ChatMessage
├── frontend/
│   └── src/
│       ├── App.jsx          # 主应用：状态机、轮询、运行/停止/挑战/徽章逻辑
│       ├── index.css        # Tailwind v4 + 主题变量 + 动效（本次重点改造）
│       ├── main.jsx
│       ├── lib/api.js       # API 客户端（BACKEND=http://localhost:8000, 轮询 400ms×120）
│       ├── lib/storage.js   # localStorage：历史/统计/徽章/草稿/主题/字号/已完成挑战（本次重构为按档案隔离）
│       └── components/
│           ├── Header.jsx / Sidebar.jsx / Toolbar.jsx / CodeEditor.jsx
│           ├── ConsolePanel.jsx（输出/错误/追踪 三 tab → 本次重构为状态机面板）
│           ├── AITutor.jsx / Mascot.jsx / Achievements.jsx / Celebration.jsx
│           ├── EditorPanel.jsx / OutputPanel.jsx（如存在以实际文件为准）
└── tests/
    ├── test_sandbox.py  # 16 项沙箱自测（回归基准，勿改安全层）
    └── test_api.py      # 9 项 API 集成测试（需随新接口增补）
```

### 2.2 关键既有约定（不要破坏）
- 执行链路：POST /run → job_id → 轮询 GET /result/{id}（status: pending/done；result: ExecResult）
- ExecResult 字段：`status(success|error|timeout|blocked), stdout, stderr, error_type, error_line, duration_ms, trace[], blocked_reasons[]`
- 取消：POST /cancel/{id} → Redis pub/sub `job_cancel` → worker 杀进程
- 前端运行状态机在 App.jsx（codeRef/stdinRef/runningRef 防闭包过期——改造时保留该模式）
- 安全层（security.py / sandbox_runner.py）**不许弱化**；改动后必须过 tests/test_sandbox.py 16 项回归
- 后端子进程固定 `python -I -X utf8`；终端输出中文需 `PYTHONIOENCODING=utf-8`

---

## 3. 设计语言系统（Design System）

### 3.1 日间主题「玻璃晴空」（苹果风）

| Token | 值 |
|---|---|
| 页面背景 | 多层柔和渐变 `#F2F3F7 → #E9EDF5`，叠加 2~3 个大尺寸模糊色斑（`#C7D8FF`、`#FFE3F0`、`#D8FFEF`，blur 80px，缓慢漂移） |
| 玻璃卡片 | `background: rgba(255,255,255,.58)` + `backdrop-filter: blur(22px) saturate(180%)` + `border: 1px solid rgba(255,255,255,.65)` + `border-radius: 20px`（大卡片 28px）+ `box-shadow: 0 8px 32px rgba(30,40,80,.08)` |
| 文字 | 主 `#1D1D1F`，次 `#6E6E73`；标题 font-weight 650 |
| 强调色 | 苹果蓝 `#0071E3`；成功绿 `#34C759`；错误红 `#FF3B30`；警告橙 `#FF9500` |
| 按钮 | 圆角胶囊（radius 999px），主按钮实心蓝 + hover 轻微上浮 translateY(-1px) + 阴影加深 |
| 字体 | `system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif` |
| 布局 | 大留白；面板间 16~20px 间距；顶部悬浮毛玻璃导航 |

### 3.2 夜间主题「赛博霓虹」（未来主义）

| Token | 值 |
|---|---|
| 页面背景 | 深空 `#080B14 → #0D1122` 渐变 + 霓虹网格线（`repeating-linear-gradient` 两向，线色 `rgba(0,229,255,.06)`）+ Canvas 星点粒子（≤100 颗，缓慢漂浮，偶发流星） |
| 玻璃卡片 | `background: rgba(14,18,36,.62)` + `backdrop-filter: blur(18px)` + `border: 1px solid rgba(0,229,255,.22)` + 外发光 `0 0 24px rgba(0,229,255,.10)` |
| 文字 | 主 `#EAF2FF`，次 `#8FA3C8` |
| 强调色 | 霓虹青 `#00E5FF`、电紫 `#B14EFF`、霓虹粉 `#FF2E97`；主按钮用青→紫渐变描边 + 内发光 |
| 交互反馈 | hover 时元素描边增亮 + `box-shadow` 扩散；运行成功全屏青色粒子 + 紫色渐变庆祝 |

### 3.3 动效规范（性能红线）

- **只动画 `transform` 和 `opacity`**（禁止动画 width/height/top/box-shadow 大范围）
- 时长 150~300ms；缓动 `cubic-bezier(0.2, 0.8, 0.2, 1)`（苹果式）；入场用淡入+上移 8px
- 粒子一律用 **Canvas**（单层，requestAnimationFrame，≤100 粒子），禁止 DOM 粒子
- 全屏毛玻璃面 **≤8 块**；`backdrop-filter` 禁止嵌套叠加超过 2 层
- `will-change` 只加在动画中的元素，动画结束后移除
- 大列表（历史/挑战卡片）使用 memo + 虚拟化（超过 30 条）
- 目标：交互响应 <100ms 感知延迟，滚动/动画 60fps，Monaco 打字零卡顿
- 主题切换用 CSS 变量瞬时切换，不做过渡动画

### 3.4 卡通与伪 3D

- **吉祥物**：现有 Mascot SVG 保留形象，加"呼吸"（scale 1↔1.03，3s）、"眨眼"（每 4~7s）、情绪切换过渡动画
- **3D 翻转徽章（本版唯一的"伪 3D 亮点"）**：成就徽章设计为立体感卡片——外层容器 `perspective: 900px`；未解锁面朝前（剪影+问号），解锁瞬间 `rotateY(180deg)` 翻面展示彩色徽章（`transform-style: preserve-3d`，正反两面 `backface-visibility: hidden`）；通关奖励弹层复用此效果
- 按钮/卡片 hover 微抬升 + 吉祥物视线跟随鼠标（头像区域内 translateX/Y ±4px）
- 文案拟人化：所有系统提示保持"小码星球"口吻（如错误墙标题用"哎哟，代码摔了一跤"）

---

## 4. 功能需求

### FR-01 双主题视觉改版
- 顶部导航太阳/月亮图标一键切换（现有 theme 逻辑保留，重写 CSS 变量）
- 所有面板（Header/Sidebar/Toolbar/Editor/Console/AITutor/Achievements）统一套用 §3 玻璃卡片规范
- 删除"白色背景 + 黑色细边框"的旧观感；边框改为半透明描边 + 阴影分层
- 验收：两套主题下所有组件无白底黑框残留；切换主题即时生效；Monaco 主题联动（亮色 vs-code-light、暗色 cyberpunk 定制配色）

### FR-02 首启欢迎流程
- 无档案时首次打开：全屏欢迎页（品牌标题 + 呼吸动画吉祥物 + "开始编程"按钮）→ 弹层创建档案（见 FR-03）→ 创建完成后编辑器**自动预填 hello world 欢迎代码**：
  ```python
  # 🌟 欢迎来到小码星球！
  # 点击上方 ▶ 运行，看看会发生什么
  print("Hello, World!")
  print("你好，小小程序员！")
  ```
- 验收：清空 localStorage 后打开页面，完整走完欢迎→建档→预填流程

### FR-03 学生档案系统（多用户隔离）
- **数据结构**（localStorage）：
  - `k12_profiles` = `[{id, name, avatar, createdAt}]`
  - `k12_active_profile` = 当前档案 id
  - 所有业务数据 key 加前缀 `k12:{profileId}:`：`history / stats / badges / done_challenges / draft / ai_chat / challenge_progress / skins / mascot_dress / settings`
- 头像：≥8 款 emoji（🐱🦊🐼🦄🐯🐨🤖🐧）
- 顶栏右侧头像按钮 → 下拉：当前档案信息 / 切换档案 / 新建档案 / 编辑昵称头像
- 每个档案独立：历史、统计、徽章、挑战进度、草稿、AI 对话、皮肤换装、主题偏好
- **旧数据清零（用户已确认）**：新版本启动时，删除所有无 `k12:` 前缀的旧 key（`k12_history` 等全部旧 key），迁移函数放 storage.js，幂等执行
- 验收：建档 A、B，各自运行/提问/过关，切换档案后互不可见；旧 key 被清除

### FR-04 编辑器增强（真实 IDE 手感）
- 新增：`Ctrl+Enter` 运行、`Ctrl+Shift+Enter` 追踪、括号/引号自动闭合、括号颜色配对、缩进参考线、代码折叠、行号区高亮当前行、右键菜单
- 中文代码片段：Monaco `registerCompletionItemProvider` 注册触发词（如输入 `for` 出现"🔁 写一个 for 循环"模板），另在工具栏加 🧩 片段菜单（for 循环 / if 判断 / while 循环 / 定义函数 / 打印）
- 编辑器底部状态栏：`行:列 | Python 3 | 就绪/运行中/挑战模式:关卡名`
- 保留：字号 A-/A+、主题联动、红波浪错误标记 + 侧边圆点
- 验收：Tab 补全、括号自动闭合、缩进线可见；Ctrl+Enter 可运行；片段插入正确缩进

### FR-05 严格编译器式结果面板
- 运行结果面板改为**状态机**（替代原"输出/错误/追踪"三 tab）：
  - `idle`：吉祥物 + 引导文案（"写点什么，然后点 ▶ 运行"）
  - `running`：运行中动画（进度光带）
  - `error`：**错误墙**——红黑配色（深红渐变背景 `#2A0808→#4A0D0D` + 红色霓虹描边）：
    - 顶部大字错误类型（SyntaxError / RuntimeError·ZeroDivisionError / 超时 / 已被安全拦截），配一句儿童友好解释（如"除零错误：除法里不能出现 0 哦，0 就像黑洞，会把数字吸走！"）
    - 摘要：第 N 行 + 出错代码片段（Monaco 高亮同步定位）
    - 按钮：`📍 定位到错误行`（滚动+高亮闪烁该行）、`🤖 问问小码老师`
    - 折叠区：Traceback 原文（等宽字体）
  - `success`：**输出页**——stdout 输出 + （trace 模式时）"🔍 追踪"Tab 展示变量快照时间线 + 庆祝动画（撒花/粒子）+ 随机鼓励语 + 新徽章弹层
- **挑战模式下未判过/未通过：只显示错误墙（"还没通关哦"反馈 + 提示按钮），不显示学生输出**；通过则输出页 + 通关奖励弹层
- 验收：除零 → 红墙+定位按钮可跳到第 2 行；正常 print → 输出页+撒花；挑战题答错 → 看不到输出，只有反馈与提示

### FR-06 挑战系统重构（打怪通关题库）★核心

#### 6.1 题库结构
5 大关 × 每关 4 题 = 20 题。难度与奖励梯度递增（完整题库见 §5）。

| 关卡 | 主题 | 难度 | 通关奖励 |
|---|---|---|---|
| 第 1 关 新手村 | 史莱姆 👾 | ⭐ | 徽章「史莱姆猎手」+ 称号 + 吉祥物🧢帽子 |
| 第 2 关 迷雾森林 | 哥布林 👺 | ⭐ | 徽章「哥布林克星」+ 称号 + 吉祥物🕶️眼镜 |
| 第 3 关 火焰山 | 喷火龙 🐲 | ⭐⭐ | 徽章「喷火征服者」+ 称号 + **编辑器皮肤「玻璃之夜」** + 披风 |
| 第 4 关 天空之城 | 大魔王 😈 | ⭐⭐ | 徽章「天空霸主」+ 称号 + 吉祥物👑皇冠 |
| 第 5 关 终焉之塔 | 远古龙 🐉 | ⭐⭐⭐ | 徽章「龙之征服者」+ 称号 + **编辑器皮肤「赛博之翼」** + 翅膀 |
| 全 5 关通关 | — | — | 隐藏徽章「小码传说」+ 奖杯陈列页 |

#### 6.2 关卡地图 UI（替代原挑战列表）
- Sidebar「⚔️ 挑战」页 → 纵向关卡路径图：5 个关卡节点（关名 + 怪物 emoji + 星级），每节点展开 4 题卡片（每题：状态 ✅已过 / ○未过 / 🔒锁定）
- 解锁规则：通关上一关**全部 4 题**解锁下一关
- 当前选中题目：顶栏显示"挑战模式 · 第 X 关·Boss名"，编辑器自动加载 starter_code
- 每日一题保留：从已解锁关卡随机抽一题，入口在挑战页顶部横幅

#### 6.3 自动判题
- 每道题预设判定规则（类型见 §5）：`exact`（stdout 去首尾空白后全等）/ `contains`（stdout 包含全部期望子串）/ `cases`（多组 stdin→stdout 校验，每组 contains 匹配）
- **接口**：`POST /challenges/{challenge_id}/judge` body `{code}` → 返回 `{job_id}`（判定任务复用 Redis 队列，worker 按 case 逐组跑 `execute_code`）→ 前端轮询 `/result/{job_id}` 得到 `JudgeVerdict`（见 §6.2）
- 约束：每题用例数 ≤4，单 case 超时沿用 8s；判题期间按钮变"判定中…"
- 判定结果在成功面板显示：`✅ 通关！输出与答案一致` 或错误墙显示"🤔 还没通关：第 2 组测试没过，你的输出少了 '13'"
- 前端仍以 `done_challenges` 记录已过关 id；**挑战模式下不允许直接看到判题预期输出**（防止照抄）
- 验收：对 20 题各跑"标准答案/错误答案/超时答案"，判定结果全部正确

#### 6.4 奖励体系
- 徽章（新增 6 枚，并入 BADGE_DEFS）：史莱姆猎手 / 哥布林克星 / 喷火征服者 / 天空霸主 / 龙之征服者 / 小码传说；另加「知错就改」徽章（见 FR-07）
- 称号：通关第 N 关解锁（在成就页与顶栏档案菜单展示）
- 编辑器皮肤：第 3、5 关解锁，「设置」中选择后改变 Monaco 配色与代码区背景（玻璃之夜=深蓝玻璃；赛博之翼=霓虹青紫）
- 吉祥物换装：🧢🕶️披风👑🦋翅膀，成就页试衣间
- 通关弹层：全屏奖励动画——3D 翻转徽章 + 粒子雨 + 奖励清单滚动 + 称号大字展示
- 验收：通关第 3 关后皮肤可选且生效；换装后吉祥物形象变化；奖励弹层动画流畅

### FR-07 AI 老师代码批注联动（WPS 审阅式）★核心

#### 7.1 后端契约
- `AIHelpResponse` 增加字段：`annotations: list[Annotation] = []`
- `Annotation` 模型：`{id: str, start_line: int, end_line: int, text: str, severity: str}`（severity ∈ error/warn/tip；end_line ≥ start_line）
- **提示词改造**（ai_tutor.py）：
  - kind=help/error 时，学生代码以**带行号**格式注入：`第1行 | print("hi")`
  - 系统提示词输出契约增加：`"annotations": [{"start_line": 1, "end_line": 1, "text": "这里改成 xxx", "severity": "error"}]`，并要求"只在确有把握时给行号区间，text 用孩子能懂的话，severity: error=会报错/warn=能跑但不推荐/tip=小优化"
  - 解析兜底：annotations 缺失/越界 → 前端 clamp 行号到 [1, 代码行数]；JSON 整体失败 → 降级纯文本回复（现有逻辑保留）
- 前端多轮对话中，最近一条含 annotations 的 AI 回复驱动批注栏

#### 7.2 前端交互
- 右侧新增「📝 批注栏」（与 AI 聊天区联动/可折叠）：
  - 每条批注 = 编号圆标（①②③，颜色随 severity）+ 起止行 + 文字 + 严重程度标签
  - 点击批注 → 编辑器滚动到该行 + 高亮闪烁；点击代码区角标 → 批注栏对应条目高亮（双向联动）
- 代码区：Monaco `deltaDecorations` 给批注区间渲染**半透明罩色**（error `rgba(255,59,48,.15)` / warn `rgba(255,149,0,.15)` / tip `rgba(0,122,255,.12)`）+ 行号区角标
- 批注操作：`✓ 我改好了`（消除该条罩色与角标，标记已采纳）；`全部采纳` 清空
- **知错就改奖励**：某行存在 error 级批注（或上次运行 error）后，学生修改并运行 success → 解锁「知错就改」徽章 + 专属庆祝文案（"错误不可怕，改掉它你就变强了！"）
- 验收：故意写 `print(1/0)` → 问老师 → 回复含批注（红罩色在 return/print 行）+ 批注栏条目；点批注跳转正确；改正运行成功 → 徽章弹出

### FR-08 AI 导师增强
- 对话历史按档案隔离：key `k12:{profileId}:ai_chat`，最多保留 30 条
- **模型切换**：`.env` 中 `DEEPSEEK_MODEL=deepseek-v4-flash`（省钱；⚠️ 实施前在 DeepSeek 官方文档确认确切 model ID 字符串，可能为 `deepseek-v4-flash` 或带日期后缀，以 https://api-docs.deepseek.com 为准；代码无需改动，config.py 已读 env）
- 其余人设/苏格拉底式教学策略保持不变
- 验收：换档案后聊天记录清空；模型切换后 AI 回复正常

### FR-09 示例并入挑战、删除示例栏
- 删除 Sidebar「示例」tab 与前端示例加载入口；6 个旧示例内容改造并入第 1/3 关题库（见 §5 题库表标注"源自示例"）
- 后端 `/examples` 接口保留（不破坏，前端不再调用）
- 验收：侧边栏无示例入口；教学关题目可正常加载运行

### FR-10 追踪模式归位
- 🔍 追踪按钮保留（Toolbar）；trace 结果展示在 **success 面板的"🔍 追踪"Tab**（变量快照时间线：每行 + 变量名/值卡片）
- 运行失败时的 trace 数据可在错误墙折叠区查看
- 验收：trace 模式运行 → 输出页出现追踪 Tab，时间线可滚动

### FR-11 数据与性能
- localStorage 按 FR-03 前缀方案重构；旧 key 清零迁移
- 遵循 §3.3 动效红线；Monaco 惰性加载保持；大列表 memo
- 验收：在实机连续使用 30 分钟无卡顿（滚动/动画/打字）；DevTools Performance 无长任务 >200ms 的动画帧

---

## 5. 挑战题库全表（20 题）

判题类型：`exact`=stdout 去首尾空白全等；`contains`=包含全部子串；`cases`=多组 stdin，每组 contains 校验。
（`tier`=关卡 1-5；`order`=题序 1-4，第 4 题为 Boss 题。）

### 第 1 关 新手村·史莱姆 👾（print/变量/算术）
| id | 题名 | 难度 | 描述 | starter_code | hint | judge |
|---|---|---|---|---|---|---|
| c1-1 | 你好，史莱姆 | ⭐ | 用 print 和史莱姆打个招呼（源自示例 hello） | `# 第一行代码\nprint("你好，史莱姆！")\n` | 别忘了括号和引号 | contains: ["你好"] |
| c1-2 | 史莱姆的背包 | ⭐ | 用变量记录名字和年龄并打印（源自示例 variables） | `name = "小明"\nage = 12\n# 打印一句话\n` | 用逗号拼接 print(a, b) | contains: ["12", "13"] |
| c1-3 | 计算小能手 | ⭐ | 打印 7+5、7-5、7*5、7/5 的结果（新题） | `# 依次打印四种运算结果\n` | print 里可以直接写算式 | contains: ["12", "2", "35", "1.4"] |
| c1-4 | Boss·史莱姆王 | ⭐ | 用三行 print 输出一首小诗迎接史莱姆王（新题） | `# 写三行 print\n` | 每行一个 print | contains: ["史莱姆", "勇敢", "出发"] |

### 第 2 关 迷雾森林·哥布林 👺（if/比较）
| id | 题名 | 难度 | 描述 | starter_code | hint | judge |
|---|---|---|---|---|---|---|
| c2-1 | 偶数侦探 | ⭐ | 打印 1~20 所有偶数（源自原挑战 c1） | `for n in range(1, 21):\n    # 判断 n 是不是偶数\n    pass\n` | `n % 2 == 0` 表示偶数 | contains: ["2", "4", "20"] |
| c2-2 | 哥布林的考题 | ⭐ | 输入一个整数，判断是奇数还是偶数（原挑战 c4 改造，去 random 保证可判题） | `n = int(input("请输入一个数: "))\n# 判断奇偶并打印\n` | `% 2` 取余数 | cases: [{"stdin":"10","expect":["偶数"]},{"stdin":"7","expect":["奇数"]}] |
| c2-3 | 成绩等级 | ⭐ | 输入分数（0-100），≥90 输出 A，≥70 输出 B，≥60 输出 C，否则 D（新题） | `score = int(input())\n# 用 if/elif 判断等级\n` | 从大到小写条件 | cases: [{"stdin":"95","expect":["A"]},{"stdin":"75","expect":["B"]},{"stdin":"66","expect":["C"]},{"stdin":"40","expect":["D"]}] |
| c2-4 | Boss·哥布林王 | ⭐ | 输入三个整数，输出最大的那个（新题） | `a=int(input())\nb=int(input())\nc=int(input())\n# 找最大值\n` | 先比 a 和 b | cases: [{"stdin":"3 7 5","expect":["7"]},{"stdin":"9 2 9","expect":["9"]}] |

### 第 3 关 火焰山·喷火龙 🐲（循环）
| id | 题名 | 难度 | 描述 | starter_code | hint | judge |
|---|---|---|---|---|---|---|
| c3-1 | 循环复读机 | ⭐⭐ | 用 for 循环打印 5 遍加油口号（源自示例 loop） | `for i in range(1, 6):\n    # 打印口号\n` | range(1,6) 会走 5 次 | contains: ["第 5 遍"] |
| c3-2 | 星星塔 | ⭐⭐ | 打印 5 层星星金字塔（源自示例 star） | `for i in range(1, 6):\n    # 每层：空格 + 星星\n` | 空格数量是 5-i，星星 2*i-1 | contains: ["★★★★★★★★★"] |
| c3-3 | 九九乘法表 | ⭐⭐ | 打印九九乘法表（源自原挑战 c3） | `for i in range(1, 10):\n    for j in range(1, i+1):\n        # 打印 j x i = j*i\n        pass\n` | print 加 end="  " 不换行 | contains: ["9x9=81"] |
| c3-4 | Boss·喷火龙 FizzBuzz | ⭐⭐ | 1~20：3 的倍数输出 Fizz，5 的倍数输出 Buzz，都是输出 FizzBuzz（源自示例 fizzbuzz） | `for n in range(1, 21):\n    # 依次判断\n` | 先判断 15 的倍数 | contains: ["FizzBuzz", "Fizz", "Buzz"] |

### 第 4 关 天空之城·大魔王 😈（字符串/列表）
| id | 题名 | 难度 | 描述 | starter_code | hint | judge |
|---|---|---|---|---|---|---|
| c4-1 | 倒着说话 | ⭐⭐ | 输入一个词，倒序输出（源自原挑战 c2） | `word = input()\n# 倒过来打印\n` | 切片 word[::-1] | cases: [{"stdin":"python","expect":["nohtyp"]},{"stdin":"abc","expect":["cba"]}] |
| c4-2 | 列表大冒险 | ⭐⭐ | 建列表 [1,2,3]，加一个 4，删掉 2，打印最终列表与长度（新题） | `nums = [1, 2, 3]\n# 增删改\n` | append 加，remove 删，len 看长度 | contains: ["1", "3", "4", "3"] |
| c4-3 | 找最大值 | ⭐⭐ | 用循环找出列表 [8,3,12,5,9] 的最大值（新题，不用 max 函数） | `nums = [8, 3, 12, 5, 9]\n# 用循环找最大\n` | 记一个"冠军"，逐个挑战 | contains: ["12"] |
| c4-4 | Boss·大魔王 | ⭐⭐ | 输入一句英文，输出大写版本和长度（新题） | `s = input()\n# 转大写 + 求长度\n` | upper() 和 len() | cases: [{"stdin":"hello","expect":["HELLO","5"]}] |

### 第 5 关 终焉之塔·远古龙 🐉（函数/综合）
| id | 题名 | 难度 | 描述 | starter_code | hint | judge |
|---|---|---|---|---|---|---|
| c5-1 | 斐波那契 | ⭐⭐⭐ | 打印前 10 项斐波那契数列（源自示例 fib） | `a, b = 0, 1\nfor _ in range(10):\n    # 打印 a，然后更新 a, b\n` | a, b = b, a+b | contains: ["34"] |
| c5-2 | 定义函数 | ⭐⭐⭐ | 写函数 add(a,b) 返回两数和，调用并打印 3+4（新题） | `def add(a, b):\n    # 返回两数之和\n    pass\nprint(add(3, 4))\n` | 用 return | contains: ["7"] |
| c5-3 | 递归倒计时 | ⭐⭐⭐ | 输入 n，从 n 倒数打印到 1（新题，可用 while 或递归） | `n = int(input())\n# 倒数打印\n` | while n > 0 | cases: [{"stdin":"5","expect":["5","4","3","2","1"]}] |
| c5-4 | Boss·远古龙 | ⭐⭐⭐ | 综合：输入一串空格分隔的数字，输出它们的和与平均值（新题） | `nums = input().split()\n# 求和、求平均\n` | 先转 int，sum()/len() | cases: [{"stdin":"1 2 3 4","expect":["10","2.5"]}] |

> 说明：c2-2 原版用 random 无法稳定判题，已改造为 stdin 驱动；所有用例公开（v1 不做隐藏用例）。判题匹配前对 stdout 做 strip；`contains` 按子串精确匹配。

---

## 6. 后端 API 契约变更

### 6.1 模型（models.py）
```python
class JudgeCase(BaseModel):
    stdin: str = ""
    expect_contains: list[str] = []   # 本组需包含的子串

class Challenge(BaseModel):           # 扩展字段
    id: str; title: str; tier: int; order: int
    theme: str = ""                   # 关卡主题，如 "新手村·史莱姆"
    boss: bool = False                # 是否 Boss 题
    difficulty: str; description: str; starter_code: str = ""; hint: str = ""
    judge_type: str = "contains"      # exact / contains / cases
    judge_expected: list[str] = []    # exact/contains 用
    judge_cases: list[JudgeCase] = [] # cases 用
    rewards: dict = {}                # {"badge": "...", "title": "...", "skin": "...", "mascot": "..."}

class Annotation(BaseModel):
    id: str; start_line: int; end_line: int; text: str; severity: str = "error"

class AIHelpResponse(BaseModel):
    reply: str; emotion: str = "happy"; error_line: Optional[int] = None
    annotations: list[Annotation] = []

class JudgeVerdict(BaseModel):
    passed: bool
    total: int; passed_count: int
    detail: list[dict]                # 每组 {index, stdin, got_stdout, expect, ok}
    feedback: str = ""                # 儿童友好反馈，如 "第 2 组没过，你的输出少了 '13'"
    duration_ms: int = 0
```

### 6.2 接口
- `POST /challenges/{challenge_id}/judge` body `{code, stdin?}` → `{job_id}`（任务入队，kind="judge"）
- `GET /result/{job_id}` 复用：result 为 `JudgeVerdict` JSON（judge 任务）或 `ExecResult`（普通任务），前端按 `result` 内含字段区分（judge 有 `passed` 字段）
- `GET /challenges` 返回 20 题（**不含判题预期内容**——`judge_expected/judge_cases` 不下发，判题只在后端）
- `GET /challenges/{id}` 同上单题（同样不含判题预期）
- `/health` version 改 `"3.0.0"`
- worker.py：main 循环处理 job 时若 `kind=="judge"`，按 `judge_cases`（或单组空 stdin）逐组调 `execute_code(code, stdin)`，比对 stdout → 组 verdict；`passed = 全部 ok`；`feedback` 生成规则：第一组未过的 case 给出"少了/多了什么"式提示（不透露完整预期）

### 6.3 AI 批注（ai_tutor.py）
- `_build_messages`：kind ∈ {help, error, improve} 时，代码块改为带行号格式（`第1行 | ...`）
- SYSTEM_PROMPT 输出契约增加 annotations 数组说明（§7.1）
- `_parse_ai_json`：解析 annotations（缺失容忍）；行号 int 化；clamp 前端做
- `/ai/help` 无其他改动

---

## 7. 前端改造清单（文件级）

| 文件 | 改造内容 |
|---|---|
| `src/index.css` | 全面重写：双主题 CSS 变量（§3）、玻璃卡片工具类 `.glass`/`.glass-dark`、霓虹网格与光斑背景、按钮/卡片动效、keyframes（呼吸/眨眼/漂浮/光带/3D 翻转）、粒子画布容器 |
| `src/lib/storage.js` | 按 FR-03 前缀重构全部 key；新增 profiles CRUD；旧 key 清零迁移函数；新增皮肤/换装/称号/挑战进度存取 |
| `src/App.jsx` | 状态机扩展（结果面板三态、挑战模式、档案引导、首启欢迎）；删除示例 tab；接入 judge 轮询；知错就改检测（error 批注→success 运行）；保留 useRef 防闭包模式 |
| `src/components/ConsolePanel.jsx` | 重构为 ResultPanel：idle/running/error/success 四态（FR-05）；错误墙红黑 UI；成功页含追踪 Tab；挑战模式"未通过"分支 |
| `src/components/Sidebar.jsx` | 删除示例；挑战页改为关卡地图（节点/题目卡片/锁定态/每日一题横幅） |
| `src/components/CodeEditor.jsx` | Monaco 配置增强（自动闭合/缩进线/括号配色/折叠/当前行）；中文 snippets；批注装饰渲染；快捷键 Ctrl+Enter |
| `src/components/Toolbar.jsx` | 挑战模式标识；🧩片段菜单；快捷键提示 tooltip |
| `src/components/AITutor.jsx` | 批注渲染与双向联动；档案隔离聊天历史；采纳按钮 |
| `src/components/AnnotationPanel.jsx` | 新建：右侧批注栏（WPS 审阅式） |
| `src/components/ProfileGate.jsx` | 新建：首启欢迎 + 档案创建/切换弹层 |
| `src/components/RewardOverlay.jsx` | 新建：通关奖励全屏弹层（3D 翻转徽章+粒子+奖励清单） |
| `src/components/ParticleCanvas.jsx` | 新建：Canvas 粒子（暗夜星点/庆祝彩带），≤100 粒子 |
| `src/components/Achievements.jsx` | 新增 6 徽章定义渲染；试衣间（换装）；称号展示 |
| `src/components/Mascot.jsx` | 换装渲染（帽子/眼镜/披风/皇冠/翅膀）；呼吸/眨眼动画 |
| `src/components/Header.jsx` | 头像菜单（档案切换/新建）；主题切换图标 |
| `src/lib/api.js` | 新增 judge 接口调用 |
| `frontend/package.json` | version 3.0.0（可选） |

---

## 8. 实施阶段划分（每阶段独立可跑、可验收）

### P0 基建（主题 + 档案 + 首启）
1. index.css 双主题 + 玻璃系统 + 基础动效
2. storage.js 档案重构 + 旧数据清零迁移
3. ProfileGate 欢迎/建档流程 + hello world 预填
4. Header 头像菜单/主题切换
- **验收**：双主题切换全部组件生效；建档 A/B 数据隔离；旧数据已清；首启流程完整

### P1 编辑器 + 结果面板
1. FR-04 编辑器增强全部
2. FR-05 结果面板四态重构（错误墙/输出页）
3. FR-09 删除示例栏；FR-10 追踪归入成功面板
- **验收**：除零→错误墙+定位；成功→输出页+撒花；Ctrl+Enter；缩进线/闭合/片段

### P2 挑战系统（最大块）
1. 后端：models/gamification 20 题 + /judge + worker judge 分支 + 测试更新
2. 前端：关卡地图 + 挑战模式 + 判题流程 + 奖励体系（徽章/称号/皮肤/换装）+ 通关弹层
- **验收**：tests 全绿；20 题正/误/超时判定正确；锁关/解锁正确；第 3、5 关皮肤可用；换装生效

### P3 AI 批注联动
1. 后端：Annotation 契约 + 行号注入提示词 + 解析
2. 前端：批注栏 + 罩色装饰 + 双向联动 + 采纳 + 知错就改徽章
3. FR-08：档案隔离聊天 + 模型切 deepseek v4 flash（.env 改 DEEPSEEK_MODEL，先确认官方 ID）
- **验收**：错误代码问老师→批注出现且定位准确；改正运行成功→徽章；切档案聊天独立

### P4 打磨与发布
1. 3D 翻转徽章、粒子 Canvas、吉祥物换装动画、视线跟随等动效收尾
2. 性能过检（§3.3 红线，实机 30 分钟）
3. 测试更新（test_api.py 增补 judge/挑战结构用例）+ 全量回归（test_sandbox 16 项必须全绿）
4. README 更新（v3.0 功能、新截图位、FAQ）；版本号 3.0.0（main.py /health、前端 package.json）
5. git：分阶段提交（每阶段一个 commit，规范 message：`feat: ...`）→ `git push origin main`（本机已配 127.0.0.1:7897 代理，Trae 运行中可推送；公开仓库 https://github.com/0oTvTo0/k12-ai-sandbox）
- **验收**：全部测试绿；仓库同步；页面 30 分钟流畅

---

## 9. 测试与验收清单

- [ ] tests/test_sandbox.py 16 项全绿（安全层回归，任何阶段不得破坏）
- [ ] tests/test_api.py 原 9 项全绿 + 新增：/challenges 返回 20 题且字段完整、judge 通过/未通过/超时三态、/ai/help 返回含 annotations
- [ ] 20 道挑战题逐一人工验收（标准答案通过；错误答案不通过且看不到输出）
- [ ] 双主题全组件走查；暗夜赛博网格/粒子可见
- [ ] 多档案：历史/成就/挑战/AI 聊天/皮肤互不串
- [ ] 错误墙定位按钮跳转正确行
- [ ] 批注双向联动 + 知错就改徽章
- [ ] 实机性能：30 分钟无卡顿

---

## 10. 风险与注意事项

1. **安全红线**：不改 security.py / sandbox_runner.py 的拦截逻辑；判题用例不得允许代码写文件/联网（沿用沙箱即可）
2. **DeepSeek 批注行号漂移**：行号注入 + 前端 clamp；提示词要求"没把握就填 error_line 不填区间"
3. **判题耗时**：cases 最多 4 组串行，最坏 4×8s=32s；前端轮询文案"远古龙正在检查你的代码…"；P0 后若嫌慢可并行跑 case（worker 线程池），v3.0 先串行
4. **localStorage 5MB**：对话历史每档案限 30 条；判题不落库
5. **GBK/UTF-8**：任何终端测试中文输出加 `PYTHONIOENCODING=utf-8`
6. **不引入新依赖**（原则）：Canvas 粒子手写，3D 用 CSS；除非确有必要（如无必要不要加 framer-motion 等大库）
7. **公开仓库**：提交前 `grep -rn "sk-" --include="*.py"` 确认无密钥；.env 永不提交

---

## 11. 开放问题（实施时确认）

1. `DEEPSEEK_MODEL` 确切 ID：以官方 https://api-docs.deepseek.com 为准（候选 `deepseek-v4-flash`，另有 0731 快照版本 `deepseek-v4-flash-0731` 的第三方记录）；仅改 .env 即可
2. Boss 题是否要隐藏用例防抄：v3.0 公开用例（提示友好），后续迭代可加
3. 奖励"特效"具体形态（用户原话"徽章，或者特效"）：v3.0 以粒子特效庆祝 + 皮肤/换装落地；专属特效皮肤可在 P4 视时间加
