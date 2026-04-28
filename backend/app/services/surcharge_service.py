"""
Service de détection et gestion de surcharge.
Détecte quand la file d'attente est surchargée et suggère l'activation des agents en réserve.
"""
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from app.models import (
    Ticket, User, Agence, 
    StatutTicketEnum, RoleEnum, StatutAgentEnum
)


class SurchargeDetector:
    """Détecte les situations de surcharge dans une agence"""
    
    # Seuils de surcharge (configurables)
    SEUIL_TICKETS_EN_ATTENTE = 15  # Nombre de tickets considéré comme surcharge
    SEUIL_TEMPS_ATTENTE_MINUTES = 60  # Temps d'attente moyen critique (minutes)
    SEUIL_RATIO_AGENT_TICKET = 0.5  # Ratio agents disponibles / tickets
    
    def __init__(self, db: Session):
        self.db = db
    
    def detecter_surcharge(self, agence_id: int) -> Dict[str, Any]:
        """
        Analyse la situation de l'agence et détecte une éventuelle surcharge.
        
        Retourne:
        {
            'surcharge_detectee': bool,
            'niveau_surcharge': str,  # 'faible', 'moyen', 'critique'
            'tickets_en_attente': int,
            'agents_disponibles': int,
            'agents_en_reserve': int,
            'temps_attente_moyen': float,  # en minutes
            'suggestions': List[dict]  # Agents en réserve suggérés
        }
        """
        # Compter les tickets en attente
        tickets_en_attente = self.db.query(Ticket).filter(
            Ticket.agence_id == agence_id,
            Ticket.statut.in_([StatutTicketEnum.en_attente, StatutTicketEnum.appele])
        ).count()
        
        # Compter les agents disponibles
        agents_disponibles = self.db.query(User).filter(
            User.agence_id == agence_id,
            User.role == RoleEnum.agent,
            User.agent_status.in_([StatutAgentEnum.disponible, StatutAgentEnum.occupe])
        ).count()
        
        # Compter les agents en réserve
        agents_en_reserve = self.db.query(User).filter(
            User.agence_id == agence_id,
            User.role == RoleEnum.agent,
            User.agent_status == StatutAgentEnum.en_reserve
        ).all()
        
        # Calculer le temps d'attente moyen estimé
        temps_attente_moyen = self._calculer_temps_attente_moyen(agence_id, tickets_en_attente)
        
        # Déterminer le niveau de surcharge
        niveau_surcharge = self._evaluer_niveau_surcharge(
            tickets_en_attente, 
            agents_disponibles, 
            temps_attente_moyen
        )
        
        # Préparer les suggestions d'agents en réserve
        suggestions = []
        if niveau_surcharge in ['moyen', 'critique'] and agents_en_reserve:
            nb_suggestions = 1 if niveau_surcharge == 'moyen' else min(2, len(agents_en_reserve))
            for agent in agents_en_reserve[:nb_suggestions]:
                suggestions.append({
                    'agent_id': agent.id,
                    'nom': agent.nom,
                    'guichet': agent.guichet,
                    'message': f"Activer {agent.nom} (guichet {agent.guichet or 'N/A'})"
                })
        
        return {
            'surcharge_detectee': niveau_surcharge != 'normal',
            'niveau_surcharge': niveau_surcharge,
            'tickets_en_attente': tickets_en_attente,
            'agents_disponibles': agents_disponibles,
            'agents_en_reserve_count': len(agents_en_reserve),
            'temps_attente_moyen': temps_attente_moyen,
            'suggestions': suggestions
        }
    
    def _calculer_temps_attente_moyen(self, agence_id: int, tickets_en_attente: int) -> float:
        """Calcule le temps d'attente moyen estimé en minutes"""
        if tickets_en_attente == 0:
            return 0.0
        
        # Récupérer le temps moyen de traitement par ticket (15 min par défaut)
        temps_traitement_moyen = 15
        
        # Récupérer les agents actifs
        agents_actifs = self.db.query(User).filter(
            User.agence_id == agence_id,
            User.role == RoleEnum.agent,
            User.agent_status.in_([StatutAgentEnum.disponible, StatutAgentEnum.occupe])
        ).count()
        
        if agents_actifs == 0:
            return float('inf')  # Infini si aucun agent
        
        # Calcul: (nombre de tickets × temps moyen) / nombre d'agents
        temps_estime = (tickets_en_attente * temps_traitement_moyen) / agents_actifs
        return round(temps_estime, 1)
    
    def _evaluer_niveau_surcharge(
        self, 
        tickets: int, 
        agents_disponibles: int, 
        temps_attente: float
    ) -> str:
        """Évalue le niveau de surcharge"""
        
        score = 0
        
        # Critère 1: Nombre de tickets
        if tickets >= self.SEUIL_TICKETS_EN_ATTENTE * 2:
            score += 3  # Critique
        elif tickets >= self.SEUIL_TICKETS_EN_ATTENTE:
            score += 2  # Moyen
        elif tickets >= self.SEUIL_TICKETS_EN_ATTENTE // 2:
            score += 1  # Faible
        
        # Critère 2: Temps d'attente
        if temps_attente >= self.SEUIL_TEMPS_ATTENTE_MINUTES * 2:
            score += 3
        elif temps_attente >= self.SEUIL_TEMPS_ATTENTE_MINUTES:
            score += 2
        elif temps_attente >= self.SEUIL_TEMPS_ATTENTE_MINUTES // 2:
            score += 1
        
        # Critère 3: Ratio agents/tickets
        if agents_disponibles > 0:
            ratio = agents_disponibles / max(tickets, 1)
            if ratio < 0.25:
                score += 3
            elif ratio < 0.5:
                score += 2
            elif ratio < 1:
                score += 1
        else:
            score += 3  # Pas d'agents = surcharge critique
        
        # Déterminer le niveau
        if score >= 6:
            return 'critique'
        elif score >= 3:
            return 'moyen'
        elif score >= 1:
            return 'faible'
        return 'normal'


async def notifier_surcharge_manager(agence_id: int, donnees_surcharge: Dict[str, Any]):
    """
    Envoie une notification WebSocket au manager de l'agence en cas de surcharge.
    """
    message = {
        'event': 'surcharge_detectee',
        'data': {
            'agence_id': agence_id,
            'niveau': donnees_surcharge['niveau_surcharge'],
            'tickets_en_attente': donnees_surcharge['tickets_en_attente'],
            'temps_attente_moyen': donnees_surcharge['temps_attente_moyen'],
            'suggestions': donnees_surcharge['suggestions'],
            'message': f"⚠️ Surcharge détectée ! {donnees_surcharge['tickets_en_attente']} tickets en attente."
        }
    }
    
    # Envoyer au canal dashboard/manager/agence_id
    from app.websocket.manager import manager
    await manager.send_to_channel(
        f"dashboard/manager/{agence_id}",
        "surcharge_detectee",
        message['data']
    )


def verifier_et_notifier_surcharge(db: Session, agence_id: int) -> bool:
    """
    Vérifie s'il y a surcharge et envoie une notification si nécessaire.
    Retourne True si une surcharge a été détectée.
    """
    import asyncio
    
    detector = SurchargeDetector(db)
    resultat = detector.detecter_surcharge(agence_id)
    
    if resultat['surcharge_detectee']:
        # Envoyer la notification de manière asynchrone
        asyncio.create_task(notifier_surcharge_manager(agence_id, resultat))
        return True
    
    return False
