from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models import Prediction, User, RoleEnum
from app.services.auth_service import get_current_user
from app.services.prediction_service import (
    predire_affluence, predire_charge_agents,
    estimer_temps_attente, simuler_scenario,
)

router = APIRouter(prefix="/predictions", tags=["Prédictions IA"])


def _require_manager_plus(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in [RoleEnum.admin, RoleEnum.manager, RoleEnum.directeur]:
        raise HTTPException(status_code=403, detail="Accès interdit")
    return current_user


@router.get("/affluence/{agence_id}")
async def affluence(
    agence_id: int,
    date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    _: User = Depends(_require_manager_plus),
):
    result = predire_affluence(db, agence_id, date)
    # Sauvegarder en base
    pred = Prediction(
        agence_id=agence_id,
        date_prevision=result["date_prevision"],
        niveau_affluence=result["niveau_affluence"],
        charge_estimee=result["charge_estimee"],
        nb_agents_recommandes=result["nb_agents_recommandes"],
        recommandations=result["recommandations"],
    )
    db.add(pred)
    db.commit()
    return result


@router.get("/charge-agents/{agence_id}")
async def charge_agents(
    agence_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(_require_manager_plus),
):
    return predire_charge_agents(db, agence_id)


@router.get("/temps-attente/{service_id}")
async def temps_attente(
    service_id: int,
    agence_id: int = Query(...),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    return estimer_temps_attente(db, service_id, agence_id)


@router.post("/simulation")
async def simulation(
    agence_id: int,
    scenario: str = Query(..., description="rush | absence_agents | panne"),
    nb_agents: Optional[int] = Query(None),
    absents: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(_require_manager_plus),
):
    params = {}
    if nb_agents:
        params["nb_agents"] = nb_agents
    if absents:
        params["absents"] = absents
    return simuler_scenario(db, agence_id, scenario, params)


@router.get("/recommandations/{agence_id}")
async def recommandations(
    agence_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(_require_manager_plus),
):
    result = predire_affluence(db, agence_id)
    return {
        "agence_id": agence_id,
        "nb_agents_recommandes": result["nb_agents_recommandes"],
        "niveau_affluence": result["niveau_affluence"],
        "recommandations": result["recommandations"],
    }
