"""
加固版执行 Worker：从 Redis 取任务 → 安全执行 → 写回结构化结果。

多层纵深防御（Windows 无 Docker 下的等效隔离）：
  第 0 层  AST 静态分析（security.py）：危险代码直接拦下，根本不进子进程。
  第 1 层  运行时 import 钩子（sandbox_runner.py）：兜底混淆绕过。
  第 2 层  隔离子进程：python -I（忽略环境变量/用户站点）+ 白名单环境变量
           （绝不把 DeepSeek Key 等机密带进子进程）+ 独立临时目录。
  第 3 层  psutil 资源熔断：实时监控内存，超限 / 超时立即 kill。
"""
import redis
import json
import subprocess
import tempfile
import os
import sys
import time
import threading

import psutil

import config
import security
from models import ExecResult, TraceEvent

RUNNER_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sandbox_runner.py")

# 当前正在执行的任务（供"停止"按钮实时 kill）。
# 结构: {"job_id": str|None, "proc": Popen|None, "state": {"cancelled": bool}}
CURRENT = {"job_id": None, "proc": None, "state": {"cancelled": False}}


def get_redis():
    """每次新建连接，配合 brpop 超时实现断线重连。"""
    return redis.Redis(
        host=config.REDIS_HOST,
        port=config.REDIS_PORT,
        decode_responses=True,
        protocol=2,
        socket_timeout=10,
        socket_connect_timeout=5,
    )


def cancel_listener():
    """后台线程：订阅 job_cancel 频道，收到当前任务的 id 就 kill 子进程。"""
    while True:
        try:
            rc = get_redis()
            ps = rc.pubsub(ignore_subscribe_messages=True)
            ps.subscribe("job_cancel")
            for msg in ps.listen():
                jid = msg.get("data")
                if jid and jid == CURRENT.get("job_id") and CURRENT.get("proc"):
                    CURRENT["state"]["cancelled"] = True
                    try:
                        CURRENT["proc"].kill()
                    except Exception:
                        pass
        except Exception as e:
            print(f"[cancel] listener error, reconnect in 1s... ({e})", flush=True)
            time.sleep(1)


def build_clean_env(tmpdir):
    """白名单环境变量：只给子进程活下去所需的最小集合，绝不泄露任何机密。"""
    env = {
        "SystemRoot": os.environ.get("SystemRoot", ""),
        "TEMP": tmpdir,
        "TMP": tmpdir,
        "TMPDIR": tmpdir,
        "PYTHONDONTWRITEBYTECODE": "1",
        "PYTHONNOUSERSITE": "1",
        "PYTHONUTF8": "1",
    }
    # Windows 下 Python 找 DLL 需要 PATH；绝对路径的 sys.executable 也保险起见带上
    if os.environ.get("PATH"):
        env["PATH"] = os.environ["PATH"]
    return env


def _parse_meta(meta_path):
    try:
        with open(meta_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"error_type": None, "error_line": None, "trace": []}


def _truncate(text):
    if text is None:
        return ""
    if len(text) > config.MAX_OUTPUT_CHARS:
        return text[:config.MAX_OUTPUT_CHARS] + "\n\n... (输出太长，已截断 ✂️)"
    return text


