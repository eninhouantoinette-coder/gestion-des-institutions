#!/usr/bin/env python3
"""Script pour vérifier les données réelles dans la base de données"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Ticket, Agence, StatutTicketEnum
from datetime import datetime, timedelta
from app.database import DATABASE_URL

def verifier_donnees_reelles():
    """Vérifier les données réelles dans la base"""
    
    # Connexion à la base
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    db = Session()
    
    try:
        print("=== VÉRIFICATION DES DONNÉES RÉELLES ===")
        
        # Date il y a 30 jours
        date_30_jours = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        print(f"Période analysée: depuis {date_30_jours}")
        
        # Lister toutes les agences
        agences = db.query(Agence).all()
        print(f"\nNombre d'agences: {len(agences)}")
        
        for agence in agences:
            print(f"\n--- AGENCE: {agence.nom} (ID: {agence.id}) ---")
            
            # Volume total (tous les tickets depuis 30 jours)
            tickets_total = db.query(Ticket).filter(
                Ticket.agence_id == agence.id,
                Ticket.created_at >= date_30_jours
            ).count()
            
            # Tickets traités (terminés)
            tickets_termines = db.query(Ticket).filter(
                Ticket.agence_id == agence.id,
                Ticket.statut == StatutTicketEnum.termine,
                Ticket.created_at >= date_30_jours
            ).count()
            
            # Tickets en attente
            tickets_en_attente = db.query(Ticket).filter(
                Ticket.agence_id == agence.id,
                Ticket.statut == StatutTicketEnum.en_attente,
                Ticket.created_at >= date_30_jours
            ).count()
            
            # Tickets absents
            tickets_absents = db.query(Ticket).filter(
                Ticket.agence_id == agence.id,
                Ticket.statut == StatutTicketEnum.absent,
                Ticket.created_at >= date_30_jours
            ).count()
            
            print(f"Volume Clients (tous les tickets): {tickets_total}")
            print(f"Tickets Traités (terminés): {tickets_termines}")
            print(f"Tickets En attente: {tickets_en_attente}")
            print(f"Tickets Absents: {tickets_absents}")
            
            # Taux de traitement réel
            if tickets_total > 0:
                taux_traitement = round((tickets_termines / tickets_total) * 100)
                print(f"Taux de traitement réel: {taux_traitement}%")
            else:
                print(f"Taux de traitement: N/A (pas de tickets)")
            
            # Satisfaction (proxy basé sur absence)
            total_finished = tickets_termines + tickets_absents
            if total_finished > 0:
                satisfaction = round((tickets_termines / total_finished) * 100)
                print(f"Satisfaction réelle: {satisfaction}%")
            else:
                print(f"Satisfaction: N/A")
        
        print("\n=== VÉRIFICATION DES DERNIERS TICKETS ===")
        
        # Afficher les 5 derniers tickets créés
        derniers_tickets = db.query(Ticket).order_by(Ticket.created_at.desc()).limit(5).all()
        
        for ticket in derniers_tickets:
            print(f"Ticket {ticket.id}: Agence {ticket.agence_id} - Statut: {ticket.statut} - Créé: {ticket.created_at}")
            
    except Exception as e:
        print(f"ERREUR: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    verifier_donnees_reelles()
