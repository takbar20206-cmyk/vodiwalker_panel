@echo off
chdir /d "%~dp0"
title School Life: Open Campus
echo ============================================
echo   School Life: Open Campus
echo   Starting local server on http://localhost:8080
echo   Close this window to stop the server.
echo ============================================
start "" http://localhost:8080
where python >nul 2>nul
if %errorlevel%==0 (
  python -m http.server 8080
) else (
  where py >nul 2>nul
  if %errorlevel%==0 (
    py -m http.server 8080
  ) else (
    echo [ERROR] Python not found! Install it from https://www.python.org/downloads/
    pause
  )
)
