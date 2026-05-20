import sys
sys.path.insert(0, 'c:\\xampp\\htdocs\\finance\\backend')

from app.database import SessionLocal
from app.models import Ticket, StatutTicketEnum

db = SessionLocal()
try:
    # Tous les tickets
    all_tickets = db.query(Ticket).all()
    print(f"Total tickets: {len(all_tickets)}")
    
    # Tickets par statut
    for statut in StatutTicketEnum:
        count = db.query(Ticket).filter(Ticket.statut == statut).count()
        print(f"{statut.value}: {count}")
    
    # Tickets en attente avec détails
    waiting = db.query(Ticket).filter(Ticket.statut == StatutTicketEnum.en_attente).all()
    print(f"\nTickets en attente: {len(waiting)}")
    for t in waiting:
        print(f"- {t.numero_ticket} (ID: {t.id}, Agence: {t.agence_id}, Service: {t.service_id})")
    
    # Tickets en cours
    in_progress = db.query(Ticket).filter(Ticket.statut == StatutTicketEnum.en_cours).all()
    print(f"\nTickets en cours: {len(in_progress)}")
    for t in in_progress:
        print(f"- {t.numero_ticket} (ID: {t.id}, Agence: {t.agence_id}, Agent: {t.agent_id})")
        
finally:
    db.close()
