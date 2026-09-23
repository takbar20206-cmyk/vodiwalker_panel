@echo off
chdir /d "%~dp0"
title School Life: Open Campus
echo ============================================
echo   School Life: Open Campus
echo   http://localhost:8080  (server is no-cache:
echo   you always get the newest version)
echo   Close this window to stop the server.
echo ============================================
where python >nul 2>nul
if %errorlevel%==0 (
  python serve.py --open
  goto :eof
)
where py >nul 2>nul
if %errorlevel%==0 (
  py serve.py --open
  goto :eof
)
echo [ERROR] Python not found! Install it from https://www.python.org/downloads/
pause
