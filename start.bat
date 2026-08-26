@echo off
chcp 65001 >nul 2>&1
echo ============================================
echo   小码星球 K12 AI 编程乐园 - 一键启动
echo ============================================
echo.

set PROJECT_DIR=%~dp0
set VENV_PY=%PROJECT_DIR%.venv\Scripts\python.exe

if not exist "%VENV_PY%" (
    echo   [错误] 未找到虚拟环境 .venv\Scripts\python.exe
    echo   请先执行:  python -m venv .venv ^&^& .venv\Scripts\pip install -r requirements.txt
    pause
    exit /b 1
)

echo [1/5] 检查 Redis ...
redis-cli ping >nul 2>&1
if %errorlevel% neq 0 (
    echo   Redis 未运行！请先启动 redis-server
    pause
    exit /b 1
)
echo   Redis OK

if not exist "%PROJECT_DIR%.env" (
    echo   [提示] 未找到 .env，AI 老师无法工作。请复制 .env.example 为 .env 并填入密钥。
)

echo [2/5] 启动沙箱 Worker ...
start "小码 Worker" /MIN cmd /c "cd /d %PROJECT_DIR%backend && %VENV_PY% worker.py"
echo   Worker 已启动

echo [3/5] 启动后端 API (port 8000) ...
start "小码 API" /MIN cmd /c "cd /d %PROJECT_DIR%backend && %VENV_PY% -m uvicorn main:app --host 0.0.0.0 --port 8000 --log-level warning"
echo   后端已启动

echo [4/5] 启动前端 (port 5173) ...
start "小码前端" /MIN cmd /c "cd /d %PROJECT_DIR%frontend && npx vite --host"
echo   前端已启动

echo [5/5] 打开浏览器 ...
start http://localhost:5173

echo.
echo ============================================
echo   全部启动完成！浏览器已自动打开：
echo   http://localhost:5173
echo ============================================
echo.
echo   按任意键关闭所有服务...
pause >nul

taskkill /FI "WINDOWTITLE eq 小码*" /F >nul 2>&1
echo 已关闭所有服务。
