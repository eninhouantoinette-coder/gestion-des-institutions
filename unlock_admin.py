#!/usr/bin/env python3
"""
Script pour déverrouiller un compte admin
Usage: python unlock_admin.py <email_admin>
"""

import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Configuration base de données - ajustez selon votre config
DATABASE_URL = "mysql+pymysql://root:@localhost/banque_queue"

def unlock_user(email: str):
    """Déverrouille un utilisateur par email"""
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    db = SessionLocal()
    try:
        # Vérifier si l'utilisateur existe
        result = db.execute(
            text("SELECT id, nom, email, statut FROM users WHERE email = :email"),
            {"email": email}
        ).fetchone()
        
        if not result:
            print(f"❌ Utilisateur avec email '{email}' non trouvé")
            return False
        
        user_id, nom, email, statut = result
        print(f"🔍 Utilisateur trouvé: {nom} (ID: {user_id}, Email: {email}, Statut: {statut})")
        
        # Déverrouiller
        db.execute(
            text("""
                UPDATE users 
                SET statut = 'actif', 
                    tentatives_connexion = 0, 
                    verrouille_jusqu = NULL 
                WHERE email = :email
            """),
            {"email": email}
        )
        db.commit()
        
        print(f"✅ Compte {email} déverrouillé avec succès!")
        print(f"   - Statut: actif")
        print(f"   - Tentatives: 0")
        print(f"   - Verrouillage: supprimé")
        return True
        
    except Exception as e:
        db.rollback()
        print(f"❌ Erreur: {e}")
        return False
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python unlock_admin.py <email_admin>")
        print("Exemple: python unlock_admin.py admin@example.com")
        sys.exit(1)
    
    email = sys.argv[1]
    unlock_user(email)
