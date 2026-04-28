from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models import Rendezvous, User, RoleEnum
from app.schemas.rendezvous import RendezvousCreate, RendezvousStatut, RendezvousResponse
from app.services.auth_service import get_current_user
from app.services.rdv_service import creer_rendezvous, get_rdv_client, annuler_rendezvous
from app.services.notification_service import creer_notification

router = APIRouter(prefix="/rendezvous", tags=["Rendez-vous"])


@router.get("", response_model=list[RendezvousResponse])
async def list_rendezvous(
    date: Optional[str] = None,
    statut: Optional[str] = None,
    agence_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from sqlalchemy.orm import joinedload
    from app.models import Agence, Service, User
    
    # Charger les relations pour avoir service_nom et client_nom
    query = db.query(Rendezvous).options(
        joinedload(Rendezvous.service),
        joinedload(Rendezvous.client)
    )
    
    # Admin ne voit que les RDV de son institution
    if current_user.role == RoleEnum.admin:
        query = query.join(Agence).filter(Agence.institution_id == current_user.institution_id)
    elif current_user.role == RoleEnum.client:
        query = query.filter(Rendezvous.client_id == current_user.id)
    elif current_user.role in [RoleEnum.agent, RoleEnum.manager]:
        # Agent/manager voient UNIQUEMENT les RDV de LEUR agence
        if not current_user.agence_id:
            raise HTTPException(status_code=403, detail="Vous n'êtes assigné à aucune agence")
        query = query.filter(Rendezvous.agence_id == current_user.agence_id)
    else:
        # Directeur voit les RDV de son institution
        if current_user.institution_id:
            query = query.join(Agence).filter(Agence.institution_id == current_user.institution_id)
        if agence_id:
            query = query.filter(Rendezvous.agence_id == agence_id)
    
    if date:
        query = query.filter(Rendezvous.date_rdv == date)
    if statut:
        query = query.filter(Rendezvous.statut == statut)
    
    rdvs = query.order_by(Rendezvous.date_rdv.desc()).all()
    
    # Peupler service_nom et client_nom
    for rdv in rdvs:
        if rdv.service:
            rdv.service_nom = rdv.service.nom
        if rdv.client:
            rdv.client_nom = rdv.client.nom
    
    return rdvs


@router.get("/client/{client_id}", response_model=list[RendezvousResponse])
async def get_rdv_by_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models import Agence
    if current_user.id != client_id and current_user.role not in [RoleEnum.admin, RoleEnum.manager, RoleEnum.agent]:
        raise HTTPException(status_code=403, detail="Accès interdit")
    
    # Vérifier que le client appartient à la même institution (pour admin/agent/manager)
    if current_user.role in [RoleEnum.admin, RoleEnum.manager, RoleEnum.agent] and current_user.institution_id:
        client = db.query(User).filter(User.id == client_id, User.institution_id == current_user.institution_id).first()
        if not client:
            raise HTTPException(status_code=404, detail="Client introuvable dans votre institution")
    
    return get_rdv_client(db, client_id)


@router.get("/{rdv_id}", response_model=RendezvousResponse)
async def get_rendezvous(
    rdv_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rdv = db.query(Rendezvous).filter(Rendezvous.id == rdv_id).first()
    if not rdv:
        raise HTTPException(status_code=404, detail="Rendez-vous introuvable")
    if current_user.role == RoleEnum.client and rdv.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Accès interdit")
    return rdv


@router.post("", response_model=RendezvousResponse, status_code=201)
async def create_rendezvous(
    body: RendezvousCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rdv = creer_rendezvous(db, body, current_user.id)
    
    # Message personnalisé si l'heure a été modifiée
    if rdv.heure_rdv != body.heure_rdv:
        message = f"Votre rendez-vous a été décalé au {rdv.date_rdv} à {rdv.heure_rdv} (conflit détecté)."
    else:
        message = f"Votre rendez-vous du {rdv.date_rdv} à {rdv.heure_rdv} est confirmé."
    
    await creer_notification(
        db, current_user.id,
        message,
        type_notif="rdv",
    )
    return rdv


@router.put("/{rdv_id}/statut", response_model=RendezvousResponse)
async def update_statut(
    rdv_id: int,
    body: RendezvousStatut,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rdv = db.query(Rendezvous).filter(Rendezvous.id == rdv_id).first()
    if not rdv:
        raise HTTPException(status_code=404, detail="Rendez-vous introuvable")
    rdv.statut = body.statut
    db.commit()
    db.refresh(rdv)
    return rdv


@router.post("/{rdv_id}/valider", response_model=RendezvousResponse)
async def valider_rendezvous(
    rdv_id: int,
    guichet: str = Query(..., description="Guichet de validation"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rdv = db.query(Rendezvous).filter(Rendezvous.id == rdv_id).first()
    if not rdv:
        raise HTTPException(status_code=404, detail="Rendez-vous introuvable")
    
    # Vérifier les permissions
    if current_user.role == RoleEnum.client and rdv.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Accès interdit")
    
    # Mettre à jour le statut
    rdv.statut = "confirme"
    db.commit()
    db.refresh(rdv)
    
    # Notifier le client
    await creer_notification(
        db, rdv.client_id,
        f"Votre rendez-vous est validé. Présentez-vous au guichet {guichet}.",
        type_notif="rdv",
    )
    
    return rdv


@router.delete("/{rdv_id}", status_code=204)
async def cancel_rendezvous(
    rdv_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rdv = db.query(Rendezvous).filter(Rendezvous.id == rdv_id).first()
    if not rdv:
        raise HTTPException(status_code=404, detail="Rendez-vous introuvable")
    if current_user.role == RoleEnum.client and rdv.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Accès interdit")
    annuler_rendezvous(db, rdv_id, current_user.id)
