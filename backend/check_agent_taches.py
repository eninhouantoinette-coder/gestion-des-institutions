import sys
sys.path.insert(0, 'c:\\xampp\\htdocs\\finance\\backend')

from app.database import SessionLocal
from app.models import Tache, StatutTacheEnum

db = SessionLocal()
try:
    # Tâches avec agent assigné et statut en_cours
    taches = db.query(Tache).filter(
        Tache.agent_id.isnot(None),
        Tache.statut == StatutTacheEnum.en_cours
    ).all()
    
    print(f"Tâches assignées en cours: {len(taches)}")
    for t in taches:
        print(f"- {t.titre} (ID: {t.id}, Agent: {t.agent_id}, Agence: {t.agence_id})")
        if t.ticket_id:
            print(f"  Ticket ID: {t.ticket_id}")
        
finally:
    db.close()
