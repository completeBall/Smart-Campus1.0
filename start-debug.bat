@echo off
set "LOG=%~dp0start-debug.log"
echo [%date% %time%] 脚本开始运行 > "%LOG%"
echo [%date% %time%] 当前目录: %~dp0 >> "%LOG%"

echo 正在检查环境，请稍候...
echo [%date% %time%] 检查 node 是否存在 >> "%LOG%"
where node >> "%LOG%" 2>&1
if %errorlevel% neq 0 (
  echo [错误] 未找到 node，请先安装 Node.js 并配置环境变量
  echo [%date% %time%] 错误: 未找到 node >> "%LOG%"
  pause
  exit /b 1
)

echo [%date% %time%] 检查后端目录 >> "%LOG%"
if not exist "%~dp0backend\app.js" (
  echo [错误] 未找到 backend\app.js
  echo [%date% %time%] 错误: 未找到 backend\app.js >> "%LOG%"
  pause
  exit /b 1
)

echo [%date% %time%] 检查前端目录 >> "%LOG%"
if not exist "%~dp0frontend\package.json" (
  echo [错误] 未找到 frontend\package.json
  echo [%date% %time%] 错误: 未找到 frontend\package.json >> "%LOG%"
  pause
  exit /b 1
)

echo [%date% %time%] 启动后端... >> "%LOG%"
echo 正在启动后端...
start "smart-campus-backend" /d "%~dp0backend" cmd /k "npm start"

echo [%date% %time%] 等待3秒... >> "%LOG%"
ping -n 4 127.0.0.1 > nul

echo [%date% %time%] 启动前端... >> "%LOG%"
echo 正在启动前端...
start "smart-campus-frontend" /d "%~dp0frontend" cmd /k "npm run dev"

echo [%date% %time%] 启动完成 >> "%LOG%"
echo.
echo ==========================================
echo  启动完成！
echo  后端: http://localhost:3000
echo  前端: http://localhost:5173
echo ==========================================
echo.
echo 如果没看到新窗口弹出，请检查:
echo 1. 是否有杀毒软件拦截了脚本
echo 2. 右键此文件 -> 属性，看是否有"解除锁定"按钮
echo 3. 查看生成的日志: start-debug.log
pause
