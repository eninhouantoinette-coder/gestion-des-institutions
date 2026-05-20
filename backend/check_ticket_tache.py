import sys
sys.path.insert(0, 'c:\\xampp\\htdocs\\finance\\backend')

from app.database import SessionLocal
from app.models import Tache, Ticket, StatutTacheEnum, StatutTicketEnum

db = SessionLocal()
try:
    # Trouver la tâche T013
    tache = db.query(Tache).filter(Tache.titre.like('%T013%')).first()
    if tache:
        print(f"Tâche: {tache.titre}")
        print(f"Statut: {tache.statut}")
        print(f"Agent ID: {tache.agent_id}")
        print(f"Ticket ID: {tache.ticket_id}")
        
        if tache.ticket_id:
            ticket = db.query(Ticket).filter(Ticket.id == tache.ticket_id).first()
            if ticket:
                print(f"\nTicket associé: {ticket.numero_ticket}")
                print(f"Statut ticket: {ticket.statut}")
                print(f"Agent ticket: {ticket.agent_id}")
    else:
        print("Tâche T013 non trouvée")
        
finally:
    db.close()
