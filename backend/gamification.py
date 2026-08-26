"""
游戏化内容：挑战卡片、代码示例库、鼓励语、成就规则。

这些内容目前由后端静态提供（接口规范、便于前端渲染），
后续可以无缝迁移到数据库，或对接"课程体系"模块——结构不用改。
"""
import random
from models import Challenge

# ---------- 代码示例库（编辑器一键加载） ----------
EXAMPLES = [
    {
        "id": "hello",
        "title": "👋 你好，世界",
        "category": "入门",
        "description": "第一行代码，跟计算机打个招呼",
        "code": '# 这是我的第一行 Python 代码！\nprint("你好，世界！")\nprint("我开始学编程啦 🎉")\n',
    },
    {
        "id": "variables",
        "title": "📦 变量小盒子",
        "category": "入门",
        "description": "变量就像贴了标签的盒子，能装各种东西",
        "code": 'name = "小明"\nage = 12\nprint(name, "今年", age, "岁")\nprint("明年就", age + 1, "岁啦！")\n',
    },
    {
        "id": "loop",
        "title": "🔁 循环复读机",
        "category": "基础",
        "description": "让电脑帮你重复做事，它从不喊累",
        "code": 'for i in range(1, 6):\n    print("第", i, "遍：我要好好学习！")\n',
    },
    {
        "id": "fizzbuzz",
        "title": "🎯 FizzBuzz 小游戏",
        "category": "进阶",
        "description": "经典编程小游戏，试试你能看懂吗",
        "code": 'for n in range(1, 21):\n    if n % 15 == 0:\n        print("FizzBuzz")\n    elif n % 3 == 0:\n        print("Fizz")\n    elif n % 5 == 0:\n        print("Buzz")\n    else:\n        print(n)\n',
    },
    {
        "id": "star",
        "title": "⭐ 画个小星星塔",
        "category": "进阶",
        "description": "用 print 画出一座星星金字塔",
        "code": 'for i in range(1, 6):\n    print(" " * (5 - i) + "★" * (2 * i - 1))\n',
    },
    {
        "id": "fib",
        "title": "🐰 斐波那契数列",
        "category": "挑战",
        "description": "兔子数列：每个数都是前两个数之和",
        "code": 'a, b = 0, 1\nfor _ in range(10):\n    print(a, end=" ")\n    a, b = b, a + b\nprint()\n',
    },
]

# ---------- 每日挑战卡片 ----------
CHALLENGES = [
    Challenge(
        id="c1", title="偶数侦探", difficulty="⭐",
        description="打印出 1 到 20 之间所有的偶数，看看你能找出几个！",
        starter_code='# 打印 1~20 的偶数\nfor n in range(1, 21):\n    # 你的代码：判断 n 是不是偶数\n    pass\n',
        hint="提示：n % 2 == 0 表示 n 是偶数哦。",
    ),
    Challenge(
        id="c2", title="倒着说话", difficulty="⭐⭐",
        description="输入一个单词，把它倒过来打印。比如输入 'abc'，输出 'cba'。",
        starter_code='word = "python"\n# 把 word 倒过来打印\n',
        hint="提示：切片 word[::-1] 可以倒序，试试看！",
    ),
    Challenge(
        id="c3", title="九九乘法表", difficulty="⭐⭐",
        description="用两层循环打印出九九乘法表，挑战一下！",
        starter_code='# 九九乘法表\nfor i in range(1, 10):\n    for j in range(1, i + 1):\n        # 打印 i*j\n        pass\n',
        hint="提示：print(f\"{j}x{i}={i*j}\", end=\"  \")",
    ),
    Challenge(
        id="c4", title="猜数字游戏", difficulty="⭐⭐⭐",
        description="电脑想好一个 1~10 的数字，写个程序猜猜看它是不是大于 5。",
        starter_code='import random\nsecret = random.randint(1, 10)\nprint("我想好了一个数字哦")\n# 判断 secret 是不是大于 5\n',
        hint="提示：用 if secret > 5: 来判断。",
    ),
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
    return EXAMPLES


def get_challenges():
    return CHALLENGES


def get_daily_challenge():
    """每日一题：按日期确定性地选一道（同一天所有学生看到同一题）。"""
    from datetime import date
    idx = date.today().toordinal() % len(CHALLENGES)
    return CHALLENGES[idx]


def random_encouragement():
    return random.choice(ENCOURAGEMENTS)
