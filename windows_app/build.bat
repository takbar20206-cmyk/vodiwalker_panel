@echo off
REM ============================================================
REM VodiWalker Toolkit — ساخت exe و نصب‌کننده روی ویندوز
REM پیش‌نیاز: Python 3.11+ و Inno Setup 6
REM اجرا از پوشه windows_app:
REM   build.bat
REM ============================================================
setlocal
cd /d "%~dp0"

echo [1/4] Installing Python dependencies...
py -3 -m pip install --upgrade pip
py -3 -m pip install -r requirements.txt
if errorlevel 1 goto :fail

echo [2/4] Running smoke test...
set QT_QPA_PLATFORM=offscreen
py -3 smoke_test.py
if errorlevel 1 goto :fail

echo [3/4] Building executable with PyInstaller...
py -3 -m PyInstaller --noconfirm --distpath ..\dist --workpath ..\build VodiWalkerToolkit.spec
if errorlevel 1 goto :fail

echo [4/4] Building installer with Inno Setup...
if exist "%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe" (
    "%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe" installer.iss
) else if exist "%ProgramFiles%\Inno Setup 6\ISCC.exe" (
    "%ProgramFiles%\Inno Setup 6\ISCC.exe" installer.iss
) else (
    echo Inno Setup 6 not found - skipping installer. https://jrsoftware.org/isdl.php
)

echo.
echo DONE.
echo   Portable  : ..\dist\VodiWalkerToolkit\VodiWalkerToolkit.exe
echo   Installer : ..\dist\VodiWalker-Toolkit-Setup-1.0.0.exe
exit /b 0

:fail
echo BUILD FAILED
exit /b 1
