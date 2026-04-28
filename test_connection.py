#!/usr/bin/env python3
"""Test de connexion au backend"""

import requests

BASE_URL = "http://localhost:8000"

# Test 1: Health check
print("=== Test 1: Health Check ===")
try:
    resp = requests.get(f"{BASE_URL}/health", timeout=5)
    print(f"Status: {resp.status_code}")
    print(f"Response: {resp.text}")
except Exception as e:
    print(f"Erreur: {e}")

# Test 2: Login avec l'admin déverrouillé
print("\n=== Test 2: Login ===")
try:
    resp = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": "tontontoni@gmail.com", "mot_de_passe": "motdepasse123"},
        timeout=10
    )
    print(f"Status: {resp.status_code}")
    if resp.status_code == 200:
        print("✅ Login réussi!")
        print(f"Token: {resp.json().get('access_token', 'N/A')[:20]}...")
    elif resp.status_code == 401:
        print("❌ Mot de passe incorrect")
    elif resp.status_code == 403:
        print(f"❌ Compte verrouillé: {resp.json().get('detail', 'N/A')}")
    else:
        print(f"Response: {resp.text}")
except Exception as e:
    print(f"Erreur: {e}")

# Test 3: Liste des utilisateurs
print("\n=== Test 3: Liste utilisateurs ===")
try:
    resp = requests.get(f"{BASE_URL}/users", timeout=5)
    print(f"Status: {resp.status_code}")
except Exception as e:
    print(f"Erreur: {e}")
