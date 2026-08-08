@echo off
cd /d %~dp0
node start-ui.js
exit /b %errorlevel%
