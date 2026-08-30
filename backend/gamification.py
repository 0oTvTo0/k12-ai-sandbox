"""
游戏化内容：20 道打怪通关挑战题（5 关 × 4 题）、鼓励语。

判题类型：
  exact     —— stdout 去首尾空白后与期望完全相等
  contains  —— stdout 包含全部期望子串
  cases     —— 多组 (stdin, expect_contains) 逐组判题

⚠️ 判题字段（judge_expected / judge_cases）绝不下发给前端，
   由 /challenges 接口的 public_challenge() 剔除。
"""
import random
from models import Challenge

# ---------- 挑战题库：5 关 × 4 题 = 20 题 ----------
CHALLENGES = [
    # ============ 第 1 关 新手村·史莱姆 👾（print/变量/算术） ============
    Challenge(
        id="c1-1", title="你好，史莱姆", tier=1, order=1, theme="新手村·史莱姆",
        difficulty="⭐", description="用 print 和史莱姆打个招呼吧！",
        starter_code='# 第一行代码\nprint("你好，史莱姆！")\n',
        hint="别忘了括号和引号哦。",
        judge_type="contains", judge_expected=["你好"],
        rewards={"badge": "slime_hunter"},
    ),
    Challenge(
        id="c1-2", title="史莱姆的背包", tier=1, order=2, theme="新手村·史莱姆",
        difficulty="⭐", description="用变量记录名字和年龄，再打印出来。",
        starter_code='name = "小明"\nage = 12\n# 打印名字和年龄\n',
        hint="print 里用逗号分隔多个内容：print(name, age)",
        judge_type="contains", judge_expected=["12"],
        rewards={"badge": "slime_hunter"},
    ),
    Challenge(
        id="c1-3", title="计算小能手", tier=1, order=3, theme="新手村·史莱姆",
        difficulty="⭐", description="依次打印 7+5、7-5、7*5、7/5 的结果。",
        starter_code="# 依次打印四种运算的结果\n",
        hint="print 里可以直接写算式。",
        judge_type="contains", judge_expected=["12", "2", "35", "1.4"],
        rewards={"badge": "slime_hunter"},
    ),
    Challenge(
        id="c1-4", title="Boss·史莱姆王", tier=1, order=4, theme="新手村·史莱姆",
        boss=True, difficulty="⭐",
        description="用三行 print 写一首小诗，迎接史莱姆王！",
        starter_code='# 写三行 print 小诗\n',
        hint="每行一个 print。",
        judge_type="contains", judge_expected=["史莱姆", "勇敢", "出发"],
        rewards={"badge": "slime_hunter"},
    ),

    # ============ 第 2 关 迷雾森林·哥布林 👺（if/比较） ============
    Challenge(
        id="c2-1", title="偶数侦探", tier=2, order=1, theme="迷雾森林·哥布林",
        difficulty="⭐", description="打印出 1 到 20 之间所有的偶数。",
        starter_code='for n in range(1, 21):\n    # 判断 n 是不是偶数\n    pass\n',
        hint="n % 2 == 0 表示 n 是偶数。",
        judge_type="contains", judge_expected=["2", "4", "20"],
        rewards={"badge": "goblin_slayer"},
    ),
    Challenge(
        id="c2-2", title="哥布林的考题", tier=2, order=2, theme="迷雾森林·哥布林",
        difficulty="⭐", description="输入一个整数，判断它是奇数还是偶数。",
        starter_code='n = int(input("请输入一个数: "))\n# 判断奇偶并打印\n',
        hint="n % 2 的余数可以告诉你答案。",
        judge_type="cases",
        judge_cases=[
            {"stdin": "10", "expect_contains": ["偶数"]},
            {"stdin": "7", "expect_contains": ["奇数"]},
        ],
        rewards={"badge": "goblin_slayer"},
    ),
    Challenge(
        id="c2-3", title="成绩等级", tier=2, order=3, theme="迷雾森林·哥布林",
        difficulty="⭐",
        description="输入分数（0~100）：≥90 输出 A，≥70 输出 B，≥60 输出 C，否则 D。",
        starter_code='score = int(input())\n# 用 if/elif 判断等级\n',
        hint="从大到小写条件，先判断 ≥90。",
        judge_type="cases",
        judge_cases=[
            {"stdin": "95", "expect_contains": ["A"]},
            {"stdin": "75", "expect_contains": ["B"]},
            {"stdin": "66", "expect_contains": ["C"]},
            {"stdin": "40", "expect_contains": ["D"]},
        ],
        rewards={"badge": "goblin_slayer"},
    ),
    Challenge(
        id="c2-4", title="Boss·哥布林王", tier=2, order=4, theme="迷雾森林·哥布林",
        boss=True, difficulty="⭐",
        description="输入三个整数（每行一个），输出最大的那个。",
        starter_code='a = int(input())\nb = int(input())\nc = int(input())\n# 找出并打印最大值\n',
        hint="先用 if 比较 a 和 b，再和 c 比。",
        judge_type="cases",
        judge_cases=[
            {"stdin": "3\n7\n5", "expect_contains": ["7"]},
            {"stdin": "9\n2\n9", "expect_contains": ["9"]},
        ],
        rewards={"badge": "goblin_slayer"},
    ),

    # ============ 第 3 关 火焰山·喷火龙 🐲（循环） ============
    Challenge(
        id="c3-1", title="循环复读机", tier=3, order=1, theme="火焰山·喷火龙",
        difficulty="⭐⭐", description="用 for 循环打印 5 遍加油口号。",
        starter_code='for i in range(1, 6):\n    # 打印口号，带上 i\n',
        hint="range(1, 6) 会从 1 走到 5。",
        judge_type="contains", judge_expected=["第 5 遍"],
        rewards={"badge": "dragon_tamer"},
    ),
    Challenge(
        id="c3-2", title="星星塔", tier=3, order=2, theme="火焰山·喷火龙",
        difficulty="⭐⭐", description="用 print 画出一座 5 层的星星金字塔。",
        starter_code='for i in range(1, 6):\n    # 每层 = 空格 + 星星\n',
        hint="空格数量是 5-i，星星数量是 2*i-1。",
        judge_type="contains", judge_expected=["★★★★★★★★★"],
        rewards={"badge": "dragon_tamer"},
    ),
    Challenge(
        id="c3-3", title="九九乘法表", tier=3, order=3, theme="火焰山·喷火龙",
        difficulty="⭐⭐", description="用两层循环打印出九九乘法表。",
        starter_code='for i in range(1, 10):\n    for j in range(1, i + 1):\n        # 打印 j x i = j*i\n        pass\n',
        hint='print(f"{j}x{i}={i*j}", end="  ") 可以不换行。',
        judge_type="contains", judge_expected=["9x9=81"],
        rewards={"badge": "dragon_tamer"},
    ),
    Challenge(
        id="c3-4", title="Boss·喷火龙 FizzBuzz", tier=3, order=4, theme="火焰山·喷火龙",
        boss=True, difficulty="⭐⭐",
        description="打印 1~20：3 的倍数输出 Fizz，5 的倍数输出 Buzz，都是就输出 FizzBuzz。",
        starter_code='for n in range(1, 21):\n    # 依次判断\n',
        hint="先判断 15 的倍数（FizzBuzz），再判断 3 和 5。",
        judge_type="contains", judge_expected=["FizzBuzz", "Fizz", "Buzz"],
        rewards={"badge": "dragon_tamer"},
    ),

    # ============ 第 4 关 天空之城·大魔王 😈（字符串/列表） ============
    Challenge(
        id="c4-1", title="倒着说话", tier=4, order=1, theme="天空之城·大魔王",
        difficulty="⭐⭐", description="输入一个单词，把它倒过来打印。",
        starter_code='word = input()\n# 倒过来打印\n',
        hint="切片 word[::-1] 可以倒序。",
        judge_type="cases",
        judge_cases=[
            {"stdin": "python", "expect_contains": ["nohtyp"]},
            {"stdin": "abc", "expect_contains": ["cba"]},
        ],
        rewards={"badge": "sky_king"},
    ),
    Challenge(
        id="c4-2", title="列表大冒险", tier=4, order=2, theme="天空之城·大魔王",
        difficulty="⭐⭐",
        description="列表 [1,2,3] 加一个 4、删掉 2，打印最终列表和长度。",
        starter_code='nums = [1, 2, 3]\n# 加一个 4，删掉 2\n# 打印列表和长度\n',
        hint="append() 加，remove() 删，len() 求长度。",
        judge_type="contains", judge_expected=["1", "3", "4", "3"],
        rewards={"badge": "sky_king"},
    ),
    Challenge(
        id="c4-3", title="找最大值", tier=4, order=3, theme="天空之城·大魔王",
        difficulty="⭐⭐",
        description="用循环找出列表 [8,3,12,5,9] 的最大值（不许用 max 函数）。",
        starter_code='nums = [8, 3, 12, 5, 9]\n# 用循环找最大值并打印\n',
        hint='记一个"冠军"，拿每个数和它比。',
        judge_type="contains", judge_expected=["12"],
        rewards={"badge": "sky_king"},
    ),
    Challenge(
        id="c4-4", title="Boss·大魔王", tier=4, order=4, theme="天空之城·大魔王",
        boss=True, difficulty="⭐⭐",
        description="输入一句英文，输出它的大写版本和长度。",
        starter_code='s = input()\n# 转大写 + 求长度并打印\n',
        hint="upper() 转大写，len() 求长度。",
        judge_type="cases",
        judge_cases=[
            {"stdin": "hello", "expect_contains": ["HELLO", "5"]},
        ],
        rewards={"badge": "sky_king"},
    ),

    # ============ 第 5 关 终焉之塔·远古龙 🐉（函数/综合） ============
    Challenge(
        id="c5-1", title="斐波那契", tier=5, order=1, theme="终焉之塔·远古龙",
        difficulty="⭐⭐⭐", description="打印前 10 项斐波那契数列（1 1 2 3 5 8 ...）。",
        starter_code='a, b = 1, 1\nfor _ in range(10):\n    # 打印 a，然后更新 a, b\n',
        hint="a, b = b, a + b 一步更新两个数。",
        judge_type="contains", judge_expected=["34", "55"],
        rewards={"badge": "dragon_king"},
    ),
    Challenge(
        id="c5-2", title="定义函数", tier=5, order=2, theme="终焉之塔·远古龙",
        difficulty="⭐⭐⭐",
        description="写函数 add(a, b) 返回两数之和，调用并打印 add(3, 4)。",
        starter_code='def add(a, b):\n    # 返回两数之和\n    pass\n\nprint(add(3, 4))\n',
        hint="函数里用 return 返回结果。",
        judge_type="contains", judge_expected=["7"],
        rewards={"badge": "dragon_king"},
    ),
    Challenge(
        id="c5-3", title="倒计时", tier=5, order=3, theme="终焉之塔·远古龙",
        difficulty="⭐⭐⭐",
        description="输入 n，从 n 倒数打印到 1。",
        starter_code='n = int(input())\n# 从 n 倒数到 1 打印\n',
        hint="while n > 0 循环，每次 n 减 1。",
        judge_type="cases",
        judge_cases=[
            {"stdin": "5", "expect_contains": ["5", "4", "3", "2", "1"]},
        ],
        rewards={"badge": "dragon_king"},
    ),
    Challenge(
        id="c5-4", title="Boss·远古龙", tier=5, order=4, theme="终焉之塔·远古龙",
        boss=True, difficulty="⭐⭐⭐",
        description="综合：输入一串空格分隔的数字，输出它们的和与平均值。",
        starter_code='nums = input().split()\n# 求和、求平均（平均值保留一位小数）\n',
        hint="先把字符串转成 int，sum() 求和，len() 求个数。",
        judge_type="cases",
        judge_cases=[
            {"stdin": "1 2 3 4", "expect_contains": ["10", "2.5"]},
        ],
        rewards={"badge": "dragon_king"},
    ),
]

