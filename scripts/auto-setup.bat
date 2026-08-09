@echo off
echo ========================================
echo Browser AI Bridge - Auto Setup
echo ========================================
echo.
echo This will automatically set up everything you need.
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo NOTE: Some features may require administrator privileges.
    echo.
)

echo [1/6] Checking system requirements...
echo.

REM Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found!
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo After installing, run this script again.
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js %NODE_VERSION% found

REM Check Chrome
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    echo [OK] Chrome found
) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    echo [OK] Chrome found
) else (
    echo [WARNING] Chrome not found
    echo.
    echo Chrome is required for Browser AI Bridge to work.
    echo Download from: https://www.google.com/chrome/
    echo.
    set /p CONTINUE="Continue anyway? (y/n): "
    if /i not "%CONTINUE%"=="y" exit /b 1
)

echo.
echo [2/6] Installing dependencies...
echo.
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    echo.
    echo Try running as administrator or check your internet connection.
    pause
    exit /b 1
)

echo.
echo [3/6] Building project...
echo.
call npm run build
if errorlevel 1 (
    echo ERROR: Failed to build project
    pause
    exit /b 1
)

echo.
echo [4/6] Verifying installation...
echo.
node apps/cli/dist/index.js doctor
if errorlevel 1 (
    echo.
    echo WARNING: Some checks failed. The app may still work.
)

echo.
echo [5/6] Creating shortcuts...

REM Create desktop shortcut for CLI
echo @echo off > "%USERPROFILE%\Desktop\Browser AI Bridge CLI.bat"
echo cd /d "%~dp0" >> "%USERPROFILE%\Desktop\Browser AI Bridge CLI.bat"
echo node apps/cli/dist/index.js serve --site gemini >> "%USERPROFILE%\Desktop\Browser AI Bridge CLI.bat"
echo pause >> "%USERPROFILE%\Desktop\Browser AI Bridge CLI.bat"

echo [OK] Desktop shortcut created

echo.
echo [6/6] Setup complete!
echo.
echo ========================================
echo SETUP SUCCESSFUL!
echo ========================================
echo.
echo Next steps:
echo.
echo 1. Open Chrome and sign in to your AI:
echo    - Gemini: https://gemini.google.com
echo    - ChatGPT: https://chatgpt.com
echo    - Claude: https://claude.ai
echo.
echo 2. Start the server:
echo    - Double-click "Browser AI Bridge CLI" on your desktop
echo    - OR run: node apps/cli/dist/index.js serve --site gemini
echo.
echo 3. Configure your IDE:
echo    - API URL: http://localhost:3000/v1/chat/completions
echo    - Model: gemini
echo.
echo For more help, see USER_GUIDE.md
echo.
pause
