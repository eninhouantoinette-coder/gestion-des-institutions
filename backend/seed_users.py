"""Script de seed pour créer les utilisateurs de base."""
import bcrypt
from sqlalchemy.orm import Session
from app.database import SessionLocal, create_tables
from app.models import User, RoleEnum, StatutUserEnum


def hash_password(password: str) -> str:
    """Hash un mot de passe avec bcrypt."""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def seed_users():
    """Crée les utilisateurs de base si ils n'existent pas."""
    db = SessionLocal()
    try:
        users_data = [
            {
                "nom": "Administrateur",
                "email": "admin@banque.com",
                "mot_de_passe": "admin123",
                "role": RoleEnum.admin,
                "telephone": "+225 01 02 03 04 05",
            },
            {
                "nom": "Manager",
                "email": "manager@banque.com",
                "mot_de_passe": "manager123",
                "role": RoleEnum.manager,
                "telephone": "+225 01 02 03 04 06",
            },
            {
                "nom": "Agent",
                "email": "agent@banque.com",
                "mot_de_passe": "agent123",
                "role": RoleEnum.agent,
                "telephone": "+225 01 02 03 04 07",
            },
            {
                "nom": "Client",
                "email": "client@banque.com",
                "mot_de_passe": "client123",
                "role": RoleEnum.client,
                "telephone": "+225 01 02 03 04 08",
            },
        ]

        created_count = 0
        for user_data in users_data:
            existing = db.query(User).filter(User.email == user_data["email"]).first()
            if not existing:
                user = User(
                    nom=user_data["nom"],
                    email=user_data["email"],
                    mot_de_passe=hash_password(user_data["mot_de_passe"][:72]),
                    role=user_data["role"],
                    telephone=user_data.get("telephone"),
                    statut=StatutUserEnum.actif,
                    tentatives_connexion=0,
                )
                db.add(user)
                created_count += 1
                print(f"  [OK] Cree: {user_data['nom']} ({user_data['email']}) - {user_data['role']}")
            else:
                print(f"  [INFO] Existe deja: {user_data['email']}")

        db.commit()
        print(f"\n[SUCCES] {created_count} utilisateur(s) cree(s) avec succes!")
        print("\nIdentifiants de connexion:")
        print("  Admin:    admin@banque.com / admin123")
        print("  Manager:  manager@banque.com / manager123")
        print("  Agent:    agent@banque.com / agent123")
        print("  Client:   client@banque.com / client123")

    except Exception as e:
        db.rollback()
        print(f"[ERREUR] {e}")
    finally:
        db.close()


if __name__ == "__main__":
    print(" Creation des tables et seed des utilisateurs...")
    create_tables()
    seed_users()
