@echo off
setlocal

set "PROJECT_ROOT=%~dp0"
set "INDEX_PATH=%PROJECT_ROOT%index.html"

if not exist "%INDEX_PATH%" (
  echo PrepDash index.html was not found at "%INDEX_PATH%"
  pause
  exit /b 1
)

set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if exist "%CHROME%" (
  start "" "%CHROME%" "%INDEX_PATH%"
  exit /b 0
)

set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if exist "%CHROME%" (
  start "" "%CHROME%" "%INDEX_PATH%"
  exit /b 0
)

set "CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe"
if exist "%CHROME%" (
  start "" "%CHROME%" "%INDEX_PATH%"
  exit /b 0
)

start "" "%INDEX_PATH%"
