from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models import Ticket, User, RoleEnum, StatutTicketEnum
from datetime import datetime
from app.schemas.ticket import TicketCreate, TicketStatut, TicketResponse, TicketPosition
from app.services.auth_service import get_current_user
from app.services.queue_service import (
    generer_ticket, get_file_attente, appeler_suivant, get_position_ticket
)
from app.services.notification_service import creer_notification, notifier_ticket_proche, verifier_seuil_file
from app.websocket.manager import manager

router = APIRouter(prefix="/tickets", tags=["Tickets & File d'attente"])


@router.get("", response_model=list[TicketResponse])
async def list_tickets(
    agence_id: Optional[int] = None,
    statut: Optional[str] = None,
    agent_id: Optional[int] = None,
    date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from sqlalchemy.orm import joinedload
    from app.models import Agence, Service
    
    # Charger la relation service pour avoir service_nom
    query = db.query(Ticket).options(
        joinedload(Ticket.service),
        joinedload(Ticket.agent)
    )
    
    # Admin ne voit que les tickets de son institution
    if current_user.role == RoleEnum.admin:
        query = query.join(Agence).filter(Agence.institution_id == current_user.institution_id)
    elif current_user.role == RoleEnum.client:
        # Client ne voit que ses propres tickets
        query = query.filter(Ticket.client_id == current_user.id)
    elif current_user.role in [RoleEnum.agent, RoleEnum.manager]:
        # AGENT/MANAGER : Ne voit QUE les tickets de SON agence assignée
        if not current_user.agence_id:
            raise HTTPException(status_code=403, detail="Vous n'êtes assigné à aucune agence")
        # Si une agence spécifique est demandée, vérifier que c'est la sienne
        if agence_id and int(agence_id) != current_user.agence_id:
            raise HTTPException(status_code=403, detail="Vous ne pouvez pas voir les tickets d'une autre agence")
        query = query.filter(Ticket.agence_id == current_user.agence_id)
    else:
        # Directeur : voit les tickets de son institution
        if current_user.institution_id:
            query = query.join(Agence).filter(Agence.institution_id == current_user.institution_id)
        if agence_id:
            query = query.filter(Ticket.agence_id == agence_id)
    
    # Filtres optionnels
    if statut:
        query = query.filter(Ticket.statut == statut)
    if agent_id:
        query = query.filter(Ticket.agent_id == agent_id)
    if date:
        from sqlalchemy import func
        query = query.filter(func.date(Ticket.created_at) == date)
    
    tickets = query.order_by(Ticket.created_at.desc()).all()

    # Retourner des dicts explicites pour garantir service_nom et agent_nom
    result = []
    for t in tickets:
        result.append({
            "id": t.id,
            "client_id": t.client_id,
            "agence_id": t.agence_id,
            "service_id": t.service_id,
            "agent_id": t.agent_id,
            "numero_ticket": t.numero_ticket,
            "position": t.position,
            "position_ajustee": getattr(t, 'position_ajustee', None),
            "temps_estime": t.temps_estime,
            "heure_estimee": getattr(t, 'heure_estimee', None),
            "statut": t.statut,
            "guichet": t.guichet,
            "qr_code": t.qr_code,
            "client_nom": t.client_nom,
            "created_at": t.created_at,
            "service_nom": t.service.nom if t.service else None,
            "agent_nom": t.agent.nom if t.agent else None,
        })
    return result


@router.post("/generer", response_model=TicketResponse, status_code=201)
async def generer(
    body: TicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    print(f"[DEBUG] Route /generer appelée - Agence: {body.agence_id}, Service: {body.service_id}, User: {current_user.id}")
    ticket = generer_ticket(
        db,
        agence_id=body.agence_id,
        service_id=body.service_id,
        client_id=current_user.id,
        client_nom=current_user.nom,
        est_urgent=body.est_urgent,
    )
    # Message personnalisé si la position a été ajustée
    if ticket.position_ajustee:
        message = f"Ticket {ticket.numero_ticket} généré — Position {ticket.position} (conflit détecté) — Attente estimée : {ticket.temps_estime} min"
    else:
        message = f"Ticket {ticket.numero_ticket} généré — Position {ticket.position} — Attente estimée : {ticket.temps_estime} min"
    
    # Notification client avec info priorité rendez-vous si applicable
    from app.services.queue_service import compter_rendezvous_actifs
    rdv_count = compter_rendezvous_actifs(db, body.agence_id, body.service_id)
    if rdv_count > 0:
        message += f" — {rdv_count} RDV prioritaire(s) en cours"
    
    # Notification client
    await creer_notification(
        db, current_user.id,
        message,
        type_notif="ticket",
    )
    # WebSocket mise à jour file
    file = get_file_attente(db, body.agence_id)
    await manager.update_queue(body.agence_id, {
        "total_en_attente": len(file),
        "nouveau_ticket": ticket.numero_ticket,
    })
    # Vérifier seuil alerte
    print(f"[DEBUG] Création ticket terminée, appel à verifier_seuil_file pour agence {body.agence_id}")
    await verifier_seuil_file(db, body.agence_id)
    print(f"[DEBUG] verifier_seuil_file terminé")
    return ticket


@router.get("/file/{agence_id}", response_model=list[TicketResponse])
async def file_attente(
    agence_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models import Agence
    
    # Client : accès autorisé pour WebSocket (lecture seule)
    if current_user.role == RoleEnum.client:
        # Le client peut voir la file d'attente pour son suivi en temps réel
        pass
    # AGENT/MANAGER : Vérification stricte - ne peut voir que SA propre agence
    elif current_user.role in [RoleEnum.agent, RoleEnum.manager]:
        if not current_user.agence_id:
            raise HTTPException(status_code=403, detail="Vous n'êtes assigné à aucune agence")
        if agence_id != current_user.agence_id:
            raise HTTPException(status_code=403, detail="Accès interdit : vous ne pouvez voir que la file de VOTRE agence")
    # Admin : vérifier que l'agence appartient à son institution
    elif current_user.role == RoleEnum.admin:
        if current_user.institution_id:
            agence = db.query(Agence).filter(
                Agence.id == agence_id,
                Agence.institution_id == current_user.institution_id
            ).first()
            if not agence:
                raise HTTPException(status_code=403, detail="Cette agence n'appartient pas à votre institution")
    # Directeur : vérifier l'institution
    elif current_user.role == RoleEnum.directeur:
        if current_user.institution_id:
            agence = db.query(Agence).filter(
                Agence.id == agence_id,
                Agence.institution_id == current_user.institution_id
            ).first()
            if not agence:
                raise HTTPException(status_code=403, detail="Cette agence n'appartient pas à votre institution")
    
    # Pour les agents, inclure aussi les tickets qui leur sont assignés en cours
    if current_user.role == RoleEnum.agent:
        from sqlalchemy import or_, and_
        tickets = db.query(Ticket).filter(
            Ticket.agence_id == agence_id,
            or_(
                Ticket.statut == StatutTicketEnum.en_attente,
                and_(Ticket.statut == StatutTicketEnum.en_cours, Ticket.agent_id == current_user.id)
            )
        ).order_by(Ticket.priorite_score.desc(), Ticket.id.asc()).all()
        return [_enrich_ticket_response(t, db) for t in tickets]
    
    return get_file_attente(db, agence_id)


@router.post("/appeler-suivant")
async def appeler_suivant_client(
    agence_id: int = Query(...),
    service_id: Optional[int] = Query(None),
    agent_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models import Agence, User
    if current_user.role not in [RoleEnum.agent, RoleEnum.manager, RoleEnum.admin, RoleEnum.directeur]:
        raise HTTPException(status_code=403, detail="Accès interdit")
    
    # AGENT/MANAGER : Ne peut appeler que dans SA propre agence
    if current_user.role in [RoleEnum.agent, RoleEnum.manager]:
        if not current_user.agence_id:
            raise HTTPException(status_code=403, detail="Vous n'êtes assigné à aucune agence")
        if agence_id != current_user.agence_id:
            raise HTTPException(status_code=403, detail="Vous ne pouvez appeler que dans VOTRE agence")
    # Admin/Directeur : vérifier que l'agence appartient à l'institution
    elif current_user.role in [RoleEnum.admin, RoleEnum.directeur]:
        agence = db.query(Agence).filter(
            Agence.id == agence_id,
            Agence.institution_id == current_user.institution_id
        ).first()
        if not agence:
            raise HTTPException(status_code=403, detail="Cette agence n'appartient pas à votre institution")

    ticket = appeler_suivant(db, agence_id, service_id)
    if not ticket:
        return {"message": "La file d'attente est vide"}

    # Assigner l'agent au ticket
    target_agent_id = None
    target_guichet = None
    
    if agent_id:
        # Manager a spécifié un agent
        agent = db.query(User).filter(User.id == agent_id, User.role == RoleEnum.agent).first()
        if not agent:
            raise HTTPException(status_code=404, detail="Agent introuvable")
        target_agent_id = agent.id
        target_guichet = agent.guichet
    elif current_user.role == RoleEnum.agent:
        # Agent appelle pour lui-même
        target_agent_id = current_user.id
        target_guichet = current_user.guichet
    # Si manager sans agent_id spécifié, ne pas assigner d'agent
    
    if target_agent_id:
        ticket.agent_id = target_agent_id
        ticket.guichet = target_guichet
        ticket.statut = StatutTicketEnum.en_cours
        db.commit()
        db.refresh(ticket)

    # Récupérer les infos pour la notification
    guichet_info = ticket.guichet if ticket.guichet else "guichet"
    service_info = ""
    if ticket.service_id:
        from app.models import Service
        service = db.query(Service).filter(Service.id == ticket.service_id).first()
        if service:
            service_info = f" — Service: {service.nom}"

    # Notification WebSocket avec infos complètes
    await manager.send_to_channel(f"file/{agence_id}", "ticket_appele", {
        "numero_ticket": ticket.numero_ticket,
        "ticket_id": ticket.id,
        "client_nom": ticket.client_nom or "Client",
        "guichet": ticket.guichet,
        "agent_id": ticket.agent_id,
        "service_id": ticket.service_id,
    })
    if ticket.client_id:
        message_client = f"C'est votre tour ! Ticket {ticket.numero_ticket} — Présentez-vous au {guichet_info}{service_info}"
        await creer_notification(
            db, ticket.client_id,
            message_client,
            type_notif="ticket",
        )
        # Notification spécifique au client avec les détails du guichet
        await manager.send_to_channel(f"notifications/{ticket.client_id}", "ticket_appele_detail", {
            "ticket_id": ticket.id,
            "numero_ticket": ticket.numero_ticket,
            "guichet": ticket.guichet,
            "service": service.nom if ticket.service_id and service else None,
            "message": f"Présentez-vous au {guichet_info}{service_info}"
        })
    # Notifier celui qui approche
    await notifier_ticket_proche(db, agence_id)
    return {"ticket": ticket.numero_ticket, "message": "Client appelé", "guichet": ticket.guichet}


@router.get("/position/{ticket_id}", response_model=TicketPosition)
async def position(ticket_id: int, db: Session = Depends(get_db)):
    result = get_position_ticket(db, ticket_id)
    if not result:
        raise HTTPException(status_code=404, detail="Ticket introuvable")
    return result


def _enrich_ticket_response(ticket, db):
    """Enrichit le ticket avec les noms de service et agent"""
    from app.models import Service, User
    result = {
        "id": ticket.id,
        "client_id": ticket.client_id,
        "agence_id": ticket.agence_id,
        "service_id": ticket.service_id,
        "agent_id": ticket.agent_id,
        "numero_ticket": ticket.numero_ticket,
        "position": ticket.position,
        "temps_estime": ticket.temps_estime,
        "statut": ticket.statut,
        "guichet": ticket.guichet,
        "qr_code": ticket.qr_code,
        "client_nom": ticket.client_nom,
        "created_at": ticket.created_at,
        "service_nom": None,
        "agent_nom": None,
    }
    # Récupérer le nom du service
    if ticket.service_id:
        service = db.query(Service).filter(Service.id == ticket.service_id).first()
        if service:
            result["service_nom"] = service.nom
    # Récupérer le nom de l'agent
    if ticket.agent_id:
        agent = db.query(User).filter(User.id == ticket.agent_id).first()
        if agent:
            result["agent_nom"] = agent.nom
    return result


@router.post("/{ticket_id}/appeler")
async def appeler_ticket_specifique(
    ticket_id: int,
    guichet: Optional[str] = Query(None),
    agent_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Appelle un ticket spécifique par son ID (pour agents et managers)."""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket introuvable")

    # Vérifier que le ticket appartient à l'agence de l'agent/manager
    if current_user.role in [RoleEnum.agent, RoleEnum.manager]:
        if current_user.agence_id and ticket.agence_id != current_user.agence_id:
            raise HTTPException(status_code=403, detail="Ticket d'une autre agence")

    # Mettre à jour le statut du ticket
    ticket.statut = StatutTicketEnum.en_cours

    if current_user.role == RoleEnum.agent:
        # Agent s'assigne lui-même
        ticket.agent_id = current_user.id
    elif current_user.role == RoleEnum.manager and agent_id:
        # Manager assigne un agent spécifique
        from app.models import User as UserModel
        target_agent = db.query(UserModel).filter(
            UserModel.id == agent_id,
            UserModel.role == RoleEnum.agent,
            UserModel.agence_id == current_user.agence_id
        ).first()
        if not target_agent:
            raise HTTPException(status_code=400, detail="Agent invalide ou non assigné à cette agence")
        ticket.agent_id = target_agent.id

    if guichet:
        ticket.guichet = guichet
    elif current_user.role == RoleEnum.agent and current_user.guichet:
        ticket.guichet = current_user.guichet

    db.commit()
    db.refresh(ticket)

    # Notification WebSocket
    await manager.send_to_channel(f"file/{ticket.agence_id}", "ticket_appele", {
        "numero_ticket": ticket.numero_ticket,
        "ticket_id": ticket.id,
        "guichet": ticket.guichet,
        "agent_id": ticket.agent_id,
    })
    if ticket.client_id:
        await creer_notification(
            db, ticket.client_id,
            f"C'est votre tour ! Ticket {ticket.numero_ticket} — Présentez-vous au {ticket.guichet or 'guichet'}",
            type_notif="ticket",
        )
    return {"ticket": ticket.numero_ticket, "message": "Client appelé", "guichet": ticket.guichet, "agent_id": ticket.agent_id}


@router.get("/{ticket_id}", response_model=TicketResponse)
async def get_ticket(ticket_id: int, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket introuvable")
    return _enrich_ticket_response(ticket, db)



@router.put("/{ticket_id}/statut", response_model=TicketResponse)
async def update_statut(
    ticket_id: int,
    body: TicketStatut,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models import StatutTicketEnum
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket introuvable")
    
    # VÉRIFICATION DE SÉCURITÉ : L'agent/manager ne peut modifier que les tickets de SON agence
    if current_user.role in [RoleEnum.agent, RoleEnum.manager]:
        if not current_user.agence_id:
            raise HTTPException(status_code=403, detail="Vous n'êtes assigné à aucune agence")
        if ticket.agence_id != current_user.agence_id:
            raise HTTPException(status_code=403, detail="Vous ne pouvez pas modifier un ticket d'une autre agence")
    # Directeur : peut modifier selon son institution
    elif current_user.role == RoleEnum.directeur and current_user.institution_id:
        from app.models import Agence
        agence = db.query(Agence).filter(Agence.id == ticket.agence_id).first()
        if not agence or agence.institution_id != current_user.institution_id:
            raise HTTPException(status_code=403, detail="Ce ticket n'appartient pas à votre institution")
    
    ancien_statut = ticket.statut
    ticket.statut = body.statut
    
    # Si un agent_id est spécifié dans le body, l'utiliser (pour assignation par manager)
    if hasattr(body, 'agent_id') and body.agent_id:
        # Vérifier que l'agent spécifié existe et appartient à la même agence
        from app.models import User
        agent = db.query(User).filter(User.id == body.agent_id).first()
        if agent and agent.role == RoleEnum.agent and agent.agence_id == ticket.agence_id:
            ticket.agent_id = body.agent_id
        else:
            raise HTTPException(status_code=400, detail="Agent invalide ou non assigné à cette agence")
    elif body.statut == StatutTicketEnum.en_cours and current_user.role == RoleEnum.agent:
        # Si c'est un agent qui met en cours, s'assigner lui-même
        ticket.agent_id = current_user.id
    
    db.commit()
    db.refresh(ticket)
    
    # Si le ticket est terminé, notifier le client pour qu'il disparaisse de son écran
    if body.statut == StatutTicketEnum.termine and ticket.client_id:
        # Notification WebSocket au client pour supprimer le ticket de son interface
        await manager.send_to_channel(f"notifications/{ticket.client_id}", "ticket_termine", {
            "ticket_id": ticket_id,
            "numero_ticket": ticket.numero_ticket,
            "message": "Votre ticket a été traité. Merci de votre visite !"
        })
        # Notification dans la file d'attente pour mise à jour
        await manager.send_to_channel(f"file/{ticket.agence_id}", "ticket_termine", {
            "ticket_id": ticket_id,
            "numero_ticket": ticket.numero_ticket,
            "client_id": ticket.client_id
        })
    
    # Mise à jour générale de la file
    await manager.update_queue(ticket.agence_id, {"ticket_id": ticket_id, "statut": body.statut})
    return ticket


@router.post("/{ticket_id}/absent")
async def marquer_absent(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Marque un client comme absent (non présent).
    Le ticket passe au statut 'absent' et est remis à la fin de la file.
    """
    from app.models import StatutTicketEnum
    
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket introuvable")
    
    # Vérifier que le ticket est dans l'agence de l'agent
    if current_user.agence_id and ticket.agence_id != current_user.agence_id:
        raise HTTPException(status_code=403, detail="Vous ne pouvez pas modifier ce ticket")
    
    # Vérifier que le ticket est en cours ou appelé
    if ticket.statut not in [StatutTicketEnum.en_cours, StatutTicketEnum.appele]:
        raise HTTPException(status_code=400, detail="Ce ticket ne peut pas être marqué comme absent")
    
    # Marquer comme absent
    ticket.statut = StatutTicketEnum.absent
    ticket.absent_count = (ticket.absent_count or 0) + 1
    ticket.last_absent_at = datetime.now()
    ticket.agent_id = None  # Libérer l'agent
    
    db.commit()
    db.refresh(ticket)
    
    # Notifier le client
    if ticket.client_id:
        await manager.send_to_channel(
            f"notifications/{ticket.client_id}",
            "client_absent",
            {
                "ticket_id": ticket_id,
                "numero_ticket": ticket.numero_ticket,
                "message": "Vous avez été marqué comme absent. Votre ticket est remis en file d'attente."
            }
        )
    
    # Mettre à jour la file
    await manager.update_queue(ticket.agence_id, {"ticket_id": ticket_id, "statut": "absent"})
    
    return {
        "message": "Client marqué comme absent",
        "ticket_id": ticket_id,
        "numero_ticket": ticket.numero_ticket,
        "nouveau_statut": ticket.statut
    }


@router.get("/surcharge/verifier")
async def verifier_surcharge(
    agence_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Vérifie s'il y a surcharge dans l'agence et suggère les agents en réserve à activer.
    """
    from app.services.surcharge_service import SurchargeDetector
    from app.models import Agence
    
    # Déterminer l'agence à vérifier
    target_agence_id = agence_id or current_user.agence_id
    
    if not target_agence_id:
        raise HTTPException(status_code=400, detail="Agence non spécifiée")
    
    # Vérifier les permissions
    if current_user.role == RoleEnum.manager:
        if target_agence_id != current_user.agence_id:
            raise HTTPException(status_code=403, detail="Vous ne pouvez vérifier que votre propre agence")
    elif current_user.role in [RoleEnum.admin, RoleEnum.directeur]:
        agence = db.query(Agence).filter(Agence.id == target_agence_id).first()
        if not agence or agence.institution_id != current_user.institution_id:
            raise HTTPException(status_code=403, detail="Accès non autorisé à cette agence")
    elif current_user.role == RoleEnum.agent:
        if target_agence_id != current_user.agence_id:
            raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    detector = SurchargeDetector(db)
    resultat = detector.detecter_surcharge(target_agence_id)
    
    return resultat


@router.post("/surcharge/activer-reserve/{agent_id}")
async def activer_agent_reserve(
    agent_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Active un agent en réserve (passe son statut de 'en_reserve' à 'disponible').
    Seuls les managers/admins/directeurs peuvent activer des agents.
    """
    from app.models import StatutAgentEnum
    
    # Récupérer l'agent
    agent = db.query(User).filter(
        User.id == agent_id,
        User.role == RoleEnum.agent,
        User.agent_status == StatutAgentEnum.en_reserve
    ).first()
    
    if not agent:
        raise HTTPException(status_code=404, detail="Agent en réserve introuvable")
    
    # Vérifier les permissions
    if current_user.role == RoleEnum.manager:
        if agent.agence_id != current_user.agence_id:
            raise HTTPException(status_code=403, detail="Vous ne pouvez activer que les agents de votre agence")
    elif current_user.role in [RoleEnum.admin, RoleEnum.directeur]:
        if agent.institution_id != current_user.institution_id:
            raise HTTPException(status_code=403, detail="Accès non autorisé")
    else:
        raise HTTPException(status_code=403, detail="Seuls les managers/admins/directeurs peuvent activer des agents")
    
    # Activer l'agent
    agent.agent_status = StatutAgentEnum.disponible
    db.commit()
    db.refresh(agent)
    
    # Notifier via WebSocket
    await manager.send_to_channel(
        f"dashboard/manager/{agent.agence_id}",
        "agent_activé",
        {
            "agent_id": agent.id,
            "nom": agent.nom,
            "message": f"✅ {agent.nom} a été activé et est maintenant disponible !"
        }
    )
    
    return {
        "message": f"Agent {agent.nom} activé avec succès",
        "agent_id": agent.id,
        "nouveau_statut": agent.agent_status
    }
