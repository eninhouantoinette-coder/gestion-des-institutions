"""Script pour réinitialiser le mot de passe d'un utilisateur."""
import bcrypt
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import User, StatutUserEnum

def hash_password(password: str) -> str:
    """Hash un mot de passe avec bcrypt."""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def reset_password(email: str, new_password: str):
    """Réinitialise le mot de passe d'un utilisateur."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"[ERREUR] Utilisateur avec email '{email}' non trouvé")
            return False
        
        # Réinitialiser le mot de passe
        user.mot_de_passe = hash_password(new_password[:72])
        # Déverrouiller le compte
        user.statut = StatutUserEnum.actif
        user.tentatives_connexion = 0
        user.verrouille_jusqu = None
        
        db.commit()
        print(f"[SUCCES] Mot de passe réinitialisé pour: {user.nom} ({email})")
        print(f"[INFO] Nouveau mot de passe: {new_password}")
        print(f"[INFO] Compte déverrouillé et activé")
        return True
    except Exception as e:
        db.rollback()
        print(f"[ERREUR] {e}")
        return False
    finally:
        db.close()

if __name__ == "__main__":
    # Modifier ici l'email et le nouveau mot de passe
    EMAIL = "tontontoni@gmail.com"
    NOUVEAU_MOT_DE_PASSE = "admin123"
    
    print(f"Réinitialisation du mot de passe pour: {EMAIL}")
    reset_password(EMAIL, NOUVEAU_MOT_DE_PASSE)
