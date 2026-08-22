@echo off
chcp 65001 >nul
cd /d %~dp0
echo 前台运行，服务日志显示在此窗口，Ctrl+C 停止...
node server.js
echo.
echo 服务已退出，按任意键关闭此窗口。
pause >nul
exit /b
