from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Notification, Alerte, User, RoleEnum, StatutNotifEnum
from app.schemas.tache import (
    NotificationCreate, NotificationResponse, AlerteCreate, AlerteResponse
)
from app.services.auth_service import get_current_user
from app.services.notification_service import creer_notification, creer_alerte
from datetime import datetime

router = APIRouter(tags=["Notifications & Alertes"])


# ─── Notifications ─────────────────────────────────────────────────────────

@router.get("/notifications", response_model=list[NotificationResponse])
async def mes_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
        .all()
    )


@router.put("/notifications/{notif_id}/lu", response_model=NotificationResponse)
async def marquer_lue(
    notif_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notif = db.query(Notification).filter(
        Notification.id == notif_id,
        Notification.user_id == current_user.id,
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification introuvable")
    notif.statut = StatutNotifEnum.lue
    db.commit()
    db.refresh(notif)
    return notif

@router.put("/notifications/{notif_id}/lire", response_model=NotificationResponse)
async def marquer_lire(
    notif_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await marquer_lue(notif_id, db, current_user)


@router.put("/notifications/tout-lu")
async def tout_marquer_lu(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.statut != StatutNotifEnum.lue
    ).update({Notification.statut: StatutNotifEnum.lue})
    db.commit()
    return {"message": "Toutes les notifications marquées comme lues"}


@router.delete("/notifications/{notif_id}", status_code=204)
async def delete_notification(
    notif_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notif = db.query(Notification).filter(
        Notification.id == notif_id,
        Notification.user_id == current_user.id,
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification introuvable")
    db.delete(notif)
    db.commit()


@router.post("/notifications/envoyer", response_model=NotificationResponse, status_code=201)
async def envoyer_notification(
    body: NotificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in [RoleEnum.admin, RoleEnum.manager]:
        raise HTTPException(status_code=403, detail="Accès interdit")
    notif = await creer_notification(db, body.user_id, body.message, body.type, body.lien)
    return notif


# ─── Alertes ───────────────────────────────────────────────────────────────

@router.get("/alertes", response_model=list[AlerteResponse])
async def list_alertes(
    agence_id: int = None,
    statut: str = "active",  # "active", "resolue", "toutes"
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in [RoleEnum.admin, RoleEnum.manager, RoleEnum.directeur]:
        raise HTTPException(status_code=403, detail="Accès interdit")
    
    # Construction de la requête
    query = db.query(Alerte)
    
    # Filtrer par statut
    if statut == "active":
        query = query.filter(Alerte.statut.in_(["active", "nouvelle"]))
    elif statut == "resolue":
        query = query.filter(Alerte.statut == "resolue")
    # Si "toutes", on ne filtre pas par statut
    
    # Filtrer par agence si spécifié
    if agence_id:
        query = query.filter(Alerte.agence_id == agence_id)
    # Sinon, si manager/directeur, filtrer par sa propre agence par défaut
    elif current_user.agence_id and current_user.role in [RoleEnum.manager, RoleEnum.directeur]:
        query = query.filter(Alerte.agence_id == current_user.agence_id)
    
    result = query.order_by(Alerte.created_at.desc()).all()
    return result


@router.post("/alertes", response_model=AlerteResponse, status_code=201)
async def create_alerte(
    body: AlerteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in [RoleEnum.admin, RoleEnum.manager]:
        raise HTTPException(status_code=403, detail="Accès interdit")
    alerte = await creer_alerte(db, body.type, body.message, body.niveau, body.agence_id, body.user_id)
    return alerte


@router.post("/alertes/test", response_model=AlerteResponse, status_code=201)
async def create_alerte_test(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Endpoint de test pour créer une alerte manuellement"""
    if current_user.role not in [RoleEnum.admin, RoleEnum.manager]:
        raise HTTPException(status_code=403, detail="Accès interdit")
    
    print(f"[DEBUG] Création alerte test pour agence {current_user.agence_id}")
    alerte = await creer_alerte(
        db,
        type_alerte="surcharge",
        message="Surcharge détectée (MOYEN) - 5 tickets en attente ~75 min d'attente estimée",
        niveau=NiveauAlerteEnum.moyen,
        agence_id=current_user.agence_id,
    )
    print(f"[DEBUG] Alerte test créée: ID={alerte.id}")
    return alerte


@router.put("/alertes/{alerte_id}/resoudre", response_model=AlerteResponse)
async def resoudre_alerte(
    alerte_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in [RoleEnum.admin, RoleEnum.manager, RoleEnum.directeur]:
        raise HTTPException(status_code=403, detail="Accès interdit")
    alerte = db.query(Alerte).filter(Alerte.id == alerte_id).first()
    if not alerte:
        raise HTTPException(status_code=404, detail="Alerte introuvable")
    alerte.statut = "resolue"
    alerte.resolved_at = datetime.utcnow()
    db.commit()
    db.refresh(alerte)
    return alerte
