from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Boolean, Float,
    ForeignKey, Enum, JSON, func
)
from sqlalchemy.orm import relationship
from app.database import Base
import enum


# ─── Enums ─────────────────────────────────────────────────────────────────

class RoleEnum(str, enum.Enum):
    client = "client"
    agent = "agent"
    manager = "manager"
    directeur = "directeur"
    admin = "admin"

class StatutUserEnum(str, enum.Enum):
    actif = "actif"
    inactif = "inactif"
    verrouille = "verrouille"

class StatutAgentEnum(str, enum.Enum):
    disponible = "disponible"
    occupe = "occupe"
    en_pause = "en_pause"
    indisponible = "indisponible"
    en_reserve = "en_reserve"

class StatutRdvEnum(str, enum.Enum):
    en_attente = "en_attente"
    confirme = "confirme"
    annule = "annule"
    termine = "termine"
    no_show = "no_show"

class StatutTicketEnum(str, enum.Enum):
    en_attente = "en_attente"
    appele = "appele"
    en_cours = "en_cours"
    termine = "termine"
    annule = "annule"
    absent = "absent"

class StatutTacheEnum(str, enum.Enum):
    a_faire = "a_faire"
    en_cours = "en_cours"
    termine = "termine"
    annule = "annule"

class PrioriteEnum(str, enum.Enum):
    faible = "faible"
    normale = "normale"
    haute = "haute"
    urgente = "urgente"

class StatutCreneauEnum(str, enum.Enum):
    disponible = "disponible"
    complet = "complet"
    ferme = "ferme"

class NiveauAlerteEnum(str, enum.Enum):
    faible = "faible"
    moyen = "moyen"
    critique = "critique"

class StatutNotifEnum(str, enum.Enum):
    non_lue = "non_lue"
    lue = "lue"


class TypeInstitutionEnum(str, enum.Enum):
    banque = "banque"
    microfinance = "microfinance"


class StatutInstitutionEnum(str, enum.Enum):
    actif = "actif"
    inactif = "inactif"
    suspendu = "suspendu"


# ─── Modèles ───────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nom = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    telephone = Column(String(20))
    mot_de_passe = Column(String(255), nullable=False)
    role = Column(Enum(RoleEnum), nullable=False, default=RoleEnum.client)
    statut = Column(Enum(StatutUserEnum), default=StatutUserEnum.actif)
    tentatives_connexion = Column(Integer, default=0)
    verrouille_jusqu = Column(DateTime, nullable=True)
    agence_id = Column(Integer, ForeignKey("agences.id"), nullable=True)
    institution_id = Column(Integer, ForeignKey("institution.id"), nullable=True)
    guichet = Column(String(20), nullable=True)  # Numéro de guichet pour les agents
    agent_status = Column(Enum(StatutAgentEnum), nullable=True)  # Statut de disponibilité pour les agents
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    agence = relationship("Agence", back_populates="users")
    institution = relationship("Institution", back_populates="users")
    rendezvous = relationship("Rendezvous", back_populates="client", foreign_keys="Rendezvous.client_id")
    tickets = relationship("Ticket", back_populates="client", foreign_keys="Ticket.client_id")
    taches = relationship("Tache", back_populates="agent", foreign_keys="Tache.agent_id")
    notifications = relationship("Notification", back_populates="user")
    logs = relationship("Log", back_populates="user")


