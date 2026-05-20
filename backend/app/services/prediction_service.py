from sqlalchemy.orm import Session
from typing import Optional, List
import os
import random
from datetime import datetime, timedelta
from sqlalchemy import func

from app.models import Statistique, Ticket, User, StatutTicketEnum

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "ml_models")
os.makedirs(MODEL_DIR, exist_ok=True)


def _get_historical_data(db: Session, agence_id: int, days_back: int = 30):
    """Récupère les volumes de tickets passés pour une agence."""
    from datetime import datetime, timedelta
    cutoff = datetime.now() - timedelta(days=days_back)
    return db.query(Ticket).filter(
        Ticket.agence_id == agence_id,
        Ticket.created_at >= cutoff
    ).all()

def predire_affluence(db: Session, agence_id: int, date_cible: Optional[str] = None) -> dict:
    """Prédit le niveau d'affluence basé sur la moyenne historique par jour de la semaine."""
    if date_cible:
        try:
            d = datetime.strptime(date_cible, "%Y-%m-%d")
        except:
            d = datetime.now()
    else:
        d = datetime.now()

    # Logique réelle : Moyenne des tickets sur le même jour de la semaine (4 dernières semaines)
    target_weekday = d.weekday()

    # Calculer les 4 dates correspondantes dans le passé
    past_dates = [(d - timedelta(weeks=i)).strftime("%Y-%m-%d") for i in range(1, 5)]

    total_past_tickets = 0
    valid_days = 0

    for pd in past_dates:
        count = db.query(Ticket).filter(
            Ticket.agence_id == agence_id,
            func.date(Ticket.created_at) == pd
        ).count()
        if count > 0: # On ne compte que les jours où il y a eu de l'activité
            total_past_tickets += count
            valid_days += 1

    print(f"[DEBUG] Agence {agence_id}: total_past_tickets={total_past_tickets}, valid_days={valid_days}")

    # Moyenne ou estimation par défaut si pas d'historique (ex: script de peuplement)
    if valid_days > 0:
        estimation = round(total_past_tickets / valid_days)
    else:
        # Fallback intelligent
        estimation = 45 if target_weekday < 5 else 15
        
    if estimation < 30:
        niveau = "faible"
    elif estimation < 60:
        niveau = "moyen"
    elif estimation < 100:
        niveau = "eleve"
    else:
        niveau = "critique"

    # 1 agent peut gérer ~15 tickets/jour
    nb_agents_recommandes = max(1, round(estimation / 15))

    return {
        "agence_id": agence_id,
        "date_prevision": d.strftime("%Y-%m-%d"),
        "clients_estimes": estimation,
        "niveau_affluence": niveau,
        "charge_estimee": round(min(1.0, estimation / 120), 2),
        "nb_agents_recommandes": nb_agents_recommandes,
        "recommandations": _generer_recommandations(niveau, nb_agents_recommandes, d),
    }


def predire_charge_agents(db: Session, agence_id: int) -> dict:
    """Prédit la charge réelle actuelle basée sur la file d'attente vs agents dispo."""
    from app.models import StatutAgentEnum

    # 1. Nombre de clients en attente
    attente_count = db.query(Ticket).filter(
        Ticket.agence_id == agence_id,
        Ticket.statut == StatutTicketEnum.en_attente
    ).count()

    # 2. Nombre d'agents disponibles (tous les agents de l'agence)
    agents_dispo = db.query(User).filter(
        User.agence_id == agence_id,
        User.role == "agent"
    ).count()

    print(f"[DEBUG] Agence {agence_id}: tickets_en_attente={attente_count}, agents_dispo={agents_dispo}")

    if agents_dispo == 0:
        # Si aucun agent disponible, charge basée sur hypothèse de 3 agents minimum
        charge = min(1.0, attente_count / 15.0)
    else:
        # Un ratio de 5 clients par agent est considéré comme une charge de 100%
        charge = min(1.0, attente_count / (agents_dispo * 5))

    return {
        "agence_id": agence_id,
        "charge_estimee": round(charge, 3),
        "charge_pourcentage": round(charge * 100, 1),
        "statut": "critique" if charge > 0.8 else "eleve" if charge > 0.6 else "normal",
        "clients_attente": attente_count,
        "agents_actifs": agents_dispo
    }


def estimer_temps_attente(db: Session, service_id: int, agence_id: int) -> dict:
    """Estime le temps d'attente actuel."""
    from app.models import Service
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        return {"temps_estime": 0, "personnes_en_attente": 0}

    count = (
        db.query(Ticket)
        .filter(
            Ticket.agence_id == agence_id,
            Ticket.service_id == service_id,
            Ticket.statut == StatutTicketEnum.en_attente,
        )
        .count()
    )
    # Utiliser une durée moyenne par défaut si service.duree_moyenne est 0 ou non défini
    duree_moyenne = service.duree_moyenne if service.duree_moyenne and service.duree_moyenne > 0 else 10  # 10 minutes par défaut
    temps = count * duree_moyenne

    return {
        "service_id": service_id,
        "agence_id": agence_id,
        "personnes_en_attente": count,
        "duree_moyenne_service": service.duree_moyenne,
        "temps_estime_minutes": temps,
    }


def simuler_scenario(db: Session, agence_id: int, scenario: str, params: dict) -> dict:
    """Simule des scénarios : rush, absence agents, panne."""
    base = predire_affluence(db, agence_id)
    clients = base["clients_estimes"]
    agents_dispo = params.get("nb_agents", base["nb_agents_recommandes"])

    if scenario == "rush":
        clients = int(clients * 1.8)
    elif scenario == "absence_agents":
        agents_dispo = max(1, agents_dispo - params.get("absents", 2))
    elif scenario == "panne":
        agents_dispo = max(1, agents_dispo // 2)

    temps_attente_moyen = round((clients / max(agents_dispo, 1)) * 15, 1)
    surcharge = clients > agents_dispo * 20

    return {
        "scenario": scenario,
        "clients_prevus": clients,
        "agents_disponibles": agents_dispo,
        "temps_attente_moyen_min": temps_attente_moyen,
        "surcharge_prevue": surcharge,
        "recommandations": _generer_recommandations(
            "critique" if surcharge else "moyen", agents_dispo, datetime.now()
        ),
    }


def _generer_recommandations(niveau: str, nb_agents: int, date: datetime) -> List[str]:
    recs = []
    if niveau in ["eleve", "critique"]:
        recs.append(f"Mobiliser {nb_agents} agents minimum pour cette période")
        recs.append("Activer la file d'attente virtuelle SMS")
    if date.weekday() == 0:
        recs.append("Lundi : prévoir +30% de capacité (pic hebdomadaire)")
    if niveau == "critique":
        recs.append("Envisager d'ouvrir un guichet supplémentaire")
        recs.append("Alerter le manager de permanence")
    if not recs:
        recs.append("Charge normale prévue — configuration standard recommandée")
    return recs


def retrain_models(db: Session):
    """Mock du réentraînement (sans ML)"""
    from app.models import Agence
    agences = db.query(Agence).all()
    print(f"[ML-Mock] Modèles 'réentraînés' pour {len(agences)} agence(s)")
