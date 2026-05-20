from sqlalchemy.orm import Session
from app.models import Ticket, Tache, StatutTicketEnum, StatutTacheEnum, Rendezvous, StatutRdvEnum

def sync_taches_from_ticket_status(db: Session, ticket: Ticket, new_statut: StatutTicketEnum):
    """
    Met à jour le statut des tâches associées à un ticket lorsque le statut du ticket change.
    """
    taches = db.query(Tache).filter(Tache.ticket_id == ticket.id).all()
    for tache in taches:
        target_statut = None
        if new_statut == StatutTicketEnum.en_attente:
            target_statut = StatutTacheEnum.a_faire
        elif new_statut in [StatutTicketEnum.appele, StatutTicketEnum.en_cours]:
            target_statut = StatutTacheEnum.en_cours
        elif new_statut == StatutTicketEnum.termine:
            target_statut = StatutTacheEnum.termine
        elif new_statut in [StatutTicketEnum.annule, StatutTicketEnum.absent]:
            target_statut = StatutTacheEnum.annule

        if target_statut and tache.statut != target_statut:
            tache.statut = target_statut
            # Si le ticket a un agent affecté, synchroniser également l'agent de la tâche
            if ticket.agent_id and tache.agent_id != ticket.agent_id:
                tache.agent_id = ticket.agent_id
            db.add(tache)


def sync_ticket_or_rdv_from_task_status(db: Session, tache: Tache, new_statut: StatutTacheEnum):
    """
    Met à jour le statut du ticket ou du rendez-vous associé à une tâche lorsque le statut de la tâche change.
    """
    if tache.ticket_id:
        ticket = db.query(Ticket).filter(Ticket.id == tache.ticket_id).first()
        if ticket:
            target_statut = None
            if new_statut == StatutTacheEnum.a_faire:
                target_statut = StatutTicketEnum.en_attente
            elif new_statut == StatutTacheEnum.en_cours:
                target_statut = StatutTicketEnum.en_cours
            elif new_statut == StatutTacheEnum.termine:
                target_statut = StatutTicketEnum.termine
            elif new_statut == StatutTacheEnum.annule:
                target_statut = StatutTicketEnum.annule

            if target_statut and ticket.statut != target_statut:
                ticket.statut = target_statut
                # Si annulé, libérer l'agent
                if target_statut == StatutTicketEnum.annule:
                    ticket.agent_id = None
                db.add(ticket)

    if tache.rdv_id:
        rdv = db.query(Rendezvous).filter(Rendezvous.id == tache.rdv_id).first()
        if rdv:
            target_statut = None
            if new_statut == StatutTacheEnum.a_faire:
                target_statut = StatutRdvEnum.confirme
            elif new_statut == StatutTacheEnum.en_cours:
                # Si la tâche est mise en cours, le RDV peut être considéré en cours
                pass
            elif new_statut == StatutTacheEnum.termine:
                target_statut = StatutRdvEnum.termine
            elif new_statut == StatutTacheEnum.annule:
                target_statut = StatutRdvEnum.annule

            if target_statut and rdv.statut != target_statut:
                rdv.statut = target_statut
                db.add(rdv)
