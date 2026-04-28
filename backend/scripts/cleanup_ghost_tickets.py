from app.database import SessionLocal
from app.models import Ticket
from datetime import datetime, timedelta

db = SessionLocal()
try:
    # Nettoyer les tickets actifs qui datent de plus de 12 heures (considérés comme oubliés)
    hier = datetime.now() - timedelta(hours=12)
    n = db.query(Ticket).filter(
        Ticket.statut.in_(['en_attente', 'en_cours', 'appele']),
        Ticket.created_at < hier
    ).update({Ticket.statut: 'annule'}, synchronize_session=False)
    
    db.commit()
    print(f"[OK] {n} tickets fantômes ont été clôturés pour rendre les stats logiques.")
finally:
    db.close()
