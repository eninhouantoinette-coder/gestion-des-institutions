
import os
import sys
from sqlalchemy.orm import Session

# Add current directory to path
sys.path.append(os.getcwd())

from app.database import SessionLocal
from app.models import Alerte, User, RoleEnum
from app.routers.notifications import list_alertes
import asyncio

async def test_list_alertes():
    db = SessionLocal()
    try:
        # Simulate a manager from Agence 2
        user = db.query(User).filter(User.role == RoleEnum.manager, User.agence_id == 2).first()
        if not user:
            print("No manager found for agence 2")
            return
            
        print(f"Testing for user: {user.nom}, ID: {user.id}, Agence: {user.agence_id}")
        
        # Call the function directly
        result = await list_alertes(agence_id=user.agence_id, db=db, current_user=user)
        
        print(f"Results returned: {len(result)}")
        for a in result:
            print(f"Alert ID: {a.id}, Message: {a.message[:20]}, Agence: {a.agence_id}, Statut: {a.statut}")
            
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_list_alertes())
