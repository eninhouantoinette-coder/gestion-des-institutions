from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Agence, User, RoleEnum
from app.schemas.ticket import AgenceCreate, AgenceUpdate, AgenceResponse
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/agences", tags=["Agences"])


def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Accès réservé à l'administrateur")
    if not current_user.institution_id:
        raise HTTPException(status_code=400, detail="Admin non rattaché à une institution")
    return current_user


@router.get("", response_model=list[AgenceResponse])
async def list_agences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Admin voit seulement les agences de son institution
    if current_user.role == RoleEnum.admin:
        return db.query(Agence).filter(Agence.institution_id == current_user.institution_id).all()
    # Les autres rôles (agent, manager, directeur) voient les agences de leur institution
    elif current_user.institution_id:
        return db.query(Agence).filter(Agence.institution_id == current_user.institution_id).all()
    # Les clients voient toutes les agences (pour pouvoir choisir)
    return db.query(Agence).all()


@router.get("/{agence_id}", response_model=AgenceResponse)
async def get_agence(
    agence_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Vérifier que l'agence appartient à l'institution de l'utilisateur
    if current_user.role == RoleEnum.admin or current_user.institution_id:
        agence = db.query(Agence).filter(
            Agence.id == agence_id,
            Agence.institution_id == current_user.institution_id
        ).first()
    else:
        agence = db.query(Agence).filter(Agence.id == agence_id).first()
    if not agence:
        raise HTTPException(status_code=404, detail="Agence introuvable")
    return agence


@router.post("", response_model=AgenceResponse, status_code=201)
async def create_agence(
    body: AgenceCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(_require_admin),
):
    # Créer l'agence liée à l'institution de l'admin
    agence_data = body.model_dump()
    agence_data['institution_id'] = admin.institution_id
    agence = Agence(**agence_data)
    db.add(agence)
    db.commit()
    db.refresh(agence)
    return agence


@router.put("/{agence_id}", response_model=AgenceResponse)
async def update_agence(
    agence_id: int,
    body: AgenceUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(_require_admin),
):
    # Ne peut modifier que les agences de son institution
    agence = db.query(Agence).filter(
        Agence.id == agence_id,
        Agence.institution_id == admin.institution_id
    ).first()
    if not agence:
        raise HTTPException(status_code=404, detail="Agence introuvable")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(agence, field, value)
    db.commit()
    db.refresh(agence)
    return agence


@router.delete("/{agence_id}", status_code=204)
async def delete_agence(
    agence_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(_require_admin),
):
    # Ne peut supprimer que les agences de son institution
    agence = db.query(Agence).filter(
        Agence.id == agence_id,
        Agence.institution_id == admin.institution_id
    ).first()
    if not agence:
        raise HTTPException(status_code=404, detail="Agence introuvable")
    db.delete(agence)
    db.commit()
