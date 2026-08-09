@echo off
cd /d %~dp0
set MCB_SILENT=1
start "" /min node start-ui.js
exit /b
