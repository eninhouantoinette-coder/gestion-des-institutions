"""Reset et recrée les utilisateurs avec mots de passe valides."""
import bcrypt
from sqlalchemy.orm import Session
from app.database import SessionLocal, create_tables
from app.models import User, RoleEnum, StatutUserEnum


def hash_password(password: str) -> str:
    """Hash un mot de passe avec bcrypt (tronqué à 72 bytes)."""
    return bcrypt.hashpw(password[:72].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def reset_users():
    """Supprime et recrée les utilisateurs de base."""
    db = SessionLocal()
    try:
        # Supprimer les utilisateurs existants
        emails = ["admin@banque.com", "manager@banque.com", "agent@banque.com", "client@banque.com"]
        for email in emails:
            user = db.query(User).filter(User.email == email).first()
            if user:
                db.delete(user)
                print(f"  [SUPPRESSION] {email}")
        db.commit()
        print("  Utilisateurs supprimes\n")

        # Recréer les utilisateurs
        users_data = [
            {"nom": "Administrateur", "email": "admin@banque.com", "password": "admin123", "role": RoleEnum.admin},
            {"nom": "Directeur", "email": "directeur@banque.com", "password": "directeur123", "role": RoleEnum.directeur},
            {"nom": "Manager", "email": "manager@banque.com", "password": "manager123", "role": RoleEnum.manager},
            {"nom": "Agent", "email": "agent@banque.com", "password": "agent123", "role": RoleEnum.agent},
            {"nom": "Client", "email": "client@banque.com", "password": "client123", "role": RoleEnum.client},
        ]

        for data in users_data:
            user = User(
                nom=data["nom"],
                email=data["email"],
                mot_de_passe=hash_password(data["password"]),
                role=data["role"],
                statut=StatutUserEnum.actif,
                tentatives_connexion=0,
            )
            db.add(user)
            print(f"  [CREATION] {data['email']} ({data['role']})")

        db.commit()
        print("\n[SUCCES] Utilisateurs recrees avec mots de passe valides!")
        print("\nIdentifiants:")
        print("  admin@banque.com / admin123")
        print("  manager@banque.com / manager123")
        print("  agent@banque.com / agent123")
        print("  client@banque.com / client123")

    except Exception as e:
        db.rollback()
        print(f"[ERREUR] {e}")
    finally:
        db.close()


if __name__ == "__main__":
    print("[RESET] Recreation des utilisateurs...")
    reset_users()
