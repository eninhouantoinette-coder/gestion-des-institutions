from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models import StatutRdvEnum


class RendezvousCreate(BaseModel):
    institution_id: Optional[int] = None  # Pour validation côté client
    agence_id: int
    service_id: int
    creneau_id: Optional[int] = None
    date_rdv: str  # YYYY-MM-DD
    heure_rdv: str  # HH:MM
    notes: Optional[str] = None


class RendezvousUpdate(BaseModel):
    date_rdv: Optional[str] = None
    heure_rdv: Optional[str] = None
    notes: Optional[str] = None


class RendezvousStatut(BaseModel):
    statut: StatutRdvEnum


class RendezvousResponse(BaseModel):
    id: int
    client_id: int
    agence_id: int
    service_id: int
    creneau_id: Optional[int]
    date_rdv: str
    heure_rdv: str
    heure_modifiee: Optional[bool] = None  # True si l'heure a été décalée (conflit)
    statut: StatutRdvEnum
    notes: Optional[str]
    created_at: datetime
    # Informations liées
    service_nom: Optional[str] = None
    client_nom: Optional[str] = None

    model_config = {"from_attributes": True}


class CreneauCreate(BaseModel):
    institution_id: Optional[int] = None  # Pour validation côté client
    agence_id: int
    service_id: int
    date: str
    heure_debut: str
    heure_fin: str
    capacite: int = 1


class CreneauUpdate(BaseModel):
    heure_debut: Optional[str] = None
    heure_fin: Optional[str] = None
    capacite: Optional[int] = None
    statut: Optional[str] = None


class CreneauResponse(BaseModel):
    id: int
    agence_id: int
    service_id: int
    date: str
    heure_debut: str
    heure_fin: str
    capacite: int
    places_reservees: int
    statut: str

    model_config = {"from_attributes": True}
