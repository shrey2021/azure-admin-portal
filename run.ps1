# Azure Admin & Operations Portal - Windows PowerShell Quickstart
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Starting Azure Admin & Operations Portal..." -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# Check virtual environment
if (-not (Test-Path "$ScriptDir\venv\Scripts\python.exe")) {
    Write-Host "[*] Creating virtual environment (venv)..." -ForegroundColor Yellow
    python -m venv venv
    Write-Host "[*] Installing dependencies from requirements.txt..." -ForegroundColor Yellow
    .\venv\Scripts\python.exe -m pip install --upgrade pip
    .\venv\Scripts\python.exe -m pip install -r requirements.txt
}

# Create .env if not exists
if (-not (Test-Path "$ScriptDir\.env")) {
    Write-Host "[*] Initializing .env from .env.example (Demo Mode enabled by default)..." -ForegroundColor Yellow
    Copy-Item "$ScriptDir\.env.example" "$ScriptDir\.env"
}

Write-Host "`n[+] Starting FastAPI Web Server at http://localhost:8000" -ForegroundColor Green
Write-Host "[+] Press Ctrl+C in this window to stop the server." -ForegroundColor Gray
Write-Host "----------------------------------------------------------" -ForegroundColor DarkGray

# Launch browser and server
Start-Process "http://localhost:8000"
.\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
