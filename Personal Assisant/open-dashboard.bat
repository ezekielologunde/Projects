@echo off
setlocal

set "PROJECT_ROOT=%~dp0"
set "SERVER_PATH=%PROJECT_ROOT%automation\dashboard-server\server.js"
set "DASHBOARD_URL=http://127.0.0.1:47832"

echo Starting local dashboard server (if not already running)...
start "PersonalAssistantDashboard" /min cmd /c "node "%SERVER_PATH%""

REM Give the server a moment to bind before opening the browser.
timeout /t 2 /nobreak >nul

set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if exist "%CHROME%" (
  start "" "%CHROME%" "%DASHBOARD_URL%"
  exit /b 0
)

set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if exist "%CHROME%" (
  start "" "%CHROME%" "%DASHBOARD_URL%"
  exit /b 0
)

set "CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe"
if exist "%CHROME%" (
  start "" "%CHROME%" "%DASHBOARD_URL%"
  exit /b 0
)

start "" "%DASHBOARD_URL%"
