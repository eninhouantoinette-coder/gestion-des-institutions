from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models import TypeInstitutionEnum, StatutInstitutionEnum


class InstitutionResponse(BaseModel):
    id: int
    nom: str
    type: TypeInstitutionEnum
    email: str
    telephone: str
    pays: Optional[str]
    ville: Optional[str]
    adresse: Optional[str]
    logo: Optional[str]
    statut: StatutInstitutionEnum
    date_creation: datetime

    model_config = {"from_attributes": True}