class Agence(Base):
    __tablename__ = "agences"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String(150), nullable=False)
    adresse = Column(Text)
    capacite = Column(Integer, default=50)
    horaires = Column(JSON)
    institution_id = Column(Integer, ForeignKey("institution.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    institution = relationship("Institution", back_populates="agences")
    users = relationship("User", back_populates="agence")
    creneaux = relationship("Creneau", back_populates="agence")
    rendezvous = relationship("Rendezvous", back_populates="agence")
    tickets = relationship("Ticket", back_populates="agence")
    alertes = relationship("Alerte", back_populates="agence")
    predictions = relationship("Prediction", back_populates="agence")
    statistiques = relationship("Statistique", back_populates="agence")


class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String(150), nullable=False)
    description = Column(Text)
    duree_moyenne = Column(Integer, default=15)  # minutes
    institution_id = Column(Integer, ForeignKey("institution.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    institution = relationship("Institution", back_populates="services")
    creneaux = relationship("Creneau", back_populates="service")
    rendezvous = relationship("Rendezvous", back_populates="service")
    tickets = relationship("Ticket", back_populates="service")
    taches = relationship("Tache", back_populates="service")


class Creneau(Base):
    __tablename__ = "creneaux"

    id = Column(Integer, primary_key=True, index=True)
    agence_id = Column(Integer, ForeignKey("agences.id"), nullable=False)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=False)
    date = Column(String(20), nullable=False)          # YYYY-MM-DD
    heure_debut = Column(String(10), nullable=False)   # HH:MM
    heure_fin = Column(String(10), nullable=False)
    capacite = Column(Integer, default=1)
    places_reservees = Column(Integer, default=0)
    statut = Column(Enum(StatutCreneauEnum), default=StatutCreneauEnum.disponible)
    created_at = Column(DateTime, server_default=func.now())

    agence = relationship("Agence", back_populates="creneaux")
    service = relationship("Service", back_populates="creneaux")
    rendezvous = relationship("Rendezvous", back_populates="creneau")


class Rendezvous(Base):
    __tablename__ = "rendezvous"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    agence_id = Column(Integer, ForeignKey("agences.id"), nullable=False)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=False)
    creneau_id = Column(Integer, ForeignKey("creneaux.id"), nullable=True)
    date_rdv = Column(String(20), nullable=False)
    heure_rdv = Column(String(10), nullable=False)
    statut = Column(Enum(StatutRdvEnum), default=StatutRdvEnum.en_attente)
    notes = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    client = relationship("User", back_populates="rendezvous", foreign_keys=[client_id])
    agence = relationship("Agence", back_populates="rendezvous")
    service = relationship("Service", back_populates="rendezvous")
    creneau = relationship("Creneau", back_populates="rendezvous")


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    agence_id = Column(Integer, ForeignKey("agences.id"), nullable=False)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=False)
    agent_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Agent assigné
    numero_ticket = Column(String(10), nullable=False)
    position = Column(Integer, default=0)
    temps_estime = Column(Integer, default=0)  # minutes
    priorite_score = Column(Float, default=0.0)
    statut = Column(Enum(StatutTicketEnum), default=StatutTicketEnum.en_attente)
    guichet = Column(String(20), nullable=True)  # Guichet où se présenter
    qr_code = Column(Text)
    client_nom = Column(String(100))  # Pour tickets sans compte
    heure_estimee = Column(String(5), nullable=True)  # Heure estimée calculée à la création (HH:MM)
    nb_reports = Column(Integer, default=0)  # Nombre de fois où le client n'a pas été présent
    absent_count = Column(Integer, default=0)  # Nombre de fois marqué absent
    last_absent_at = Column(DateTime, nullable=True)  # Dernière fois marqué absent
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    client = relationship("User", back_populates="tickets", foreign_keys=[client_id])
    agent = relationship("User", foreign_keys=[agent_id])
    agence = relationship("Agence", back_populates="tickets")
    service = relationship("Service", back_populates="tickets")


class Tache(Base):
    __tablename__ = "taches"

    id = Column(Integer, primary_key=True, index=True)
    agence_id = Column(Integer, ForeignKey("agences.id"), nullable=False)  # Agence de la tâche
    agent_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    client_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=True)  # Ticket associé
    rdv_id = Column(Integer, ForeignKey("rendezvous.id"), nullable=True)   # RDV associé
    titre = Column(String(200), nullable=False)
    description = Column(Text)
    statut = Column(Enum(StatutTacheEnum), default=StatutTacheEnum.a_faire)
    priorite = Column(Enum(PrioriteEnum), default=PrioriteEnum.normale)
    date_echeance = Column(String(20))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    agence = relationship("Agence")
    agent = relationship("User", back_populates="taches", foreign_keys=[agent_id])
    client = relationship("User", foreign_keys=[client_id])
    service = relationship("Service", back_populates="taches")
    affectations = relationship("Affectation", back_populates="tache")


