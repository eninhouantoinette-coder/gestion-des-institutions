import traceback, sys
sys.path.append('.')
from app.database import SessionLocal
from app.routers.tickets import list_tickets
from app.models import User
import asyncio

async def main():
    db = SessionLocal()
    try:
        user = db.query(User).first()
        if not user:
            print("No users found in database.")
            return
        
        # Test call
        res = await list_tickets(agence_id=None, statut='en_attente', db=db, current_user=user)
        print("SUCCESS", len(res))
    except Exception as e:
        traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(main())
