# Script pour redémarrer le backend
Write-Host "Arret des processus Python..." -ForegroundColor Yellow
taskkill /F /IM python.exe 2>$null
Start-Sleep -Seconds 2

Write-Host "Demarrage du backend..." -ForegroundColor Green
cd c:\xampp\htdocs\finance\backend
.\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
