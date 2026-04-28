from sqlalchemy.orm import Session
from typing import Optional, List
from app.models import Notification, Alerte, User, StatutNotifEnum, NiveauAlerteEnum
from app.websocket.manager import manager
from app.utils.email import send_notification_email
import asyncio


async def creer_notification(
    db: Session,
    user_id: int,
    message: str,
    type_notif: str = "info",
    lien: Optional[str] = None,
    envoyer_email: bool = False,
) -> Notification:
    notif = Notification(
        user_id=user_id,
        message=message,
        type=type_notif,
        statut=StatutNotifEnum.non_lue,
        lien=lien,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)

    # Push WebSocket
    await manager.notify_user(user_id, "nouvelle_notification", {
        "id": notif.id,
        "message": message,
        "type": type_notif,
        "lien": lien,
    })

    # Email optionnel
    if envoyer_email:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            asyncio.create_task(
                send_notification_email(user.email, user.nom, "Nouvelle notification", message)
            )

    return notif


async def notifier_ticket_proche(db: Session, agence_id: int, tickets_avant: int = 2):
    """Notifie les clients dont le tour approche (tickets_avant personnes devant)."""
    from app.models import Ticket, StatutTicketEnum
    tickets = (
        db.query(Ticket)
        .filter(
            Ticket.agence_id == agence_id,
            Ticket.statut == StatutTicketEnum.en_attente,
            Ticket.position == tickets_avant + 1,
            Ticket.client_id.isnot(None),
        )
        .all()
    )
    for ticket in tickets:
        await creer_notification(
            db,
            ticket.client_id,
            f"Votre tour approche ! Vous êtes {tickets_avant + 1}e en file. Préparez-vous.",
            type_notif="ticket",
        )


async def creer_alerte(
    db: Session,
    type_alerte: str,
    message: str,
    niveau: NiveauAlerteEnum = NiveauAlerteEnum.faible,
    agence_id: Optional[int] = None,
    user_id: Optional[int] = None,
) -> Alerte:
    alerte = Alerte(
        type=type_alerte,
        message=message,
        niveau=niveau,
        agence_id=agence_id,
        user_id=user_id,
        statut="active",
    )
    db.add(alerte)
    db.commit()
    db.refresh(alerte)

    # Broadcast alerte selon le rôle et l'agence
    # Admin et directeur voient toutes les alertes de leur institution
    for role in ["directeur", "admin"]:
        await manager.broadcast_to_role(role, "alerte_declenchee", {
            "id": alerte.id,
            "type": type_alerte,
            "message": message,
            "niveau": niveau,
            "agence_id": agence_id,
        })
    
    # Manager et agent ne voient que les alertes de leur agence
    if agence_id:
        for role in ["manager", "agent"]:
            await manager.send_to_channel(f"dashboard/{role}/{agence_id}", "alerte_declenchee", {
                "id": alerte.id,
                "type": type_alerte,
                "message": message,
                "niveau": niveau,
                "agence_id": agence_id,
            })

    return alerte


async def verifier_seuil_file(db: Session, agence_id: int):
    """Déclenche une alerte si la file dépasse le seuil configuré."""
    from app.models import Ticket, StatutTicketEnum, SystemConfig
    # Forcer le seuil à 1 pour le test
    seuil = 1  # Ignorer la config de base pour test

    count = (
        db.query(Ticket)
        .filter(
            Ticket.agence_id == agence_id,
            Ticket.statut == StatutTicketEnum.en_attente,
        )
        .count()
    )

    print(f"[DEBUG] verifier_seuil_file - Agence {agence_id}: {count} tickets en attente (seuil: {seuil})")
    
    if count >= seuil:
        print(f"[DEBUG] Seuil dépassé! Création alerte pour agence {agence_id}")
        alerte = await creer_alerte(
            db,
            type_alerte="surcharge",
            message=f"La file d'attente dépasse {seuil} personnes ({count} en attente)",
            niveau=NiveauAlerteEnum.critique if count >= seuil * 1.5 else NiveauAlerteEnum.moyen,
            agence_id=agence_id,
        )
        print(f"[DEBUG] Alerte créée: ID={alerte.id}")
    else:
        print(f"[DEBUG] Seuil non atteint, pas d'alerte")
