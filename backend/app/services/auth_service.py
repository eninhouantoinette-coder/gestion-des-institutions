import bcrypt
from sqlalchemy.orm import Session
from fastapi import HTTPException, status, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime, timedelta
from typing import Optional
import os

from app.models import User, Log, StatutUserEnum, RoleEnum
from app.utils.jwt import create_access_token, create_refresh_token, verify_token
from app.utils.helpers import get_client_ip

MAX_ATTEMPTS = int(os.getenv("MAX_LOGIN_ATTEMPTS", 5))
LOCKOUT_MINUTES = int(os.getenv("LOCKOUT_DURATION_MINUTES", 15))

security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password[:72].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain[:72].encode('utf-8'), hashed.encode('utf-8'))


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()


def authenticate_user(db: Session, email: str, password: str, request: Request = None):
    user = get_user_by_email(db, email)
    if not user:
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

    # Vérification verrouillage
    if user.statut == StatutUserEnum.verrouille:
        if user.verrouille_jusqu and datetime.utcnow() < user.verrouille_jusqu:
            raise HTTPException(
                status_code=403,
                detail=f"Compte verrouillé. Réessayez après {user.verrouille_jusqu.strftime('%H:%M')}"
            )
        else:
            # Déverrouillage automatique
            user.statut = StatutUserEnum.actif
            user.tentatives_connexion = 0
            user.verrouille_jusqu = None
            db.commit()

    if user.statut == StatutUserEnum.inactif:
        raise HTTPException(status_code=403, detail="Compte désactivé. Contactez l'administrateur.")

    if not verify_password(password, user.mot_de_passe):
        user.tentatives_connexion += 1
        if user.tentatives_connexion >= MAX_ATTEMPTS:
            user.statut = StatutUserEnum.verrouille
            user.verrouille_jusqu = datetime.utcnow() + timedelta(minutes=LOCKOUT_MINUTES)
        db.commit()
        remaining = MAX_ATTEMPTS - user.tentatives_connexion
        raise HTTPException(
            status_code=401,
            detail=f"Mot de passe incorrect. {max(0, remaining)} tentative(s) restante(s)"
        )

    # Reset tentatives
    user.tentatives_connexion = 0
    db.commit()

    # Log connexion
    log = Log(
        user_id=user.id,
        action="LOGIN",
        description=f"Connexion réussie - rôle: {user.role}",
        ip_address=get_client_ip(request) if request else "unknown",
    )
    db.add(log)
    db.commit()

    return user


def create_tokens(user: User) -> dict:
    payload = {"sub": str(user.id), "role": user.role, "email": user.email}
    return {
        "access_token": create_access_token(payload),
        "refresh_token": create_refresh_token(payload),
        "token_type": "bearer",
    }


async def get_current_user(
    credentials = Depends(security),
    db = None,
) -> User:
    from app.database import SessionLocal
    if credentials is None:
        raise HTTPException(status_code=401, detail="Token manquant")
    token = credentials.credentials
    payload = verify_token(token, "access")
    if not payload:
        raise HTTPException(status_code=401, detail="Token invalide ou expiré")
    user_id = int(payload.get("sub"))
    _db = db or SessionLocal()
    user = _db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="Utilisateur introuvable")
    if user.statut != StatutUserEnum.actif:
        raise HTTPException(status_code=403, detail="Compte inactif ou verrouillé")
    return user


def require_roles(*roles: RoleEnum):
    async def dependency(current_user: User = None) -> User:
        if current_user.role not in roles:
            raise HTTPException(status_code=403, detail="Accès interdit pour ce rôle")
        return current_user
    return dependency
