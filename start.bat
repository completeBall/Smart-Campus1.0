@echo off
chcp 65001 >nul
set "ROOT=%~dp0"

echo ==========================================
echo   Smart Campus - Start Backend + Frontend
echo ==========================================
echo.

if not exist "%ROOT%backend\app.js" (
  echo [ERROR] backend\app.js not found.
  echo Please place this file in the smart-campus root folder.
  pause
  exit /b 1
)

if not exist "%ROOT%frontend\package.json" (
  echo [ERROR] frontend\package.json not found.
  echo Please place this file in the smart-campus root folder.
  pause
  exit /b 1
)

echo [1/2] Starting backend...
start "Backend" /d "%ROOT%backend" cmd /k "npm start"

echo Waiting 3 seconds for backend...
ping -n 4 127.0.0.1 > nul

echo [2/2] Starting frontend...
start "Frontend" /d "%ROOT%frontend" cmd /k "npm run dev"

echo.
echo ==========================================
echo  Done! Services started.
echo  Backend : http://localhost:3000
echo  Frontend: http://localhost:5173
echo ==========================================
echo.
pause
