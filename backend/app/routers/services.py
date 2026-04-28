from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Service, User, RoleEnum
from app.schemas.ticket import ServiceCreate, ServiceUpdate, ServiceResponse
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/services", tags=["Services"])


def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Accès réservé à l'administrateur")
    if not current_user.institution_id:
        raise HTTPException(status_code=400, detail="Admin non rattaché à une institution")
    return current_user


@router.get("", response_model=list[ServiceResponse])
async def list_services(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Admin voit seulement les services de son institution
    if current_user.role == RoleEnum.admin:
        return db.query(Service).filter(Service.institution_id == current_user.institution_id).all()
    # Les autres rôles (agent, manager, directeur) voient les services de leur institution
    elif current_user.institution_id:
        return db.query(Service).filter(Service.institution_id == current_user.institution_id).all()
    # Les clients voient tous les services (pour pouvoir choisir)
    return db.query(Service).all()


@router.get("/{service_id}", response_model=ServiceResponse)
async def get_service(
    service_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Vérifier que le service appartient à l'institution de l'utilisateur
    if current_user.role == RoleEnum.admin or current_user.institution_id:
        s = db.query(Service).filter(
            Service.id == service_id,
            Service.institution_id == current_user.institution_id
        ).first()
    else:
        s = db.query(Service).filter(Service.id == service_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Service introuvable")
    return s


@router.post("", response_model=ServiceResponse, status_code=201)
async def create_service(
    body: ServiceCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(_require_admin),
):
    # Créer le service lié à l'institution de l'admin
    service_data = body.model_dump()
    service_data['institution_id'] = admin.institution_id
    s = Service(**service_data)
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


@router.put("/{service_id}", response_model=ServiceResponse)
async def update_service(
    service_id: int,
    body: ServiceUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(_require_admin),
):
    # Ne peut modifier que les services de son institution
    s = db.query(Service).filter(
        Service.id == service_id,
        Service.institution_id == admin.institution_id
    ).first()
    if not s:
        raise HTTPException(status_code=404, detail="Service introuvable")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(s, field, value)
    db.commit()
    db.refresh(s)
    return s


@router.delete("/{service_id}", status_code=204)
async def delete_service(
    service_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(_require_admin),
):
    # Ne peut supprimer que les services de son institution
    s = db.query(Service).filter(
        Service.id == service_id,
        Service.institution_id == admin.institution_id
    ).first()
    if not s:
        raise HTTPException(status_code=404, detail="Service introuvable")
    db.delete(s)
    db.commit()