def execute_code(code: str, stdin_data: str, mode: str, job_id=None) -> ExecResult:
    """核心执行函数：返回结构化结果，供 worker 写回 Redis。"""
    started = time.time()

    # ---- 第 0 层：AST 静态安全检查 ----
    safe, reasons_text = security.quick_check(code)
    report = security.analyze_code(code)
    if not safe:
        return ExecResult(
            status="blocked",
            stdout="",
            stderr="🛡️ 安全卫士拦截了这段代码：\n" + reasons_text,
            blocked_reasons=report.reasons,
            duration_ms=int((time.time() - started) * 1000),
        )

    timeout = config.TRACE_TIMEOUT_SECONDS if mode == "trace" else config.EXEC_TIMEOUT_SECONDS
    verdict = {"killed": None}  # None / "timeout" / "memory"

    # 注册当前任务，供"停止"按钮 kill（job_id 为空时=本地自测，不注册）
    state = {"cancelled": False}
    if job_id:
        CURRENT["job_id"] = job_id
        CURRENT["state"] = state
        CURRENT["proc"] = None

    with tempfile.TemporaryDirectory() as tmpdir:
        code_path = os.path.join(tmpdir, "main.py")
        meta_path = os.path.join(tmpdir, "meta.json")
        # errors=surrogateescape：学生代码里哪怕有奇怪字符也能写进去
        with open(code_path, "w", encoding="utf-8", errors="surrogateescape") as f:
            f.write(code)

        proc = subprocess.Popen(
            [sys.executable, "-I", "-X", "utf8", RUNNER_PATH, code_path, meta_path, mode],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=tmpdir,
            env=build_clean_env(tmpdir),
            text=True,
            encoding="utf-8",
            errors="replace",
        )
        if job_id:
            CURRENT["proc"] = proc

        # ---- 第 3 层：psutil 资源熔断监控 ----
        def monitor():
            try:
                p = psutil.Process(proc.pid)
            except psutil.NoSuchProcess:
                return
            limit_bytes = config.MAX_MEMORY_MB * 1024 * 1024
            deadline = started + timeout
            while proc.poll() is None:
                if time.time() > deadline:
                    verdict["killed"] = "timeout"
                    proc.kill()
                    return
                try:
                    # 含所有子进程内存（防止 fork 炸弹分摊）
                    total = p.memory_info().rss
                    for child in p.children(recursive=True):
                        try:
                            total += child.memory_info().rss
                        except psutil.NoSuchProcess:
                            pass
                    if total > limit_bytes:
                        verdict["killed"] = "memory"
                        proc.kill()
                        return
                except psutil.NoSuchProcess:
                    return
                time.sleep(config.MONITOR_INTERVAL_SECONDS)

        mon = threading.Thread(target=monitor, daemon=True)
        mon.start()

        try:
            out, err = proc.communicate(input=stdin_data or "", timeout=timeout + 3)
        except subprocess.TimeoutExpired:
            proc.kill()
            out, err = proc.communicate()
            if verdict["killed"] is None:
                verdict["killed"] = "timeout"

        mon.join(timeout=1)
        duration = int((time.time() - started) * 1000)

        # 清理"当前任务"注册
        if job_id:
            CURRENT["job_id"] = None
            CURRENT["proc"] = None

        meta = _parse_meta(meta_path)
        stdout = _truncate(out)
        stderr = _truncate(err)

        # ---- 判定最终状态 ----
        if state["cancelled"]:
            return ExecResult(
                status="cancelled",
                stdout=stdout,
                stderr=(stderr + "\n\n⏹ 你按下了停止按钮，程序已经被叫停啦。").strip(),
                duration_ms=duration,
            )
        if verdict["killed"] == "timeout":
            return ExecResult(
                status="timeout",
                stdout=stdout,
                stderr=(stderr + f"\n\n⏰ 时间到！程序跑了超过 {timeout} 秒被喊停。"
                        "是不是不小心写了死循环？检查一下吧～").strip(),
                duration_ms=duration,
            )
        if verdict["killed"] == "memory":
            return ExecResult(
                status="timeout",  # 对学生统一呈现为"被喊停"
                stdout=stdout,
                stderr=(stderr + f"\n\n🧠 内存超标！程序用了超过 {config.MAX_MEMORY_MB}MB 内存被喊停。"
                        "是不是创建了太大的列表呀？").strip(),
                duration_ms=duration,
            )

        trace_events = [TraceEvent(**e) for e in meta.get("trace", [])]
        if meta.get("error_type"):
            return ExecResult(
                status="error",
                stdout=stdout,
                stderr=stderr,
                error_type=meta["error_type"],
                error_line=meta.get("error_line"),
                duration_ms=duration,
                trace=trace_events,
            )

        return ExecResult(
            status="success",
            stdout=stdout if stdout.strip() else "(程序跑完啦，但是没有 print 任何内容～)",
            stderr=stderr,
            duration_ms=duration,
            trace=trace_events,
        )


def main():
    r = get_redis()
    # 启动"停止按钮"监听线程
    threading.Thread(target=cancel_listener, daemon=True).start()
    print("Safe Worker started, waiting for jobs...", flush=True)

    while True:
        try:
            item = r.brpop(config.JOB_QUEUE, timeout=60)
            if item is None:
                try:
                    r.close()
                except Exception:
                    pass
                time.sleep(0.5)
                r = get_redis()
                continue

            _, job_data = item
            job = json.loads(job_data)
            job_id = job["id"]
            code = job.get("code", "")
            stdin_data = job.get("stdin", "")
            mode = job.get("mode", "run")

            print(f"[run] {job_id} (mode={mode}, {len(code)} chars)", flush=True)

            try:
                result = execute_code(code, stdin_data, mode, job_id=job_id)
            except Exception as e:  # worker 自己不能崩
                result = ExecResult(status="error", stderr=f"沙盒内部错误: {e}",
                                    error_type="SandboxError")

            payload = result.model_dump_json()
            r.set(config.RESULT_KEY.format(job_id=job_id), payload, ex=config.JOB_TTL_SECONDS)
            r.set(config.STATUS_KEY.format(job_id=job_id), "done", ex=config.JOB_TTL_SECONDS)
            print(f"[done] {job_id} -> {result.status}", flush=True)

        except (redis.exceptions.TimeoutError, redis.exceptions.ConnectionError,
                ConnectionResetError, OSError) as e:
            print(f"[reconnect] Redis lost, reconnect in 1s... ({e})", flush=True)
            try:
                r.close()
            except Exception:
                pass
            time.sleep(1)
            r = get_redis()


if __name__ == "__main__":
    main()