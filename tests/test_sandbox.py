"""沙箱安全与功能自测（绕过 HTTP，直接调 execute_code，无需启动服务）。
运行: python tests/test_sandbox.py
"""
import os
import sys

# 让脚本能从任意目录运行：把 backend/ 加入模块搜索路径
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend"))

from worker import execute_code

PASS, FAIL = 0, 0


def check(label, code, expect_status, must_contain=None, mode="run", stdin="", expect_line=None):
    global PASS, FAIL
    r = execute_code(code, stdin, mode)
    blob = (r.stdout + r.stderr)
    ok = r.status == expect_status and (must_contain is None or must_contain in blob)
    if expect_line is not None:
        ok = ok and r.error_line == expect_line
    print(f"[{'PASS' if ok else 'FAIL'}] {label}: status={r.status} line={r.error_line} ms={r.duration_ms}")
    if not ok:
        FAIL += 1
        print(f"      期望 status={expect_status} 含 '{must_contain}' 行={expect_line}")
        print(f"      实际 stdout={r.stdout[:100]!r}")
        print(f"      实际 stderr={r.stderr[:200]!r}")
    else:
        PASS += 1
    return r


print("== 功能 ==")
check("正常输出", 'print("你好 K12")\nfor i in range(3): print(i)', "success", "你好 K12")
check("数学计算", "print(sum(range(1,101)))", "success", "5050")
check("stdin 输入", 'n=input("名字:")\nprint("你好",n)', "success", "你好 小明", stdin="小明")
check("无输出提示", "x=1+2", "success", "没有 print")

print("== 报错定位 ==")
# 除零真正发生在函数体最深处第 2 行 (return a/b)
r = check("除零错误", 'def d(a,b):\n    return a/b\nprint(d(1,0))', "error", "ZeroDivisionError", expect_line=2)
check("未定义变量", "print(xxx)", "error", "NameError", expect_line=1)

print("== 安全拦截 ==")
check("import os", "import os\nprint(os.getcwd())", "blocked", "os")
check("open 文件", 'f=open("x.txt","w")', "blocked", "open")
check("subprocess", "import subprocess", "blocked")
check("socket 联网", "import socket", "blocked")
check("eval", 'eval("1+1")', "blocked", "eval")
check("dunder 逃逸", 'print("".__class__.__bases__)', "blocked")
check("ctypes", "import ctypes", "blocked")

print("== 熔断 ==")
check("死循环超时", "while True:\n    pass", "timeout", "死循环")
check("内存炸弹", 'x=[]\nwhile True:\n    x.append(" "*10**6)', "timeout", "内存")

print("== trace 调试 ==")
r = check("单步追踪", "a=1\nb=2\nc=a+b\nprint(c)", "success", mode="trace")
print(f"      追踪到 {len(r.trace)} 步")

print(f"\n结果: {PASS} 通过, {FAIL} 失败")
sys.exit(1 if FAIL else 0)
