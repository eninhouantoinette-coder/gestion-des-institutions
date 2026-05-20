import sys
sys.path.insert(0, 'c:\\xampp\\htdocs\\finance\\backend')

from app.database import SessionLocal
from app.models import Tache, StatutTacheEnum

db = SessionLocal()
try:
    # Toutes les tâches
    all_taches = db.query(Tache).all()
    print(f"Total tâches: {len(all_taches)}")
    
    # Tâches par statut
    for statut in StatutTacheEnum:
        count = db.query(Tache).filter(Tache.statut == statut).count()
        print(f"{statut.value}: {count}")
    
    # Tâches a_faire avec détails
    a_faire = db.query(Tache).filter(Tache.statut == StatutTacheEnum.a_faire).all()
    print(f"\nTâches à faire: {len(a_faire)}")
    for t in a_faire:
        print(f"- {t.titre} (ID: {t.id}, Agence: {t.agence_id}, Agent: {t.agent_id})")
        
finally:
    db.close()
