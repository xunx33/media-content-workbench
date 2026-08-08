@echo off
chcp 65001 >nul
title 新媒体内容发布工作台
echo.
echo ==============================================
echo        新媒体内容发布工作台
echo        正在启动本地服务...
echo ==============================================
echo.

REM 自动打开浏览器（默认浏览器）
start "" "http://localhost:3000" 2>nul

REM 启动 Node.js 服务（前台运行，关闭即停止）
node server.js

pause
