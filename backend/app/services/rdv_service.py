from sqlalchemy.orm import Session
from typing import List, Optional
from app.models import Rendezvous, Creneau, StatutRdvEnum, StatutCreneauEnum
from app.schemas.rendezvous import RendezvousCreate
from fastapi import HTTPException
from datetime import datetime, timedelta


def check_disponibilite(db: Session, agence_id: int, service_id: int, date: str, heure: str) -> bool:
    """Vérifie si un créneau est disponible."""
    creneau = (
        db.query(Creneau)
        .filter(
            Creneau.agence_id == agence_id,
            Creneau.service_id == service_id,
            Creneau.date == date,
            Creneau.heure_debut <= heure,
            Creneau.heure_fin > heure,
            Creneau.statut == StatutCreneauEnum.disponible,
        )
        .first()
    )
    if not creneau:
        return False
    return creneau.places_reservees < creneau.capacite


def detect_conflit(db: Session, client_id: int, date: str, heure: str) -> Optional[str]:
    """Détecte un conflit horaire et propose un décalage de 20 min."""
    existing = (
        db.query(Rendezvous)
        .filter(
            Rendezvous.client_id == client_id,
            Rendezvous.date_rdv == date,
            Rendezvous.heure_rdv == heure,
            Rendezvous.statut.in_([StatutRdvEnum.en_attente, StatutRdvEnum.confirme]),
        )
        .first()
    )
    if existing:
        # Décalage automatique +20 minutes
        h, m = map(int, heure.split(":"))
        total = h * 60 + m + 20
        new_h, new_m = divmod(total, 60)
        return f"{new_h:02d}:{new_m:02d}"
    return None


def trouver_prochain_creneau(db: Session, agence_id: int, service_id: int, date: str, heure: str) -> str:
    """Trouve le prochain créneau disponible en cas de conflit (+30 min)."""
    # Vérifier s'il y a déjà un rendez-vous à cette heure dans la même agence/service
    existing = (
        db.query(Rendezvous)
        .filter(
            Rendezvous.agence_id == agence_id,
            Rendezvous.service_id == service_id,
            Rendezvous.date_rdv == date,
            Rendezvous.heure_rdv == heure,
            Rendezvous.statut.in_([StatutRdvEnum.en_attente, StatutRdvEnum.confirme]),
        )
        .order_by(Rendezvous.id.asc())
        .all()
    )
    
    if not existing:
        return heure  # Pas de conflit, garder l'heure demandée
    
    # Calculer la nouvelle heure (+30 min pour le prochain client)
    h, m = map(int, heure.split(":"))
    total = h * 60 + m + 30
    new_h, new_m = divmod(total, 60)
    nouvelle_heure = f"{new_h:02d}:{new_m:02d}"
    
    # Vérifier récursivement si le nouveau créneau est aussi occupé
    conflit_nouveau = (
        db.query(Rendezvous)
        .filter(
            Rendezvous.agence_id == agence_id,
            Rendezvous.service_id == service_id,
            Rendezvous.date_rdv == date,
            Rendezvous.heure_rdv == nouvelle_heure,
            Rendezvous.statut.in_([StatutRdvEnum.en_attente, StatutRdvEnum.confirme]),
        )
        .first()
    )
    
    if conflit_nouveau:
        # Recursivité : trouver le prochain créneau disponible
        return trouver_prochain_creneau(db, agence_id, service_id, date, nouvelle_heure)
    
    return nouvelle_heure


def creer_rendezvous(db: Session, data: RendezvousCreate, client_id: int) -> Rendezvous:
    # Trouver le prochain créneau disponible (gère les conflits automatiquement)
    heure_finale = trouver_prochain_creneau(
        db, data.agence_id, data.service_id, data.date_rdv, data.heure_rdv
    )

    # Vérifier si l'heure a été modifiée (conflit détecté)
    heure_modifiee = heure_finale != data.heure_rdv

    rdv = Rendezvous(
        client_id=client_id,
        agence_id=data.agence_id,
        service_id=data.service_id,
        creneau_id=data.creneau_id,
        date_rdv=data.date_rdv,
        heure_rdv=heure_finale,
        statut=StatutRdvEnum.confirme,
        notes=data.notes,
    )
    db.add(rdv)

    # Mettre à jour le créneau
    if data.creneau_id:
        creneau = db.query(Creneau).filter(Creneau.id == data.creneau_id).first()
        if creneau:
            creneau.places_reservees += 1
            if creneau.places_reservees >= creneau.capacite:
                creneau.statut = StatutCreneauEnum.complet

    db.commit()
    db.refresh(rdv)
    
    # Ajouter le flag pour indiquer si l'heure a été modifiée
    rdv.heure_modifiee = heure_modifiee
    
    return rdv


def get_rdv_client(db: Session, client_id: int) -> List[Rendezvous]:
    return (
        db.query(Rendezvous)
        .filter(Rendezvous.client_id == client_id)
        .order_by(Rendezvous.date_rdv.desc())
        .all()
    )


def annuler_rendezvous(db: Session, rdv_id: int, user_id: int) -> Rendezvous:
    rdv = db.query(Rendezvous).filter(Rendezvous.id == rdv_id).first()
    if not rdv:
        raise HTTPException(status_code=404, detail="Rendez-vous introuvable")

    rdv.statut = StatutRdvEnum.annule

    # Libérer la place dans le créneau
    if rdv.creneau_id:
        creneau = db.query(Creneau).filter(Creneau.id == rdv.creneau_id).first()
        if creneau and creneau.places_reservees > 0:
            creneau.places_reservees -= 1
            creneau.statut = StatutCreneauEnum.disponible

    db.commit()
    db.refresh(rdv)
    return rdv
