import traceback, sys
sys.path.append('.')
from app.database import SessionLocal
from app.services.auth_service import authenticate_user
db = SessionLocal()
try:
    authenticate_user(db, 'admin@example.com', 'password')
    print('SUCCESS')
except Exception as e:
    traceback.print_exc()
