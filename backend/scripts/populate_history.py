import sys
import os
import random
from datetime import datetime, timedelta

# Ajouter le chemin du backend pour les imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import Ticket, Agence, Service, StatutTicketEnum

def populate():
    db = SessionLocal()
    try:
        agences = db.query(Agence).all()
        services = db.query(Service).all()
        
        # Nettoyer l'ancien historique pour repartir sur du propre
        print("Nettoyage de l'ancien historique...")
        db.query(Ticket).delete()
        db.commit()
        
        if not agences or not services:
            print("Erreur: Aucune agence ou service trouvé. Lancez setup_db d'abord.")
            return

        print(f"Génération de l'historique pour {len(agences)} agences...")
        
        # Récupérer les agents par agence pour l'assignation
        from app.models import User, RoleEnum
        agents_par_agence = {}
        for agence in agences:
            agents = db.query(User).filter(User.agence_id == agence.id, User.role == RoleEnum.agent).all()
            agents_par_agence[agence.id] = agents

        # Générer sur les 30 derniers jours
        for i in range(30):
            date_base = datetime.now() - timedelta(days=i)
            for agence in agences:
                nb_tickets = random.randint(10, 30)
                agents_dispo = agents_par_agence.get(agence.id, [])
                
                for _ in range(nb_tickets):
                    service = random.choice(services)
                    
                    # Heure aléatoire
                    heure = random.randint(8, 17)
                    minute = random.randint(0, 59)
                    created_at = date_base.replace(hour=heure, minute=minute)
                    
                    # Déterminer agent et guichet
                    agent_id = None
                    guichet = "Guichet Central"
                    if agents_dispo:
                        selected_agent = random.choice(agents_dispo)
                        agent_id = selected_agent.id
                        guichet = selected_agent.guichet or f"Guichet {random.randint(1, 5)}"

                    wait_minutes = random.randint(5, 45)
                    called_at = created_at + timedelta(minutes=wait_minutes)
                    process_minutes = random.randint(10, 25)
                    finished_at = called_at + timedelta(minutes=process_minutes)
                    
                    statut = random.choices(
                        [StatutTicketEnum.termine, StatutTicketEnum.absent],
                        weights=[90, 10]
                    )[0]
                    
                    ticket = Ticket(
                        agence_id=agence.id,
                        service_id=service.id,
                        agent_id=agent_id,
                        guichet=guichet,
                        numero_ticket=f"{random.choice(['A','B','C','D'])}{random.randint(100, 999)}",
                        statut=statut,
                        created_at=created_at,
                        updated_at=called_at if statut == StatutTicketEnum.absent else finished_at,
                        client_nom=f"Client_{random.randint(1, 1000)}"
                    )
                    db.add(ticket)
            
            print(f"   Jour {i+1}/30 traité...")
            db.commit()
            
        print("Fini ! Historique généré avec succès.")
        
    finally:
        db.close()

if __name__ == "__main__":
    populate()
