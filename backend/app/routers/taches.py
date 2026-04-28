from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models import Tache, Affectation, User, Ticket, Rendezvous, RoleEnum, StatutTacheEnum, PrioriteEnum
from app.schemas.tache import (
    TacheCreate, TacheUpdate, TacheStatut, TacheAssigner,
    TacheResponse, AffectationResponse, AffectationUpdate
)
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/taches", tags=["Tâches"])


def _score_agent(db: Session, agent_id: int) -> float:
    """Calcule un score de disponibilité (moins de tâches = score plus haut)."""
    taches_actives = (
        db.query(Tache)
        .filter(
            Tache.agent_id == agent_id,
            Tache.statut.in_([StatutTacheEnum.a_faire, StatutTacheEnum.en_cours]),
        )
        .count()
    )
    return max(0.0, 1.0 - taches_actives * 0.1)


@router.get("", response_model=list[TacheResponse])
async def list_taches(
    statut: Optional[str] = None,
    priorite: Optional[str] = None,
    agent_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Tache)
    # Sécurité : filtrer par agence selon le rôle
    if current_user.role == RoleEnum.agent:
        # Agent : voit les tâches de son agence
        query = query.filter(Tache.agence_id == current_user.agence_id)
        if agent_id is None:
            # Par défaut, l'agent voit ses propres tâches
            query = query.filter(Tache.agent_id == current_user.id)
        else:
            query = query.filter(Tache.agent_id == agent_id)
    elif current_user.role == RoleEnum.manager:
        # Manager : voit uniquement les tâches de son agence
        query = query.filter(Tache.agence_id == current_user.agence_id)
        if agent_id:
            query = query.filter(Tache.agent_id == agent_id)
    elif agent_id:
        # Admin/Directeur : peut filtrer par agent
        query = query.filter(Tache.agent_id == agent_id)
    if statut:
        query = query.filter(Tache.statut == statut)
    if priorite:
        query = query.filter(Tache.priorite == priorite)
    return query.order_by(Tache.priorite.desc(), Tache.created_at.desc()).all()


