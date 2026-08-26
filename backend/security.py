"""
安全第一道防线：AST 静态分析。

在学生代码进入子进程 *之前*，先解析成抽象语法树，拦截明显危险的
导入 / 函数调用 / 属性访问 / 双下划线（dunder）逃逸手法。

设计原则：
- 宁可误伤一点，也不放过危险（对 K12 场景，绝大多数正当用法不会被拦）。
- 返回"给学生看得懂"的友好提示，而不是冷冰冰的 SecurityError。
- 这道防线无法 100% 拦住混淆代码，因此 worker 里还有运行时 import 钩子兜底。
"""
import ast
from dataclasses import dataclass, field

# 禁用的模块：文件系统 / 系统命令 / 网络 / 进程 / 底层逃逸常用
BANNED_MODULES = {
    "os", "sys", "subprocess", "shutil", "socket", "ctypes", "signal",
    "importlib", "multiprocessing", "threading", "_thread", "pickle",
    "marshal", "builtins", "pathlib", "glob", "fnmatch", "tempfile",
    "webbrowser", "urllib", "http", "requests", "ftplib", "telnetlib",
    "asyncio", "runpy", "code", "codeop", "pty", "platform", "inspect",
    "traceback", "linecache", "gc", "io", "_io", "site", "sysconfig",
}

# 禁用的内置函数 / 名字：可读写文件、动态执行、内省逃逸
BANNED_NAMES = {
    "open", "exec", "eval", "compile", "__import__",
    "globals", "locals", "vars", "getattr", "setattr", "delattr",
    "breakpoint", "exit", "quit", "help", "memoryview",
}

# 禁用的 dunder / 危险属性：沙箱逃逸的经典入口（__subclasses__、__globals__ 等）
BANNED_ATTRS = {
    "__subclasses__", "__globals__", "__code__", "__class__", "__bases__",
    "__dict__", "__import__", "__builtins__", "__loader__", "__spec__",
    "__mro__", "__init__", "__getattribute__", "__reduce__", "__reduce_ex__",
    "func_globals", "gi_frame", "f_globals", "f_builtins", "tb_frame",
    "__closure__", "__func__", "__self__", "__module__", "__annotations__",
}


@dataclass
class SecurityReport:
    """静态分析结果。safe=False 时，reasons 里是给学生的中文提示。"""
    safe: bool = True
    reasons: list[str] = field(default_factory=list)

    def add(self, msg: str):
        self.safe = False
        self.reasons.append(msg)


def analyze_code(code: str) -> SecurityReport:
    """对源代码做 AST 静态安全检查。语法错误不算安全问题（交给运行时报错）。"""
    report = SecurityReport()
    try:
        tree = ast.parse(code)
    except SyntaxError:
        # 语法错误交给 Python 解释器去报，静态分析不拦截
        return report

    for node in ast.walk(tree):
        # 1) import xxx / import xxx as y
        if isinstance(node, ast.Import):
            for alias in node.names:
                root = alias.name.split(".")[0]
                if root in BANNED_MODULES:
                    report.add(
                        f"第 {node.lineno} 行：为了保护电脑安全，不能使用 `{root}` 这个工具箱哦。"
                    )
        # 2) from xxx import yyy
        elif isinstance(node, ast.ImportFrom):
            root = (node.module or "").split(".")[0]
            if root in BANNED_MODULES:
                report.add(
                    f"第 {node.lineno} 行：`from {node.module} import ...` 里有被禁止的 `{root}`，"
                    "它被锁进保险柜啦。"
                )
        # 3) 危险函数调用：open()、eval() 等
        elif isinstance(node, ast.Call):
            func = node.func
            if isinstance(func, ast.Name) and func.id in BANNED_NAMES:
                report.add(
                    f"第 {node.lineno} 行：`{func.id}()` 是危险操作，已拦截。"
                    "想读文件/执行字符串？在沙盒里不可以哦。"
                )
            # obj.danger() 形式：x.__class__() 之类
            elif isinstance(func, ast.Attribute) and func.attr in BANNED_ATTRS:
                report.add(
                    f"第 {node.lineno} 行：不能调用 `{func.attr}`，那是沙盒的机关暗门。"
                )
        # 4) 危险属性读取：x.__globals__ 等（哪怕只是读取也拦）
        elif isinstance(node, ast.Attribute):
            if node.attr in BANNED_ATTRS:
                report.add(
                    f"第 {node.lineno} 行：`{node.attr}` 属于被封印的魔法，禁止触碰。"
                )
        # 5) 直接使用危险名字（赋值/引用）
        elif isinstance(node, ast.Name):
            if node.id in BANNED_NAMES:
                report.add(
                    f"第 {node.lineno} 行：`{node.id}` 这个名字被安全规则锁定了。"
                )

    return report


def quick_check(code: str) -> tuple[bool, str]:
    """便捷入口：返回 (是否安全, 合并后的提示文本)。"""
    rep = analyze_code(code)
    return rep.safe, "\n".join(rep.reasons)