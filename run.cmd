@echo off
setlocal
if /i "%~1"=="recover" (
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0.ctfl-recovery\recover.ps1" %2
  exit /b
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\run-web.ps1"
if errorlevel 1 (
  pause
  exit /b 1
)