@router.get("/{tache_id}", response_model=TacheResponse)
async def get_tache(tache_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    t = db.query(Tache).filter(Tache.id == tache_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tâche introuvable")
    # Sécurité : manager/agent ne voient que les tâches de leur agence
    if current_user.role in [RoleEnum.manager, RoleEnum.agent] and t.agence_id != current_user.agence_id:
        raise HTTPException(status_code=403, detail="Accès interdit")
    return t


@router.post("", response_model=TacheResponse, status_code=201)
async def create_tache(
    body: TacheCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Admins et managers peuvent créer des tâches
    # Les managers ne peuvent créer que pour leur propre agence
    if current_user.role not in [RoleEnum.admin, RoleEnum.manager]:
        raise HTTPException(status_code=403, detail="Seuls les administrateurs et managers peuvent créer des tâches")
    data = body.model_dump()
    # Définir l'agence de la tâche
    if not data.get('agence_id'):
        data['agence_id'] = current_user.agence_id
    # Vérifier que le manager ne crée que pour son agence
    if current_user.role == RoleEnum.manager and data.get('agence_id') != current_user.agence_id:
        raise HTTPException(status_code=403, detail="Vous ne pouvez créer des tâches que pour votre agence")
    t = Tache(**data)
    db.add(t)
    db.commit()
    db.refresh(t)
    
    # Mettre à jour le ticket ou RDV avec l'agent assigné
    if t.agent_id:
        _sync_ticket_with_agent(db, t.ticket_id, t.agent_id)
        if t.rdv_id:
            rdv = db.query(Rendezvous).filter(Rendezvous.id == t.rdv_id).first()
            if rdv:
                rdv.agent_id = t.agent_id
                db.commit()
    
    return t

def _sync_ticket_with_agent(db: Session, ticket_id: Optional[int], agent_id: Optional[int]):
    """Synchronise l'agent et son guichet sur le ticket associé."""
    if not ticket_id or not agent_id:
        return
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    agent = db.query(User).filter(User.id == agent_id).first()
    if ticket and agent:
        ticket.agent_id = agent.id
        ticket.guichet = agent.guichet
        db.commit()


@router.put("/{tache_id}", response_model=TacheResponse)
async def update_tache(
    tache_id: int,
    body: TacheUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    t = db.query(Tache).filter(Tache.id == tache_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tâche introuvable")
    # Sécurité : vérifier l'accès selon le rôle
    if current_user.role == RoleEnum.agent and t.agent_id != current_user.id:
        raise HTTPException(status_code=403, detail="Accès interdit")
    if current_user.role == RoleEnum.manager and t.agence_id != current_user.agence_id:
        raise HTTPException(status_code=403, detail="Accès interdit - Tâche d'une autre agence")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(t, field, value)
    db.commit()
    db.refresh(t)

    # Ré-synchroniser si l'agent a changé
    if body.agent_id or body.ticket_id:
        _sync_ticket_with_agent(db, t.ticket_id, t.agent_id)
        
    return t


@router.put("/{tache_id}/statut", response_model=TacheResponse)
async def update_statut(
    tache_id: int,
    body: TacheStatut,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    t = db.query(Tache).filter(Tache.id == tache_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tâche introuvable")
    # Sécurité : vérifier l'accès selon le rôle
    if current_user.role == RoleEnum.agent and t.agent_id != current_user.id:
        raise HTTPException(status_code=403, detail="Accès interdit")
    if current_user.role == RoleEnum.manager and t.agence_id != current_user.agence_id:
        raise HTTPException(status_code=403, detail="Accès interdit - Tâche d'une autre agence")
    t.statut = body.statut
    db.commit()
    db.refresh(t)
    return t


@router.delete("/{tache_id}", status_code=204)
async def delete_tache(
    tache_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in [RoleEnum.manager, RoleEnum.admin]:
        raise HTTPException(status_code=403, detail="Accès interdit")
    t = db.query(Tache).filter(Tache.id == tache_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tâche introuvable")
    # Sécurité : manager ne supprime que les tâches de son agence
    if current_user.role == RoleEnum.manager and t.agence_id != current_user.agence_id:
        raise HTTPException(status_code=403, detail="Accès interdit - Tâche d'une autre agence")
    db.delete(t)
    db.commit()


@router.post("/{tache_id}/assigner", response_model=TacheResponse)
async def assigner_tache(
    tache_id: int,
    body: TacheAssigner,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in [RoleEnum.manager, RoleEnum.admin]:
        raise HTTPException(status_code=403, detail="Accès interdit")
    t = db.query(Tache).filter(Tache.id == tache_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tâche introuvable")
    # Sécurité : manager ne gère que les tâches de son agence
    if current_user.role == RoleEnum.manager and t.agence_id != current_user.agence_id:
        raise HTTPException(status_code=403, detail="Accès interdit - Tâche d'une autre agence")
    agent = db.query(User).filter(User.id == body.agent_id, User.role == RoleEnum.agent).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent introuvable")
    # Sécurité : manager ne peut assigner qu'à un agent de son agence
    if current_user.role == RoleEnum.manager and agent.agence_id != current_user.agence_id:
        raise HTTPException(status_code=403, detail="Accès interdit - Agent d'une autre agence")
    t.agent_id = body.agent_id
    t.statut = StatutTacheEnum.en_cours
    db.commit()
    db.refresh(t)

    # Synchroniser le ticket
    _sync_ticket_with_agent(db, t.ticket_id, t.agent_id)

    return t


# ─── Affectations ──────────────────────────────────────────────────────────

@router.post("/affectations/auto", response_model=list[AffectationResponse])
async def proposer_affectation_auto(
    tache_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Propose automatiquement les 3 meilleurs agents selon leur charge."""
    if current_user.role not in [RoleEnum.manager, RoleEnum.admin]:
        raise HTTPException(status_code=403, detail="Accès interdit")
    # Vérifier que la tâche appartient à l'agence du manager
    tache = db.query(Tache).filter(Tache.id == tache_id).first()
    if not tache:
        raise HTTPException(status_code=404, detail="Tâche introuvable")
    if current_user.role == RoleEnum.manager and tache.agence_id != current_user.agence_id:
        raise HTTPException(status_code=403, detail="Accès interdit - Tâche d'une autre agence")
    # Filtrer les agents par agence pour le manager
    agents_query = db.query(User).filter(User.role == RoleEnum.agent)
    if current_user.role == RoleEnum.manager:
        agents_query = agents_query.filter(User.agence_id == current_user.agence_id)
    agents = agents_query.all()
    scored = sorted(agents, key=lambda a: _score_agent(db, a.id), reverse=True)[:3]
    affectations = []
    for agent in scored:
        aff = Affectation(
            tache_id=tache_id,
            agent_id=agent.id,
            score=_score_agent(db, agent.id),
            statut="proposee",
        )
        db.add(aff)
        affectations.append(aff)
    db.commit()
    for aff in affectations:
        db.refresh(aff)
    return affectations
