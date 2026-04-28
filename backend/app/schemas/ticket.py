from pydantic import BaseModel, computed_field
from typing import Optional
from datetime import datetime, timedelta
from app.models import StatutTicketEnum


class TicketCreate(BaseModel):
    institution_id: Optional[int] = None  # Pour validation côté client
    agence_id: int
    service_id: int
    client_nom: Optional[str] = None  # Pour tickets sans compte
    est_urgent: bool = False


class TicketStatut(BaseModel):
    statut: StatutTicketEnum
    agent_id: Optional[int] = None  # Permet au manager d'assigner un agent lors du changement de statut


class TicketResponse(BaseModel):
    id: int
    client_id: Optional[int]
    agence_id: int
    service_id: int
    agent_id: Optional[int] = None
    numero_ticket: str
    position: int
    position_ajustee: Optional[bool] = None  # True si position ajustée (conflit)
    temps_estime: int
    heure_estimee: Optional[str] = None  # Heure estimée calculée à la création (HH:MM)
    statut: StatutTicketEnum
    guichet: Optional[str] = None  # Guichet où se présenter
    qr_code: Optional[str]
    client_nom: Optional[str]
    created_at: datetime
    # Informations liées pour le client
    service_nom: Optional[str] = None
    agent_nom: Optional[str] = None

    model_config = {"from_attributes": True}


class TicketPosition(BaseModel):
    ticket_id: int
    numero_ticket: str
    position: int
    temps_estime: int
    statut: StatutTicketEnum
    guichet: Optional[str] = None
    agent_nom: Optional[str] = None


class AgenceCreate(BaseModel):
    nom: str
    adresse: Optional[str] = None
    capacite: int = 50
    horaires: Optional[dict] = None


class AgenceUpdate(BaseModel):
    nom: Optional[str] = None
    adresse: Optional[str] = None
    capacite: Optional[int] = None
    horaires: Optional[dict] = None


class AgenceResponse(BaseModel):
    id: int
    nom: str
    adresse: Optional[str]
    capacite: int
    horaires: Optional[dict]
    created_at: datetime

    model_config = {"from_attributes": True}


class ServiceCreate(BaseModel):
    institution_id: Optional[int] = None  # Pour validation côté client
    nom: str
    description: Optional[str] = None
    duree_moyenne: int = 15


class ServiceUpdate(BaseModel):
    nom: Optional[str] = None
    description: Optional[str] = None
    duree_moyenne: Optional[int] = None


class ServiceResponse(BaseModel):
    id: int
    institution_id: Optional[int]
    nom: str
    description: Optional[str]
    duree_moyenne: int
    created_at: datetime

    model_config = {"from_attributes": True}
