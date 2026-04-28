from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.user import (
    UserCreate, LoginRequest, TokenResponse, ForgotPasswordRequest,
    ResetPasswordRequest, UserResponse, InstitutionRegisterRequest, ChangePasswordRequest
)
from app.services.auth_service import authenticate_user, create_tokens, get_user_by_email, get_current_user, hash_password
from app.utils.jwt import create_reset_token, decode_reset_token
from app.utils.email import send_reset_email
from app.utils.helpers import get_client_ip
from app.models import Log, User, RoleEnum, StatutUserEnum, Institution, TypeInstitutionEnum, StatutInstitutionEnum

router = APIRouter(prefix="/auth", tags=["Authentification"])


@router.post("/register-institution", response_model=TokenResponse, status_code=201)
async def register_institution(body: InstitutionRegisterRequest, request: Request, db: Session = Depends(get_db)):
    """Inscription d'une institution avec création automatique d'un admin."""
    
    # Vérifier si l'email institution existe déjà
    existing_inst = db.query(Institution).filter(Institution.email == body.institution_email).first()
    if existing_inst:
        raise HTTPException(status_code=400, detail="Cet email institution est déjà utilisé")
    
    # Vérifier si l'email admin existe déjà
    existing_user = db.query(User).filter(User.email == body.admin_email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Cet email administrateur est déjà utilisé")
    
    try:
        # 1. Créer l'institution
        institution = Institution(
            nom=body.institution_nom,
            type=TypeInstitutionEnum(body.institution_type),
            email=body.institution_email,
            telephone=body.institution_telephone,
            pays=body.institution_pays,
            ville=body.institution_ville,
            adresse=body.institution_adresse,
            statut=StatutInstitutionEnum.actif,
        )
        db.add(institution)
        db.flush()  # Pour obtenir l'ID
        
        # 2. Créer l'admin lié à l'institution
        admin = User(
            nom=body.admin_nom,
            email=body.admin_email,
            telephone=body.admin_telephone,
            mot_de_passe=hash_password(body.admin_mot_de_passe),
            role=RoleEnum.admin,
            statut=StatutUserEnum.actif,
            tentatives_connexion=0,
            institution_id=institution.id,
        )
        db.add(admin)
        db.flush()
        
        # 3. Log de création
        log = Log(
            user_id=admin.id,
            action="REGISTER_INSTITUTION",
            description=f"Inscription institution '{institution.nom}' par {admin.email}",
            ip_address=get_client_ip(request) if request else "unknown",
        )
        db.add(log)
        
        db.commit()
        db.refresh(admin)
        
        # 4. Créer les tokens
        tokens = create_tokens(admin)
        return {**tokens, "user": admin}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'inscription: {str(e)}")


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(body: UserCreate, request: Request, db: Session = Depends(get_db)):
    """Inscription d'un nouvel utilisateur (rôle client par défaut)."""
    # Vérifier si l'email existe déjà
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")

    # Créer l'utilisateur
    user = User(
        nom=body.nom,
        email=body.email,
        telephone=body.telephone,
        mot_de_passe=hash_password(body.mot_de_passe),
        role=RoleEnum.client,  # Force le rôle client pour l'inscription publique
        statut=StatutUserEnum.actif,
        tentatives_connexion=0,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Log de création
    log = Log(
        user_id=user.id,
        action="REGISTER",
        description=f"Inscription réussie - {user.email}",
        ip_address=get_client_ip(request) if request else "unknown",
    )
    db.add(log)
    db.commit()

    # Créer les tokens
    tokens = create_tokens(user)
    return {**tokens, "user": user}


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = authenticate_user(db, body.email, body.mot_de_passe, request)
    tokens = create_tokens(user)
    return {**tokens, "user": user}


@router.post("/logout", response_model=None)
async def logout(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    log = Log(
        user_id=current_user.id,
        action="LOGOUT",
        description="Déconnexion utilisateur",
    )
    db.add(log)
    db.commit()
    return {"message": "Déconnexion réussie"}


@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = get_user_by_email(db, body.email)
    # Toujours retourner 200 pour ne pas révéler si l'email existe
    if user:
        token = create_reset_token(user.email)
        await send_reset_email(user.email, user.nom, token)
    return {"message": "Si cet email existe, un lien de réinitialisation a été envoyé"}


@router.post("/reset-password")
async def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    email = decode_reset_token(body.token)
    if not email:
        raise HTTPException(status_code=400, detail="Token invalide ou expiré")
    user = get_user_by_email(db, email)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    user.mot_de_passe = hash_password(body.nouveau_mot_de_passe)
    db.commit()
    return {"message": "Mot de passe réinitialisé avec succès"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/change-password")
async def change_password(
    body: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Permet à l'utilisateur connecté de changer son mot de passe.
    """
    from app.services.auth_service import verify_password
    
    # Vérifier l'ancien mot de passe
    if not verify_password(body.current_password, current_user.mot_de_passe):
        raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect")
    
    # Mettre à jour le mot de passe
    current_user.mot_de_passe = hash_password(body.new_password)
    db.commit()
    
    return {"message": "Mot de passe changé avec succès"}
