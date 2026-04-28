@echo off
chcp 65001 > nul
echo ====================================================
echo      Lancement de la Plateforme BanqueQueue
echo ====================================================
echo.

echo 1. Verification de la base de donnees (MySQL/XAMPP)...
cd backend
if not exist "venv" (
    echo [INFO] Environnement virtuel non trouve, creation...
    python -m venv venv
)
call .\venv\Scripts\activate
:: On essaie d'installer pymysql juste pour ce script
python -m pip install pymysql > nul 2>&1
python setup_db.py
echo.

echo 2. Installation des dependances (peut prendre un moment la 1ere fois)...
echo    [INFO] Installation Backend...
python -m pip install -r requirements.txt
echo    [INFO] Installation Frontend...
cd ../frontend
call npm install
cd ..
echo.

echo 3. Démarrage des serveurs...
echo    [START] Lancement du Backend FastAPI...
start "BanqueQueue - Backend (API)" cmd /k "cd backend && .\venv\Scripts\activate && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo    [START] Lancement du Frontend React...
start "BanqueQueue - Frontend (React)" cmd /k "cd frontend && npm start"

echo.
echo ====================================================
echo ✅ Succès ! Les deux serveurs sont en cours de lancement.
echo.
echo - Le backend sera disponible sur : http://localhost:8000/docs
echo - Le frontend sera disponible sur : http://localhost:3000
echo ====================================================
pause
