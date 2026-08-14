@echo off
cd /d %~dp0
start "" /min node server.js
ping -n 3 127.0.0.1 >nul
start "" "http://localhost:3000"
echo.
echo 服务已启动，工作台已打开。按任意键关闭此窗口。
pause >nul
exit /b
