"""API 集成自测：覆盖正常执行 / 报错定位 / 安全拦截 / 超时熔断 / 追踪调试。
前置条件：Redis、Worker、后端 API 已启动（可直接运行根目录 start.bat）。
运行: python tests/test_api.py
"""
import time

import requests

BASE = "http://localhost:8000"
PASS, FAIL = 0, 0


def run_case(name, code, expect_status, must_contain=None, stdin="", mode="run"):
    """提交代码并轮询结果，返回 ExecResult dict（超时返回 None）。"""
    global PASS, FAIL
    resp = requests.post(f"{BASE}/run", json={"code": code, "stdin": stdin, "mode": mode}, timeout=10)
    job_id = resp.json()["job_id"]

    result = None
    for _ in range(40):  # 最多等 20 秒（超时熔断用例需 8 秒）
        r = requests.get(f"{BASE}/result/{job_id}", timeout=10).json()
        if r["status"] == "done":
            result = r["result"]
            break
        time.sleep(0.5)

    ok = result is not None and result["status"] == expect_status
    if ok and must_contain:
        ok = must_contain in (result["stdout"] + result["stderr"])
    ms = result["duration_ms"] if result else "-"
    print(f"[{'PASS' if ok else 'FAIL'}] {name}: status={result['status'] if result else '等待超时'} ms={ms}")
    if not ok:
        FAIL += 1
    else:
        PASS += 1
    return result


print("== 正常执行 ==")
run_case("基础输出", 'print("你好 K12")', "success", "你好 K12")
run_case("循环求和", "total=0\nfor i in range(1,101):\n    total+=i\nprint(total)", "success", "5050")
run_case("stdin 输入", 'name=input("你叫什么:")\nprint("你好", name)', "success", "你好 小明", stdin="小明")

print("== 报错定位 ==")
r = run_case("除零错误", 'def d(a,b):\n    return a/b\nprint(d(1,0))', "error", "ZeroDivisionError")
print(f"      error_line={r['error_line']}（期望 2，供前端红波浪定位）")

print("== 安全拦截 ==")
run_case("import os", "import os\nprint(os.getcwd())", "blocked")
run_case("open 文件", 'f=open("x.txt","w")', "blocked")
run_case("eval 逃逸", 'eval("1+1")', "blocked")

print("== 超时熔断 ==")
run_case("死循环", "while True:\n    pass", "timeout")

print("== 追踪调试 ==")
r = run_case("单步追踪", "a=1\nb=2\nc=a+b\nprint(c)", "success", mode="trace")
print(f"      追踪步数={len(r['trace'])}（期望 > 0）")

print("== 挑战系统 ==")
# 挑战列表：20 题、字段完整、无判题字段泄漏
challenges = requests.get(f"{BASE}/challenges", timeout=10).json()["challenges"]
assert len(challenges) == 20, f"期望 20 道挑战，实际 {len(challenges)}"
tiers = sorted({c["tier"] for c in challenges})
assert tiers == [1, 2, 3, 4, 5], f"关卡分布错误: {tiers}"
assert all(("judge_expected" not in c and "judge_cases" not in c) for c in challenges), "判题字段泄漏！"
assert all(c["starter_code"] and c["hint"] and c["description"] for c in challenges), "存在字段缺失的挑战"
PASS += 1
print("[PASS] 挑战列表: 20 题, 5 关, 无判题字段泄漏")

def judge_case(cid, code):
    job = requests.post(f"{BASE}/challenges/{cid}/judge", json={"code": code}, timeout=10).json()["job_id"]
    for _ in range(80):  # 超时用例需等 8s
        r = requests.get(f"{BASE}/result/{job}", timeout=10).json()
        if r["status"] == "done":
            return r["result"]
        time.sleep(0.5)
    return None

# 判题：正确 / 错误 / 超时
v = judge_case("c1-1", 'print("你好，史莱姆！")')
if v and v["passed"] and v["total"] >= 1:
    PASS += 1; print("[PASS] 判题-正确答案通过")
else:
    FAIL += 1; print("[FAIL] 判题-正确答案: ", v)

v = judge_case("c1-1", 'print("hello")')
if v and not v["passed"] and v["feedback"]:
    PASS += 1; print("[PASS] 判题-错误答案拦截, feedback:", v["feedback"][:30])
else:
    FAIL += 1; print("[FAIL] 判题-错误答案: ", v)

v = judge_case("c2-3", "while True:\n    pass")
if v and not v["passed"] and "超时" in v["feedback"]:
    PASS += 1; print("[PASS] 判题-死循环超时")
else:
    FAIL += 1; print("[FAIL] 判题-超时: ", v)

v = judge_case("c2-2", 'n = int(input())\nif n % 2 == 0:\n    print("偶数")\nelse:\n    print("奇数")')
if v and v["passed"] and v["passed_count"] == 2:
    PASS += 1; print("[PASS] 判题-多组用例(cases)")
else:
    FAIL += 1; print("[FAIL] 判题-cases: ", v)

# 404 检查
r404 = requests.get(f"{BASE}/challenges/not-exist", timeout=10)
if r404.status_code == 404:
    PASS += 1; print("[PASS] 挑战 404 处理")
else:
    FAIL += 1; print(f"[FAIL] 期望 404，实际 {r404.status_code}")

print(f"\n结果: {PASS} 通过, {FAIL} 失败")
raise SystemExit(1 if FAIL else 0)
