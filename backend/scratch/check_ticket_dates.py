from app.database import SessionLocal
from app.models import Ticket
from sqlalchemy import func

db = SessionLocal()
try:
    print("Total tickets:", db.query(Ticket).count())
    dates = db.query(func.date(Ticket.created_at), func.count(Ticket.id)).group_by(func.date(Ticket.created_at)).all()
    print("Tickets count per date:")
    for date, count in dates:
        print(f"  {date}: {count}")
finally:
    db.close()
