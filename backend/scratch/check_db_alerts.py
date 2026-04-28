
from app.database import SessionLocal
from app.models import Alerte, User
import json

def check_alerts():
    db = SessionLocal()
    try:
        alerts = db.query(Alerte).all()
        print(f"Total alerts in DB: {len(alerts)}")
        for a in alerts:
            print(f"ID: {a.id}, Type: {a.type}, Statut: {a.statut}, AgenceID: {a.agence_id}, Message: {a.message[:30]}...")
        
        users = db.query(User).all()
        print(f"\nUsers:")
        for u in users:
            print(f"ID: {u.id}, Nom: {u.nom}, Role: {u.role}, AgenceID: {u.agence_id}")
            
    finally:
        db.close()

if __name__ == "__main__":
    check_alerts()
