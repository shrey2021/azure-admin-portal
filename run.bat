@echo off
title Azure Admin Portal Launcher
echo ==========================================================
echo  Starting Azure Admin ^& Operations Portal...
echo ==========================================================
cd /d "%~dp0"

if not exist "venv\Scripts\python.exe" (
    echo [*] Creating virtual environment...
    python -m venv venv
    echo [*] Installing dependencies...
    venv\Scripts\python.exe -m pip install --upgrade pip
    venv\Scripts\python.exe -m pip install -r requirements.txt
)

if not exist ".env" (
    echo [*] Initializing .env from template...
    copy .env.example .env
)

echo.
echo [+] Starting server at http://localhost:8000
start http://localhost:8000
venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
pause
