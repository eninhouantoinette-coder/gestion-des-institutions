
import asyncio
import os
import sys

# Add current directory to path
sys.path.append(os.getcwd())

from app.database import SessionLocal
from app.models import Alerte, User, RoleEnum

def check_db():
    db = SessionLocal()
    try:
        print("Checking Alerts...")
        alerts = db.query(Alerte).all()
        print(f"Total alerts: {len(alerts)}")
        for a in alerts:
            print(f"ID: {a.id}, Type: {a.type}, Statut: {a.statut}, AgenceID: {a.agence_id}")
        
        print("\nChecking Users...")
        users = db.query(User).all()
        for u in users:
            print(f"User ID: {u.id}, Nom: {u.nom}, Role: {u.role}, AgenceID: {u.agence_id}")
            
    finally:
        db.close()

if __name__ == "__main__":
    check_db()
