@echo off
chcp 65001 >nul
cd /d %~dp0
title 新媒体内容发布工作台
echo.
echo ==============================================
echo        新媒体内容发布工作台
echo ==============================================
echo.

REM 调用 start-service.js（端口检测 + 后台启动 + 等待）
node start-service.js
if errorlevel 1 (
  echo.
  pause
  exit /b 1
)

echo.
echo   打开浏览器...
start "" "http://localhost:3000"
echo.
echo ==============================================
echo   工作台已就绪！
echo   服务在后台独立运行，可以直接关闭此窗口
echo   停止服务：任务管理器 ^> 结束 node.exe 进程
echo ==============================================
echo.
pause
