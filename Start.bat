@echo off
cd /d %~dp0
wscript //nologo "%~dp0start-hidden.vbs"
ping -n 3 127.0.0.1 >nul
start "" "http://localhost:3000"
exit /b
