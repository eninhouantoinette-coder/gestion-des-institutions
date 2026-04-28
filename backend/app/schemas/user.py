from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime
from app.models import RoleEnum, StatutUserEnum, StatutAgentEnum


class InstitutionRegisterRequest(BaseModel):
    """Inscription d'une institution avec admin automatique"""
    # Institution
    institution_nom: str
    institution_type: str  # 'banque' ou 'microfinance'
    institution_email: EmailStr
    institution_telephone: str
    institution_pays: Optional[str] = None
    institution_ville: Optional[str] = None
    institution_adresse: Optional[str] = None

    # Admin
    admin_nom: str
    admin_email: EmailStr
    admin_telephone: Optional[str] = None
    admin_mot_de_passe: str

    @field_validator("admin_mot_de_passe")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 6:
            raise ValueError("Le mot de passe doit contenir au moins 6 caractères")
        return v

    @field_validator("institution_type")
    @classmethod
    def validate_type(cls, v):
        if v not in ['banque', 'microfinance']:
            raise ValueError("Le type doit être 'banque' ou 'microfinance'")
        return v


class UserCreate(BaseModel):
    nom: str
    email: EmailStr
    telephone: Optional[str] = None
    mot_de_passe: str
    role: RoleEnum = RoleEnum.client
    agence_id: Optional[int] = None
    guichet: Optional[str] = None  # Numéro de guichet pour les agents

    @field_validator("mot_de_passe")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 6:
            raise ValueError("Le mot de passe doit contenir au moins 6 caractères")
        return v


class UserUpdate(BaseModel):
    nom: Optional[str] = None
    telephone: Optional[str] = None
    agence_id: Optional[int] = None
    guichet: Optional[str] = None  # Numéro de guichet pour les agents
    agent_status: Optional[StatutAgentEnum] = None  # Statut de disponibilité pour les agents


class UserStatut(BaseModel):
    statut: StatutUserEnum


class UserResetPassword(BaseModel):
    nouveau_mot_de_passe: str

    @field_validator("nouveau_mot_de_passe")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 6:
            raise ValueError("Le mot de passe doit contenir au moins 6 caractères")
        return v


class ChangePasswordRequest(BaseModel):
    """Changement de mot de passe par l'utilisateur connecté"""
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 6:
            raise ValueError("Le mot de passe doit contenir au moins 6 caractères")
        return v


class UserResponse(BaseModel):
    id: int
    nom: str
    email: str
    telephone: Optional[str]
    role: RoleEnum
    statut: StatutUserEnum
    agence_id: Optional[int]
    guichet: Optional[str] = None  # Numéro de guichet pour les agents
    agent_status: Optional[StatutAgentEnum] = None  # Statut de disponibilité pour les agents
    created_at: datetime

    model_config = {"from_attributes": True}


class UserPublic(BaseModel):
    id: int
    nom: str
    role: RoleEnum
    agence_id: Optional[int]
    guichet: Optional[str] = None  # Numéro de guichet pour les agents
    agent_status: Optional[StatutAgentEnum] = None  # Statut de disponibilité pour les agents

    model_config = {"from_attributes": True}


class AgentStatusUpdate(BaseModel):
    """Schema pour mettre à jour le statut d'un agent"""
    agent_status: StatutAgentEnum


class LoginRequest(BaseModel):
    email: EmailStr
    mot_de_passe: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    nouveau_mot_de_passe: str


class AgentStatusResponse(BaseModel):
    """Réponse avec le statut actuel de l'agent"""
    user_id: int
    nom: str
    agent_status: StatutAgentEnum
    updated_at: datetime

    model_config = {"from_attributes": True}
