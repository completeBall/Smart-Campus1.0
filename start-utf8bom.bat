@echo off
title 智慧校园一键启动
echo ==========================================
echo      智慧校园系统 - 一键启动脚本
echo ==========================================
echo.

set "BASE_DIR=%~dp0"

if not exist "%BASE_DIR%backend\app.js" (
  echo [错误] 未找到后端文件: backend\app.js
  echo 请将此脚本放在 smart-campus 根目录下运行。
  pause
  exit /b 1
)

if not exist "%BASE_DIR%frontend\package.json" (
  echo [错误] 未找到前端文件: frontend\package.json
  echo 请将此脚本放在 smart-campus 根目录下运行。
  pause
  exit /b 1
)

echo [1/2] 正在启动后端服务...
start "智慧校园后端" /d "%BASE_DIR%backend" cmd /k "npm start"

echo [等待] 等待后端初始化 (3秒)...
timeout /t 3 /nobreak >nul

echo [2/2] 正在启动前端服务...
start "智慧校园前端" /d "%BASE_DIR%frontend" cmd /k "npm run dev"

echo.
echo ==========================================
echo  前后端服务启动命令已发送！
echo ==========================================
echo.
echo  后端地址: http://localhost:3000
echo  前端地址: http://localhost:5173
echo  API代理: /api => http://localhost:3000
echo.
echo  后端窗口标题: 智慧校园后端
echo  前端窗口标题: 智慧校园前端
echo.
echo  按任意键关闭此窗口（不会影响已启动的服务）
pause >nul
