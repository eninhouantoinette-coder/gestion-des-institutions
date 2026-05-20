from app.database import SessionLocal
from app.models import Tache, Ticket, User

db = SessionLocal()
try:
    print("--- LAST 5 TASKS ---")
    taches = db.query(Tache).order_by(Tache.id.desc()).limit(5).all()
    for t in taches:
        agent = db.query(User).filter(User.id == t.agent_id).first()
        agent_name = agent.nom if agent else "None"
        print(f"ID: {t.id}, Agent: {agent_name} (ID: {t.agent_id}), Title: {t.titre}, Statut: {t.statut}, Agence: {t.agence_id}")

    print("\n--- LAST 5 TICKETS IN PROGRESS ---")
    tickets = db.query(Ticket).filter(Ticket.statut == 'en_cours').order_by(Ticket.id.desc()).limit(5).all()
    for tk in tickets:
        agent = db.query(User).filter(User.id == tk.agent_id).first()
        agent_name = agent.nom if agent else "None"
        print(f"ID: {tk.id}, Num: {tk.numero_ticket}, Agent: {agent_name} (ID: {tk.agent_id}), Statut: {tk.statut}, Agence: {tk.agence_id}")
finally:
    db.close()
