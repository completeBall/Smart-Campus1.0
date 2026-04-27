$root = Split-Path -Parent $MyInvocation.MyCommand.Path

$backendPath = Join-Path $root "backend"
$frontendPath = Join-Path $root "frontend"

if (-not (Test-Path (Join-Path $backendPath "app.js"))) {
    Write-Host "[ERROR] backend\app.js not found." -ForegroundColor Red
    Write-Host "Please place this file in the smart-campus root folder."
    Read-Host "Press Enter to exit"
    exit 1
}

if (-not (Test-Path (Join-Path $frontendPath "package.json"))) {
    Write-Host "[ERROR] frontend\package.json not found." -ForegroundColor Red
    Write-Host "Please place this file in the smart-campus root folder."
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[1/2] Starting backend..." -ForegroundColor Cyan
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "cd /d `"$backendPath`" && npm start" -WindowStyle Normal

Write-Host "Waiting 3 seconds for backend..." -ForegroundColor DarkGray
Start-Sleep -Seconds 3

Write-Host "[2/2] Starting frontend..." -ForegroundColor Cyan
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "cd /d `"$frontendPath`" && npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "  Done! Services started." -ForegroundColor Green
Write-Host "  Backend : http://localhost:3000" -ForegroundColor Green
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to close this window"
