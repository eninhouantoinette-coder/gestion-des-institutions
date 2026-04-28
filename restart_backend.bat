@echo off
echo [INFO] Arret des processus Python...
taskkill /F /IM python.exe 2>nul
taskkill /F /IM uvicorn.exe 2>nul
timeout /t 2 /nobreak >nul
echo [INFO] Demarrage du backend sur port 8000...
cd /d c:\xampp\htdocs\finance\backend
.\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
echo [OK] Backend arrete.
pause