class Affectation(Base):
    __tablename__ = "affectations"

    id = Column(Integer, primary_key=True, index=True)
    tache_id = Column(Integer, ForeignKey("taches.id"), nullable=False)
    agent_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    score = Column(Float, default=0.0)
    statut = Column(String(50), default="proposee")  # proposee, acceptee, refusee
    created_at = Column(DateTime, server_default=func.now())

    tache = relationship("Tache", back_populates="affectations")
    agent = relationship("User")


class Alerte(Base):
    __tablename__ = "alertes"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String(50), nullable=False)
    message = Column(Text, nullable=False)
    niveau = Column(Enum(NiveauAlerteEnum), default=NiveauAlerteEnum.faible)
    agence_id = Column(Integer, ForeignKey("agences.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    statut = Column(String(50), default="active")
    created_at = Column(DateTime, server_default=func.now())
    resolved_at = Column(DateTime, nullable=True)

    agence = relationship("Agence", back_populates="alertes")
    user = relationship("User")


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    agence_id = Column(Integer, ForeignKey("agences.id"), nullable=False)
    date_prevision = Column(String(20), nullable=False)
    niveau_affluence = Column(String(50))
    charge_estimee = Column(Float)
    nb_agents_recommandes = Column(Integer)
    recommandations = Column(JSON)
    created_at = Column(DateTime, server_default=func.now())

    agence = relationship("Agence", back_populates="predictions")


class Statistique(Base):
    __tablename__ = "statistiques"

    id = Column(Integer, primary_key=True, index=True)
    agence_id = Column(Integer, ForeignKey("agences.id"), nullable=True)
    agent_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=True)
    total_clients = Column(Integer, default=0)
    temps_moyen_traitement = Column(Float, default=0.0)
    taux_satisfaction = Column(Float, default=0.0)
    taux_annulation = Column(Float, default=0.0)
    date_stat = Column(String(20), nullable=False)
    periode = Column(String(20), default="jour")  # jour, semaine, mois

    agence = relationship("Agence", back_populates="statistiques")
    agent = relationship("User")
    service = relationship("Service")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default="info")
    statut = Column(Enum(StatutNotifEnum), default=StatutNotifEnum.non_lue)
    lien = Column(String(255))
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="notifications")


class Log(Base):
    __tablename__ = "logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)
    description = Column(Text)
    ip_address = Column(String(45))
    user_agent = Column(String(255))
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="logs")


class SystemConfig(Base):
    __tablename__ = "system_config"

    id = Column(Integer, primary_key=True, index=True)
    cle = Column(String(100), unique=True, nullable=False)
    valeur = Column(Text)
    description = Column(Text)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Institution(Base):
    __tablename__ = "institution"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nom = Column(String(150), nullable=False)
    type = Column(Enum(TypeInstitutionEnum), nullable=False)
    email = Column(String(150), unique=True, nullable=False)
    telephone = Column(String(20), nullable=False)
    pays = Column(String(100))
    ville = Column(String(100))
    adresse = Column(Text)
    logo = Column(String(255))
    statut = Column(Enum(StatutInstitutionEnum), default=StatutInstitutionEnum.actif)
    date_creation = Column(DateTime, server_default=func.now())
    date_modification = Column(DateTime, server_default=func.now(), onupdate=func.now())

    agences = relationship("Agence", back_populates="institution")
    users = relationship("User", back_populates="institution")
    services = relationship("Service", back_populates="institution")
