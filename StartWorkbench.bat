@echo off
cd /d %~dp0
start "" /min node server.js
ping -n 3 127.0.0.1 >nul
start "" "http://localhost:3000"
exit /b
