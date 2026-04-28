from sqlalchemy.orm import Session
from typing import List, Optional
from app.models import Ticket, Service, User, StatutTicketEnum, Rendezvous, StatutRdvEnum
from app.utils.helpers import (
    generate_ticket_number,
    get_ticket_prefix,
    generate_qr_code_base64,
    calculate_wait_time,
    calculate_priority_score,
)
import json


def get_next_sequence(db: Session, agence_id: int, prefix: str) -> int:
    """Retourne le prochain numéro de séquence pour un préfixe donné."""
    last = (
        db.query(Ticket)
        .filter(
            Ticket.agence_id == agence_id,
            Ticket.numero_ticket.like(f"{prefix}%"),
        )
        .order_by(Ticket.id.desc())
        .first()
    )
    if not last:
        return 1
    try:
        return int(last.numero_ticket[len(prefix):]) + 1
    except ValueError:
        return 1


def compter_rendezvous_actifs(
    db: Session,
    agence_id: int,
    service_id: int,
) -> int:
    """Compte les rendez-vous confirmés pour ce service/agence qui n'ont pas encore été traités."""
    from datetime import datetime
    now = datetime.now()
    current_time = f"{now.hour:02d}:{now.minute:02d}"
    
    return (
        db.query(Rendezvous)
        .filter(
            Rendezvous.agence_id == agence_id,
            Rendezvous.service_id == service_id,
            Rendezvous.statut.in_([StatutRdvEnum.confirme, StatutRdvEnum.en_attente]),
            Rendezvous.date_rdv == now.strftime("%Y-%m-%d"),
            Rendezvous.heure_rdv <= current_time,
        )
        .count()
    )


def generer_ticket(
    db: Session,
    agence_id: int,
    service_id: int,
    client_id: Optional[int] = None,
    client_nom: Optional[str] = None,
    est_urgent: bool = False,
) -> Ticket:
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Service introuvable")

    prefix = get_ticket_prefix(service.nom)
    seq = get_next_sequence(db, agence_id, prefix)
    numero = generate_ticket_number(prefix, seq)

    # Compter les tickets existants en attente
    tickets_en_attente = (
        db.query(Ticket)
        .filter(
            Ticket.agence_id == agence_id,
            Ticket.service_id == service_id,
            Ticket.statut == StatutTicketEnum.en_attente,
        )
        .count()
    )
    
    # Compter les rendez-vous prioritaires (clients avec RDV passent avant les tickets)
    rdv_prioritaires = compter_rendezvous_actifs(db, agence_id, service_id)
    
    # La position = nombre de RDV prioritaires + nombre de tickets en attente + 1
    position = rdv_prioritaires + tickets_en_attente + 1
    
    # Vérifier si un ticket a été généré très récemment (même seconde) = conflit possible
    from datetime import datetime, timedelta
    recent_ticket = (
        db.query(Ticket)
        .filter(
            Ticket.agence_id == agence_id,
            Ticket.service_id == service_id,
            Ticket.statut == StatutTicketEnum.en_attente,
            Ticket.created_at >= datetime.utcnow() - timedelta(seconds=2)
        )
        .first()
    )
    
    position_ajustee = recent_ticket is not None  # True si conflit détecté

    # Temps d'attente fixe à 15 minutes
    temps_estime = 15

    # Score de priorité
    anciennete = 0
    if client_id:
        user = db.query(User).filter(User.id == client_id).first()
        if user and user.created_at:
            from datetime import datetime
            anciennete = (datetime.utcnow() - user.created_at).days

    priority_score = calculate_priority_score(
        est_urgent=est_urgent,
        anciennete_jours=anciennete,
    )

    # QR code
    qr_data = json.dumps({
        "ticket": numero,
        "agence_id": agence_id,
        "service_id": service_id,
    })
    qr_code = generate_qr_code_base64(qr_data)

    # Calculer l'heure estimée de passage AVANT de créer le ticket
    from datetime import datetime, timedelta
    now = datetime.now()
    # Heure estimée = maintenant + (position * durée moyenne du service en minutes)
    minutes_attente = position * service.duree_moyenne
    heure_estimee = now + timedelta(minutes=minutes_attente)
    heure_estimee_str = heure_estimee.strftime("%H:%M")

    ticket = Ticket(
        client_id=client_id,
        agence_id=agence_id,
        service_id=service_id,
        numero_ticket=numero,
        position=position,
        temps_estime=temps_estime,
        priorite_score=priority_score,
        statut=StatutTicketEnum.en_attente,
        qr_code=qr_code,
        client_nom=client_nom,
        heure_estimee=heure_estimee_str,  # STOCKÉ EN BASE DE DONNÉES
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    
    # Ajouter les flags dynamiques (non persistés)
    ticket.position_ajustee = position_ajustee
    ticket.rdv_prioritaires = rdv_prioritaires
    
    return ticket


def get_file_attente(db: Session, agence_id: int) -> List[Ticket]:
    """Retourne la file d'attente triée par priorité décroissante puis par ID."""
    return (
        db.query(Ticket)
        .filter(
            Ticket.agence_id == agence_id,
            Ticket.statut == StatutTicketEnum.en_attente,
        )
        .order_by(Ticket.priorite_score.desc(), Ticket.id.asc())
        .all()
    )


def appeler_suivant(db: Session, agence_id: int, service_id: Optional[int] = None) -> Optional[Ticket]:
    """Appelle le prochain ticket en file et met à jour les positions."""
    query = db.query(Ticket).filter(
        Ticket.agence_id == agence_id,
        Ticket.statut == StatutTicketEnum.en_attente,
    )
    if service_id:
        query = query.filter(Ticket.service_id == service_id)

    ticket = query.order_by(Ticket.priorite_score.desc(), Ticket.id.asc()).first()
    if not ticket:
        return None

    ticket.statut = StatutTicketEnum.appele
    db.commit()

    # Recalculer positions des tickets restants avec temps fixe 15 min
    remaining = get_file_attente(db, agence_id)
    for i, t in enumerate(remaining):
        t.position = i + 1
        t.temps_estime = 15
    db.commit()
    db.refresh(ticket)
    return ticket


def get_position_ticket(db: Session, ticket_id: int) -> Optional[dict]:
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        return None
    return {
        "ticket_id": ticket.id,
        "numero_ticket": ticket.numero_ticket,
        "position": ticket.position,
        "temps_estime": ticket.temps_estime,
        "statut": ticket.statut,
    }
