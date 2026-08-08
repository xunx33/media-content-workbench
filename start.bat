@echo off
chcp 65001 >nul
cd /d %~dp0
title 新媒体内容发布工作台
echo.
echo ==============================================
echo        新媒体内容发布工作台
echo ==============================================
echo.

set PORT=3000
if not "%~1"=="" set PORT=%~1
node start-service.js
if errorlevel 1 goto end_fail

echo   打开浏览器...
start "" "http://localhost:%PORT%"
echo.
echo ==============================================
echo   工作台已就绪！
echo   服务在后台独立运行，可以直接关闭此窗口
echo ==============================================
echo.
echo 按任意键关闭此窗口...
pause >nul
exit /b 0

:end_fail
echo.
echo 按任意键关闭此窗口...
pause >nul
exit /b 1
