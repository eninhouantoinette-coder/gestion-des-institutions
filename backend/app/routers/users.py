from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import Optional, List
from app.database import get_db
from app.models import User, RoleEnum, StatutUserEnum, Agence
from app.schemas.user import UserCreate, UserUpdate, UserStatut, UserResetPassword, UserResponse, AgentStatusUpdate, AgentStatusResponse
from app.services.auth_service import hash_password, get_current_user
from app.utils.helpers import paginate

router = APIRouter(prefix="/users", tags=["Utilisateurs"])


def _require_admin_or_manager(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in [RoleEnum.admin, RoleEnum.manager, RoleEnum.directeur, RoleEnum.agent]:
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs, managers, directeurs et agents")
    if not current_user.institution_id:
        raise HTTPException(status_code=400, detail="Utilisateur non rattaché à une institution")
    return current_user


def _filter_by_role(query, current_user: User):
    """Filtre les utilisateurs selon le rôle de l'utilisateur courant."""
    if current_user.role == RoleEnum.admin:
        # Admin voit tous les users de son institution
        return query.filter(User.institution_id == current_user.institution_id)
    elif current_user.role == RoleEnum.directeur:
        # Directeur voit tous les agents et managers de toutes les agences de son institution
        return query.filter(
            User.institution_id == current_user.institution_id,
            User.role.in_([RoleEnum.agent, RoleEnum.manager])
        )
    elif current_user.role == RoleEnum.manager:
        # Manager voit uniquement les agents de son agence
        return query.filter(
            User.agence_id == current_user.agence_id,
            User.role == RoleEnum.agent
        )
    elif current_user.role == RoleEnum.agent:
        # Agent ne voit que son propre profil
        return query.filter(User.id == current_user.id)
    return query


@router.get("", response_model=dict)
async def list_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    role: Optional[str] = None,
    statut: Optional[str] = None,
    agence_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin_or_manager),
):
    # Base query: filtrer selon le rôle de l'utilisateur
    query = db.query(User)
    query = _filter_by_role(query, current_user)
    
    # Pour le manager, on force le filtre agent de son agence
    if current_user.role == RoleEnum.manager:
        query = query.filter(User.role == RoleEnum.agent)
    elif current_user.role == RoleEnum.directeur:
        # Directeur voit tous les agents et managers de l'institution
        query = query.filter(User.role.in_([RoleEnum.agent, RoleEnum.manager]))
    elif current_user.role == RoleEnum.agent:
        # Agent ne voit que son propre profil
        query = query.filter(User.id == current_user.id)
    elif role:
        query = query.filter(User.role == role)
        
    if statut:
        query = query.filter(User.statut == statut)
        
    if agence_id:
        if current_user.role == RoleEnum.manager and current_user.agence_id != agence_id:
            raise HTTPException(status_code=403, detail="Vous ne pouvez pas voir les agents d'une autre agence")
        # Pour agent, on ignore le filtre agence_id car il ne voit que son profil
        if current_user.role == RoleEnum.agent:
            pass  # L'agent ne voit déjà que son propre profil via _filter_by_role
        # Pour directeur, vérifier que l'agence appartient à son institution
        elif current_user.role == RoleEnum.directeur:
            agence = db.query(Agence).filter(Agence.id == agence_id, Agence.institution_id == current_user.institution_id).first()
            if not agence:
                raise HTTPException(status_code=403, detail="Cette agence n'appartient pas à votre institution")
        # Pour admin, vérifier que l'agence appartient à l'institution
        if current_user.role == RoleEnum.admin:
            agence = db.query(Agence).filter(Agence.id == agence_id, Agence.institution_id == current_user.institution_id).first()
            if not agence:
                raise HTTPException(status_code=403, detail="Cette agence n'appartient pas à votre institution")
        query = query.filter(User.agence_id == agence_id)
    
    result = paginate(query, page, per_page)
    result["items"] = [UserResponse.model_validate(u) for u in result["items"]]
    return result


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Admin ne peut voir que les users de son institution
    if current_user.role == RoleEnum.admin:
        user = db.query(User).filter(
            User.id == user_id,
            User.institution_id == current_user.institution_id
        ).first()
    # Les autres users ne peuvent voir que leur propre profil
    elif current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Accès interdit")
    else:
        user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    return user


