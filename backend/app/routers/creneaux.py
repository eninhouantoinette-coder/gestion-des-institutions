from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models import Creneau, User, RoleEnum
from app.schemas.rendezvous import CreneauCreate, CreneauUpdate, CreneauResponse
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/creneaux", tags=["Créneaux"])


@router.get("", response_model=list[CreneauResponse])
async def list_creneaux(
    agence_id: Optional[int] = None,
    service_id: Optional[int] = None,
    date: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Creneau)
    if agence_id:
        query = query.filter(Creneau.agence_id == agence_id)
    if service_id:
        query = query.filter(Creneau.service_id == service_id)
    if date:
        query = query.filter(Creneau.date == date)
    return query.order_by(Creneau.date, Creneau.heure_debut).all()


@router.post("", response_model=CreneauResponse, status_code=201)
async def create_creneau(
    body: CreneauCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in [RoleEnum.admin, RoleEnum.manager]:
        raise HTTPException(status_code=403, detail="Accès interdit")
    c = Creneau(**body.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


@router.put("/{creneau_id}", response_model=CreneauResponse)
async def update_creneau(
    creneau_id: int,
    body: CreneauUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in [RoleEnum.admin, RoleEnum.manager]:
        raise HTTPException(status_code=403, detail="Accès interdit")
    c = db.query(Creneau).filter(Creneau.id == creneau_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Créneau introuvable")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(c, field, value)
    db.commit()
    db.refresh(c)
    return c


@router.delete("/{creneau_id}", status_code=204)
async def delete_creneau(
    creneau_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in [RoleEnum.admin, RoleEnum.manager]:
        raise HTTPException(status_code=403, detail="Accès interdit")
    c = db.query(Creneau).filter(Creneau.id == creneau_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Créneau introuvable")
    db.delete(c)
    db.commit()
