@echo off
cd /d %~dp0
set MCB_SILENT=1
start "" /min node start-ui.js
ping -n 3 127.0.0.1 >nul
set "PWA="
if exist "%USERPROFILE%\Desktop\新媒体内容发布工作台.lnk" set "PWA=%USERPROFILE%\Desktop\新媒体内容发布工作台.lnk"
if not defined PWA if exist "%LOCALAPPDATA%\Microsoft\Windows\Application Shortcuts\新媒体内容发布工作台.lnk" set "PWA=%LOCALAPPDATA%\Microsoft\Windows\Application Shortcuts\新媒体内容发布工作台.lnk"
if defined PWA ( start "" "%PWA%" ) else ( start "" "http://localhost:3000" )
exit /b
