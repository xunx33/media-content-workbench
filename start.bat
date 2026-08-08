@echo off
chcp 65001 >nul
title 新媒体内容发布工作台
echo.
echo ==============================================
echo        新媒体内容发布工作台
echo ==============================================
echo.

REM 检查 3000 端口是否已被占用（避免重复启动）
netstat -ano ^| findstr ":3000 " ^| findstr LISTENING >nul
if not errorlevel 1 goto already_running

REM 用 node 启动 server.js 为独立后台进程（cmd 关闭不影响）
echo   正在启动 Node.js 服务（后台模式）...
node -e "require(\"child_process\").spawn(\"node\",[\"server.js\"],{detached:true,stdio:\"ignore\",cwd:process.cwd()}).unref()"

REM 等待服务启动（最多 5 秒）
echo   等待服务就绪...
set /a count=0
:wait_loop
set /a count+=1
netstat -ano ^| findstr ":3000 " ^| findstr LISTENING >nul
if not errorlevel 1 goto ready
if %count% lss 10 goto wait_loop
echo.
echo   [警告] 服务启动超时，请检查 Node.js 是否安装
pause
exit /b 1

:already_running
echo   [跳过] 3000 端口已被占用，服务可能已在运行

:ready
echo.
echo   [OK] 服务已在后台运行
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
