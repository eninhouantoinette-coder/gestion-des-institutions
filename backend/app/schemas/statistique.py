from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class StatistiqueBase(BaseModel):
    agence_id: Optional[int] = None
    agent_id: Optional[int] = None
    service_id: Optional[int] = None
    total_clients: int = 0
    temps_moyen_traitement: float = 0.0
    taux_satisfaction: float = 0.0
    taux_annulation: float = 0.0
    date_stat: str
    periode: str = "jour"

class StatistiqueCreate(StatistiqueBase):
    pass

class StatistiqueResponse(StatistiqueBase):
    id: int
    agence_nom: Optional[str] = None
    
    model_config = {"from_attributes": True}
