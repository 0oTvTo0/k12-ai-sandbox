"""
沙箱运行器（在隔离子进程里执行，是学生的"安全考场"）。

核心手法：不改动全局 builtins（那样会把 runner 自己和标准库一起搞崩），
而是给学生代码单独喂一份"阉割版 __builtins__"——
  * 危险内置（open/eval/exec/compile/getattr...）从这份字典里剔除；
  * __import__ 换成安全版，运行时再次拦截危险模块（AST 之外的第二道兜底）。
学生在自己的小世界里看不到这些功能，而 runner 和标准库照常工作。

另外：
  * 收紧递归上限，防栈溢出；
  * run 模式直接运行；trace 模式用 sys.settrace 逐行记录变量快照；
  * 把"错误类型 / 出错行号 / 追踪数据"写进 meta JSON 文件，
    让 worker 能结构化为 ExecResult（前端据此画红波浪线）。

用法（由 worker 调用，不直接面对用户）：
    python -I -X utf8 sandbox_runner.py <code_path> <meta_path> <mode>

学生的 stdout/stderr 原样透传；meta 信息走单独文件，互不污染。
"""
import sys
import json
import traceback as _traceback

# 与 security.py 保持一致（运行时再拦一次）。
BLOCKED_MODULES = {
    "os", "sys", "subprocess", "shutil", "socket", "ctypes", "signal",
    "importlib", "multiprocessing", "threading", "_thread", "pickle",
    "marshal", "builtins", "pathlib", "glob", "fnmatch", "tempfile",
    "webbrowser", "urllib", "http", "requests", "ftplib", "telnetlib",
    "asyncio", "runpy", "code", "codeop", "pty", "platform", "inspect",
    "traceback", "linecache", "gc", "io", "_io", "site", "sysconfig",
}

# 从学生可见的 builtins 里剔除的名字（读写文件 / 动态执行 / 内省逃逸）。
DANGEROUS_BUILTINS = {
    "open", "exec", "eval", "compile", "globals", "locals", "vars",
    "getattr", "setattr", "delattr", "breakpoint", "exit", "quit",
    "help", "memoryview", "__import__",
}

MAX_TRACE_EVENTS = 300   # 与 config 对齐；写死以避免运行期再 import config
RECURSION_LIMIT = 200


def _build_student_builtins():
    """构造学生专属 builtins：真 builtins 去掉危险项，__import__ 换成安全版。"""
    import builtins

    real_import = builtins.__import__

    def safe_import(name, globals=None, locals=None, fromlist=(), level=0):
        root = name.split(".")[0]
        if root in BLOCKED_MODULES:
            raise ImportError(
                f"🚫 模块 '{root}' 在沙盒里被禁用了（保护电脑安全）。"
            )
        return real_import(name, globals, locals, fromlist, level)

    safe = {k: v for k, v in vars(builtins).items() if k not in DANGEROUS_BUILTINS}
    safe["__import__"] = safe_import  # import 语句走这里，运行时拦危险模块
    return safe


def _extract_student_lineno(tb, code_path):
    """从 traceback 里找到属于学生文件的那一帧行号。"""
    last_line = None
    for frame in _traceback.walk_tb(tb):
        if frame[0].f_code.co_filename == code_path:
            last_line = frame[0].f_lineno
    return last_line


def main():
    code_path, meta_path, mode = sys.argv[1], sys.argv[2], sys.argv[3]

    sys.setrecursionlimit(RECURSION_LIMIT)

    with open(code_path, "r", encoding="utf-8") as f:
        student_src = f.read()

    meta = {"error_type": None, "error_line": None, "trace": []}
    # 关键：学生代码运行在这份受限 builtins 之上；runner 自己仍用全量 builtins。
    student_globals = {
        "__name__": "__main__",
        "__file__": code_path,
        "__builtins__": _build_student_builtins(),
    }

    # ---- trace 模式：逐行记录局部变量快照 ----
    trace_events = []

    def tracer(frame, event, arg):
        if len(trace_events) >= MAX_TRACE_EVENTS:
            return tracer  # 到顶就不再记录，但保持追踪不炸
        if frame.f_code.co_filename != code_path:
            return None  # 只关心学生文件，不追标准库内部
        if event in ("line", "call", "return", "exception"):
            snap = {}
            for k, v in frame.f_locals.items():
                try:
                    r = repr(v)
                except Exception:
                    r = "<?>"
                snap[k] = r if len(r) <= 60 else r[:57] + "..."
            trace_events.append({
                "line": frame.f_lineno,
                "event": event,
                "locals_snapshot": snap,
            })
        return tracer

    try:
        compiled = compile(student_src, code_path, "exec")
        if mode == "trace":
            sys.settrace(tracer)
        exec(compiled, student_globals)
    except BaseException as e:  # 包括 SystemExit 之外的一切
        meta["error_type"] = type(e).__name__
        meta["error_line"] = _extract_student_lineno(sys.exc_info()[2], code_path)
        # 把标准 traceback 打到 stderr，给学生看原汁原味的报错
        _traceback.print_exc()
    finally:
        if mode == "trace":
            sys.settrace(None)
        meta["trace"] = trace_events

    # meta 落盘：无论成功/报错都要写，worker 靠它判断 error_type / error_line
    try:
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(meta, f, ensure_ascii=False)
    except Exception:
        pass


if __name__ == "__main__":
    main()
