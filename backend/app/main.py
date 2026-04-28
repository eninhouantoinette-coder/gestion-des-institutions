from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy.orm import Session
import os
from dotenv import load_dotenv

load_dotenv()

from app.database import create_tables, get_db
from app.websocket.manager import manager
from app.routers import (
    auth, users, institutions, agences, services, creneaux,
    rendezvous, tickets, taches, notifications,
    statistiques, predictions, admin,
)

scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ─── Startup ───────────────────────────────────────────────────
    create_tables()
    _seed_default_config()

    # Planification réentraînement ML chaque nuit à 02h00
    from app.services.prediction_service import retrain_models
    from app.database import SessionLocal

    def nightly_retrain():
        db = SessionLocal()
        try:
            retrain_models(db)
        finally:
            db.close()

    scheduler.add_job(nightly_retrain, "cron", hour=2, minute=0)
    scheduler.start()
    print("[OK] BanqueQueue API demarree")
    yield
    # ─── Shutdown ──────────────────────────────────────────────────
    scheduler.shutdown(wait=False)
    print("[STOP] BanqueQueue API arretee")


app = FastAPI(
    title="BanqueQueue API",
    description="Système de gestion de files d'attente et rendez-vous bancaires",
    version="1.0.0",
    lifespan=lifespan,
)

# Endpoint de santé pour vérifier que l'API fonctionne
@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "API is running"}

# ─── CORS ──────────────────────────────────────────────────────────────────
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
# Détecter automatiquement toutes les origines possibles du frontend
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://192.168.56.1:3001",
    "http://192.168.1.100:3001",
    "http://10.0.0.2:3001",
    # Ajouter plus d'origines locales possibles
    "http://localhost:3002",
    "http://127.0.0.1:3002",
    "http://localhost:5173",  # Vite default port
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Origines spécifiques (requis avec allow_credentials=True)
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# ─── Routers ───────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(institutions.router)
app.include_router(agences.router)
app.include_router(services.router)
app.include_router(creneaux.router)
app.include_router(rendezvous.router)
app.include_router(tickets.router)
app.include_router(taches.router)
app.include_router(notifications.router)
app.include_router(statistiques.router)
app.include_router(predictions.router)
app.include_router(admin.router)


# ─── WebSocket endpoints ────────────────────────────────────────────────────

@app.websocket("/ws/file/{agence_id}")
async def ws_file(websocket: WebSocket, agence_id: int):
    # Accept with explicit origin check
    await websocket.accept()
    channel = f"file/{agence_id}"
    await manager.connect(websocket, channel)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)


@app.websocket("/ws/notifications/{user_id}")
async def ws_notifications(websocket: WebSocket, user_id: int):
    await websocket.accept()
    channel = f"notifications/{user_id}"
    await manager.connect(websocket, channel)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)


@app.websocket("/ws/dashboard/{role}")
async def ws_dashboard(websocket: WebSocket, role: str):
    await websocket.accept()
    channel = f"dashboard/{role}"
    await manager.connect(websocket, channel)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)


@app.websocket("/ws/dashboard/{role}/{agence_id}")
async def ws_dashboard_agence(websocket: WebSocket, role: str, agence_id: int):
    """Canal dashboard spécifique par rôle et agence pour managers/agents"""
    await websocket.accept()
    channel = f"dashboard/{role}/{agence_id}"
    await manager.connect(websocket, channel)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)


# ─── Health check ────────────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
async def root():
    return {
        "status": "ok",
        "app": "BanqueQueue API",
        "version": "1.0.0",
        "docs": "/docs",
        "ws_channels": manager.get_stats(),
    }


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy"}


# ─── Config par défaut ───────────────────────────────────────────────────────

def _seed_default_config():
    from app.database import SessionLocal
    from app.models import SystemConfig
    db = SessionLocal()
    defaults = [
        ("seuil_file_attente", "20", "Seuil d'alerte pour la file d'attente"),
        ("duree_session_minutes", "60", "Durée de session JWT en minutes"),
        ("notifications_email", "true", "Activer les notifications email"),
        ("max_rdv_par_jour", "10", "Nombre maximum de RDV par client par jour"),
    ]
    for cle, valeur, desc in defaults:
        existing = db.query(SystemConfig).filter(SystemConfig.cle == cle).first()
        if not existing:
            db.add(SystemConfig(cle=cle, valeur=valeur, description=desc))
    db.commit()
    db.close()
