import asyncio
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.models import Base, Alerte, NiveauAlerteEnum
from app.services.notification_service import creer_alerte

def creer_alerte_test():
    db = SessionLocal()
    try:
        # Créer une alerte de test pour l'agence 2 (votre agence)
        alerte = asyncio.run(creer_alerte(
            db=db,
            type_alerte="surcharge",
            message="Surcharge détectée (MOYEN) - 5 tickets en attente • ~75 min d'attente estimée",
            niveau=NiveauAlerteEnum.moyen,
            agence_id=2,  # Adapter selon votre agence
        ))
        print(f"✅ Alerte créée avec succès: ID={alerte.id}")
        print(f"   Message: {alerte.message}")
        print(f"   Niveau: {alerte.niveau}")
        print(f"   Agence: {alerte.agence_id}")
        print(f"   Statut: {alerte.statut}")
        
        # Vérifier toutes les alertes en base
        alertes = db.query(Alerte).all()
        print(f"\n📊 Total alertes en base: {len(alertes)}")
        for a in alertes:
            print(f"   - ID:{a.id} | {a.type} | {a.niveau} | {a.statut} | Agence:{a.agence_id}")
            
    except Exception as e:
        print(f"❌ Erreur: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    creer_alerte_test()
