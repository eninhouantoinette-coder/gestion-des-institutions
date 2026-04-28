from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models import StatutTacheEnum, PrioriteEnum, StatutNotifEnum, NiveauAlerteEnum


class TacheCreate(BaseModel):
    titre: str
    description: Optional[str] = None
    agence_id: Optional[int] = None  # Optionnel, sera défini automatiquement
    agent_id: Optional[int] = None
    service_id: Optional[int] = None
    client_id: Optional[int] = None
    ticket_id: Optional[int] = None   # Ticket associé
    rdv_id: Optional[int] = None      # RDV associé
    priorite: PrioriteEnum = PrioriteEnum.normale
    date_echeance: Optional[str] = None


class TacheUpdate(BaseModel):
    titre: Optional[str] = None
    description: Optional[str] = None
    priorite: Optional[PrioriteEnum] = None
    date_echeance: Optional[str] = None


class TacheStatut(BaseModel):
    statut: StatutTacheEnum


class TacheAssigner(BaseModel):
    agent_id: int


class TacheResponse(BaseModel):
    id: int
    agence_id: Optional[int] = None
    agent_id: Optional[int]
    client_id: Optional[int]
    service_id: Optional[int]
    titre: str
    description: Optional[str]
    statut: StatutTacheEnum
    priorite: PrioriteEnum
    date_echeance: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class AffectationResponse(BaseModel):
    id: int
    tache_id: int
    agent_id: int
    score: float
    statut: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AffectationUpdate(BaseModel):
    statut: str  # acceptee / refusee


class NotificationCreate(BaseModel):
    user_id: int
    message: str
    type: str = "info"
    lien: Optional[str] = None


class NotificationResponse(BaseModel):
    id: int
    user_id: int
    message: str
    type: str
    statut: StatutNotifEnum
    lien: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class AlerteCreate(BaseModel):
    type: str
    message: str
    niveau: NiveauAlerteEnum = NiveauAlerteEnum.faible
    agence_id: Optional[int] = None
    user_id: Optional[int] = None


class AlerteResponse(BaseModel):
    id: int
    type: str
    message: str
    niveau: NiveauAlerteEnum
    agence_id: Optional[int]
    user_id: Optional[int]
    statut: str
    created_at: datetime

    model_config = {"from_attributes": True}
