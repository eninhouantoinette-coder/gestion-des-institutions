import requests
import json

# Se connecter pour obtenir un token
login_data = {
    "email": "admin@banque.com",  # Adapter avec un vrai compte
    "mot_de_passe": "admin123"     # Adapter avec un vrai mot de passe
}

try:
    # 1. Connexion
    response = requests.post("http://localhost:8000/auth/login", json=login_data)
    if response.status_code != 200:
        print(f"❌ Erreur connexion: {response.status_code} - {response.text}")
        exit()
    
    token = response.json()["access_token"]
    print(f"✅ Connexion réussie, token: {token[:50]}...")
    
    # 2. Créer une alerte
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    alerte_data = {
        "type": "surcharge",
        "message": "Surcharge détectée (MOYEN) - 5 tickets en attente • ~75 min d'attente estimée",
        "niveau": "moyen",
        "agence_id": 2  # Adapter selon votre agence
    }
    
    response = requests.post("http://localhost:8000/alertes", json=alerte_data, headers=headers)
    if response.status_code == 201:
        alerte = response.json()
        print(f"✅ Alerte créée: ID={alerte['id']}")
        print(f"   Message: {alerte['message']}")
        print(f"   Niveau: {alerte['niveau']}")
    else:
        print(f"❌ Erreur création alerte: {response.status_code} - {response.text}")
    
    # 3. Lister les alertes
    response = requests.get("http://localhost:8000/alertes", headers=headers)
    if response.status_code == 200:
        alertes = response.json()
        print(f"\n📊 Total alertes: {len(alertes)}")
        for a in alertes:
            print(f"   - ID:{a['id']} | {a['type']} | {a['niveau']} | {a['statut']} | Agence:{a.get('agence_id', 'N/A')}")
    else:
        print(f"❌ Erreur liste alertes: {response.status_code} - {response.text}")

except Exception as e:
    print(f"❌ Erreur: {e}")
