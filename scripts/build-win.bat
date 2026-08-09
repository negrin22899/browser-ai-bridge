@echo off
echo ========================================
echo Browser AI Bridge - Build Windows Installer
echo ========================================
echo.

echo [1/4] Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    exit /b 1
)

echo.
echo [2/4] Building project...
call npm run build
if errorlevel 1 (
    echo ERROR: Failed to build project
    exit /b 1
)

echo.
echo [3/4] Building desktop app...
cd apps\desktop
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install desktop dependencies
    exit /b 1
)

echo.
echo [4/4] Creating Windows installer...
call npm run build:win
if errorlevel 1 (
    echo ERROR: Failed to create installer
    exit /b 1
)

echo.
echo ========================================
echo BUILD SUCCESSFUL!
echo ========================================
echo.
echo Installer location: apps\desktop\release\
echo.
echo Files created:
dir /b release\*.exe 2>nul
echo.
pause
