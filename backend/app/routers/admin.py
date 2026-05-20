from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import csv
import io
from app.database import get_db
from app.models import Log, SystemConfig, User, Ticket, Alerte, RoleEnum
from app.services.auth_service import get_current_user
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/admin", tags=["Administration"])


def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Accès réservé à l'administrateur")
    return current_user


@router.get("/dashboard")
async def dashboard(
    db: Session = Depends(get_db),
    _: User = Depends(_require_admin),
):
    return {
        "total_users": db.query(User).count(),
        "users_actifs": db.query(User).filter(User.statut == "actif").count(),
        "tickets_en_attente": db.query(Ticket).filter(Ticket.statut == "en_attente").count(),
        "alertes_actives": db.query(Alerte).filter(Alerte.statut == "active").count(),
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/logs")
async def list_logs(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, le=200),
    user_id: Optional[int] = None,
    action: Optional[str] = None,
    date_debut: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(_require_admin),
):
    query = db.query(Log)
    if user_id:
        query = query.filter(Log.user_id == user_id)
    if action:
        query = query.filter(Log.action.ilike(f"%{action}%"))
    if date_debut:
        query = query.filter(Log.created_at >= date_debut)
    total = query.count()
    logs = query.order_by(Log.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return {
        "total": total,
        "page": page,
        "items": [
            {
                "id": l.id,
                "user_id": l.user_id,
                "action": l.action,
                "description": l.description,
                "ip_address": l.ip_address,
                "created_at": l.created_at,
            }
            for l in logs
        ],
    }


@router.get("/logs/export")
async def export_logs_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in [RoleEnum.admin, RoleEnum.directeur]:
        raise HTTPException(status_code=403, detail="Accès interdit")
    logs = db.query(Log).order_by(Log.created_at.desc()).limit(5000).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "User ID", "Action", "Description", "IP", "Date"])
    for l in logs:
        writer.writerow([l.id, l.user_id, l.action, l.description, l.ip_address, l.created_at])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=logs_export.csv"},
    )


@router.get("/config")
async def get_config(
    db: Session = Depends(get_db),
    _: User = Depends(_require_admin),
):
    configs = db.query(SystemConfig).all()
    return {c.cle: c.valeur for c in configs}


@router.put("/config/{cle}")
async def update_config(
    cle: str,
    valeur: str,
    db: Session = Depends(get_db),
    _: User = Depends(_require_admin),
):
    config = db.query(SystemConfig).filter(SystemConfig.cle == cle).first()
    if config:
        config.valeur = valeur
    else:
        config = SystemConfig(cle=cle, valeur=valeur)
        db.add(config)
    db.commit()
    return {"cle": cle, "valeur": valeur}


@router.delete("/logs/purge")
async def purge_logs(
    days: int = Query(30, ge=1, description="Nombre de jours à conserver"),
    db: Session = Depends(get_db),
    _: User = Depends(_require_admin),
):
    from datetime import timedelta
    cutoff = datetime.utcnow() - timedelta(days=days)
    deleted = db.query(Log).filter(Log.created_at < cutoff).delete()
    db.commit()
    return {"deleted": deleted, "message": f"{deleted} logs supprimés"}


@router.post("/config/reset")
async def reset_config(
    db: Session = Depends(get_db),
    _: User = Depends(_require_admin),
):
    db.query(SystemConfig).delete()
    
    default_configs = {
        "seuil_file_attente": "20",
        "duree_session_minutes": "30",
        "notifications_email": "false",
        "max_rdv_par_jour": "5",
    }
    
    for cle, valeur in default_configs.items():
        config = SystemConfig(cle=cle, valeur=valeur)
        db.add(config)
    
    db.commit()
    return {"message": "Configuration réinitialisée", "config": default_configs}