# 关卡主题信息（前端关卡地图渲染用）
TIERS = [
    {"tier": 1, "name": "新手村", "monster": "👾", "title": "史莱姆", "stars": "⭐",
     "reward_desc": "徽章「史莱姆猎手」+ 帽子 🧢"},
    {"tier": 2, "name": "迷雾森林", "monster": "👺", "title": "哥布林", "stars": "⭐",
     "reward_desc": "徽章「哥布林克星」+ 眼镜 🕶️"},
    {"tier": 3, "name": "火焰山", "monster": "🐲", "title": "喷火龙", "stars": "⭐⭐",
     "reward_desc": "徽章「喷火征服者」+ 编辑器皮肤「玻璃之夜」+ 披风 🧣"},
    {"tier": 4, "name": "天空之城", "monster": "😈", "title": "大魔王", "stars": "⭐⭐",
     "reward_desc": "徽章「天空霸主」+ 皇冠 👑"},
    {"tier": 5, "name": "终焉之塔", "monster": "🐉", "title": "远古龙", "stars": "⭐⭐⭐",
     "reward_desc": "徽章「龙之征服者」+ 编辑器皮肤「赛博之翼」+ 翅膀 🦋"},
]

# ---------- 运行成功的随机鼓励语（前端即时正反馈） ----------
ENCOURAGEMENTS = [
    "太棒了！代码一次跑通，你是个小天才！🌟",
    "哇哦！运行成功，给自己鼓个掌吧！👏",
    "完美！你的代码像魔法一样灵验！✨",
    "厉害了我的小程序员！继续冲鸭！🚀",
    "运行成功！你离编程大师又近了一步！🎯",
    "棒呆！这段代码写得又漂亮又正确！🏆",
    "耶！成功啦！你认真思考的样子最帅/最美！😎",
    "干得漂亮！电脑都被你征服啦！💪",
]


def get_examples():
    """兼容占位：示例内容已并入挑战题库（FR-09），前端不再调用此接口。"""
    return []


def get_challenges():
    return CHALLENGES


def get_challenge_by_id(challenge_id: str):
    for c in CHALLENGES:
        if c.id == challenge_id:
            return c
    return None


def public_challenge(ch: Challenge) -> dict:
    """对外发布视图：剔除判题字段，防止学生照着抄答案。"""
    return ch.model_dump(exclude={"judge_expected", "judge_cases"})


def get_tiers():
    return TIERS


def get_daily_challenge():
    """每日一题：按日期确定性地选一道（同一天所有学生看到同一题）。"""
    from datetime import date
    idx = date.today().toordinal() % len(CHALLENGES)
    return CHALLENGES[idx]


def random_encouragement():
    return random.choice(ENCOURAGEMENTS)