@router.post("", response_model=UserResponse, status_code=201)
async def create_user(
    body: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin_or_manager),
):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")
    
    # Le manager ne peut créer que des agents dans son agence
    if current_user.role == RoleEnum.manager:
        if body.role != RoleEnum.agent:
            raise HTTPException(status_code=403, detail="Vous ne pouvez créer que des agents")
        if body.agence_id and body.agence_id != current_user.agence_id:
            raise HTTPException(status_code=403, detail="Vous ne pouvez créer des agents que dans votre agence")
        body.agence_id = current_user.agence_id
        body.institution_id = current_user.institution_id
    
    # Le directeur ne peut créer que des agents et managers dans son institution
    if current_user.role == RoleEnum.directeur:
        if body.role not in [RoleEnum.agent, RoleEnum.manager]:
            raise HTTPException(status_code=403, detail="Vous ne pouvez créer que des agents et des managers")
        if body.agence_id:
            # Vérifier que l'agence appartient à son institution
            agence = db.query(Agence).filter(
                Agence.id == body.agence_id,
                Agence.institution_id == current_user.institution_id
            ).first()
            if not agence:
                raise HTTPException(status_code=403, detail="Cette agence n'appartient pas à votre institution")
        body.institution_id = current_user.institution_id
    
    # Si agence_id est fourni, vérifier qu'elle appartient à l'institution (admin uniquement)
    if body.agence_id and current_user.role == RoleEnum.admin:
        agence = db.query(Agence).filter(
            Agence.id == body.agence_id,
            Agence.institution_id == current_user.institution_id
        ).first()
        if not agence:
            raise HTTPException(status_code=403, detail="Cette agence n'appartient pas à votre institution")
    
    user = User(
        nom=body.nom,
        email=body.email,
        telephone=body.telephone,
        mot_de_passe=hash_password(body.mot_de_passe),
        role=body.role,
        agence_id=body.agence_id,
        institution_id=current_user.institution_id,
        statut=StatutUserEnum.actif,
        tentatives_connexion=0,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    body: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Manager : ne peut modifier que les agents de SON agence
    if current_user.role == RoleEnum.manager:
        user = db.query(User).filter(
            User.id == user_id,
            User.agence_id == current_user.agence_id,
            User.role == RoleEnum.agent
        ).first()
        if not user:
            raise HTTPException(status_code=404, detail="Utilisateur introuvable ou accès interdit")
        # Manager ne peut pas changer l'agence (forcément la sienne)
        if body.agence_id and body.agence_id != current_user.agence_id:
            raise HTTPException(status_code=403, detail="Vous ne pouvez pas changer l'agence de l'agent")
        body.agence_id = current_user.agence_id
    # Admin : ne peut modifier que les users de son institution
    elif current_user.role == RoleEnum.admin:
        user = db.query(User).filter(
            User.id == user_id,
            User.institution_id == current_user.institution_id
        ).first()
    # Agent/Directeur : ne peut modifier que son propre profil
    elif current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Accès interdit")
    else:
        user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    
    # Si changement d'agence, vérifier qu'elle appartient à l'institution (admin uniquement)
    if body.agence_id and current_user.role == RoleEnum.admin:
        agence = db.query(Agence).filter(
            Agence.id == body.agence_id,
            Agence.institution_id == current_user.institution_id
        ).first()
        if not agence:
            raise HTTPException(status_code=403, detail="Cette agence n'appartient pas à votre institution")
    
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=204)
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin_or_manager),
):
    # Filtrer selon le rôle
    query = db.query(User).filter(User.id == user_id)
    query = _filter_by_role(query, current_user)
    
    user = query.first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    db.delete(user)
    db.commit()


@router.put("/{user_id}/statut", response_model=UserResponse)
async def update_statut(
    user_id: int,
    body: UserStatut,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin_or_manager),
):
    # Filtrer selon le rôle
    query = db.query(User).filter(User.id == user_id)
    query = _filter_by_role(query, current_user)
    
    user = query.first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    user.statut = body.statut
    db.commit()
    db.refresh(user)
    return user


@router.put("/{user_id}/reset-password")
async def admin_reset_password(
    user_id: int,
    body: UserResetPassword,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin_or_manager),
):
    # Filtrer selon le rôle
    query = db.query(User).filter(User.id == user_id)
    query = _filter_by_role(query, current_user)
    
    user = query.first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    user.mot_de_passe = hash_password(body.nouveau_mot_de_passe)
    user.tentatives_connexion = 0
    user.statut = StatutUserEnum.actif
    db.commit()
    return {"message": "Mot de passe réinitialisé"}


@router.put("/{user_id}/agent-status", response_model=AgentStatusResponse)
async def update_agent_status(
    user_id: int,
    body: AgentStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Mettre à jour le statut de disponibilité d'un agent.
    Seuls les agents peuvent changer leur propre statut,
    et les admins/managers/directeurs peuvent changer le statut des agents sous leur responsabilité.
    """
    from app.models import StatutAgentEnum
    
    query = db.query(User).filter(User.id == user_id)
    
    # Vérifier les permissions
    if current_user.role == RoleEnum.agent:
        # Un agent ne peut changer que son propre statut
        if current_user.id != user_id:
            raise HTTPException(status_code=403, detail="Vous ne pouvez modifier que votre propre statut")
    elif current_user.role == RoleEnum.manager:
        # Un manager ne peut changer que le statut des agents de son agence
        query = query.filter(User.agence_id == current_user.agence_id, User.role == RoleEnum.agent)
    elif current_user.role in [RoleEnum.admin, RoleEnum.directeur]:
        # Admin et directeur peuvent changer le statut des agents de leur institution
        query = query.filter(User.institution_id == current_user.institution_id, User.role == RoleEnum.agent)
    else:
        raise HTTPException(status_code=403, detail="Accès interdit")
    
    user = query.first()
    if not user:
        raise HTTPException(status_code=404, detail="Agent introuvable ou accès non autorisé")
    
    if user.role != RoleEnum.agent:
        raise HTTPException(status_code=400, detail="Seuls les agents peuvent avoir un statut de disponibilité")
    
    # Mettre à jour le statut
    user.agent_status = body.agent_status
    db.commit()
    db.refresh(user)
    
    return {
        "user_id": user.id,
        "nom": user.nom,
        "agent_status": user.agent_status,
        "updated_at": user.updated_at
    }


@router.get("/{user_id}/agent-status", response_model=AgentStatusResponse)
async def get_agent_status(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Récupérer le statut de disponibilité d'un agent.
    """
    user = db.query(User).filter(User.id == user_id, User.role == RoleEnum.agent).first()
    if not user:
        raise HTTPException(status_code=404, detail="Agent introuvable")
    
    return {
        "user_id": user.id,
        "nom": user.nom,
        "agent_status": user.agent_status,
        "updated_at": user.updated_at
    }
