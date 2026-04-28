from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Institution, StatutInstitutionEnum
from app.schemas.institution import InstitutionResponse

router = APIRouter(prefix="/institutions", tags=["Institutions"])


@router.get("", response_model=list[InstitutionResponse])
async def list_institutions(
    db: Session = Depends(get_db),
):
    """Liste toutes les institutions actives (pour les clients)."""
    return db.query(Institution).filter(Institution.statut == StatutInstitutionEnum.actif).all()


@router.get("/{institution_id}", response_model=InstitutionResponse)
async def get_institution(
    institution_id: int,
    db: Session = Depends(get_db),
):
    """Récupère une institution par son ID."""
    institution = db.query(Institution).filter(
        Institution.id == institution_id,
        Institution.statut == StatutInstitutionEnum.actif
    ).first()
    if not institution:
        raise HTTPException(status_code=404, detail="Institution introuvable")
    return institution
