@echo off
cd /d %~dp0
echo 前台启动服务，日志将显示在此窗口（Ctrl+C 停止）...
node server.js
echo.
echo 服务已退出。按任意键关闭此窗口。
pause >nul
exit /b
