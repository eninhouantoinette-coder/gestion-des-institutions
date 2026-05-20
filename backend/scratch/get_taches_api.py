import requests

BASE_URL = "http://localhost:8000"

# Try logging in as agent@gmail.com
login_data = {
    "email": "jean@gmail.com",
    "mot_de_passe": "agent123"
}
try:
    r = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    print("Login Status:", r.status_code)
    if r.status_code == 200:
        token = r.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get profile
        profile_res = requests.get(f"{BASE_URL}/auth/me", headers=headers)
        user_agency_id = 2
        if profile_res.status_code == 200:
            p = profile_res.json()
            user_agency_id = p.get('agence_id')
            print(f"User: {p.get('nom')} ({p.get('email')}), Role: {p.get('role')}, Agence ID: {user_agency_id}")
        
        # Get tasks
        tasks_res = requests.get(f"{BASE_URL}/taches", headers=headers)
        print("\nTasks Response:", tasks_res.status_code)
        if tasks_res.status_code == 200:
            for t in tasks_res.json():
                print(f"  Task ID: {t.get('id')}, Agent: {t.get('agent_id')}, Title: {t.get('titre')}, Status: {t.get('statut')}, Ticket ID: {t.get('ticket_id')}")
        
        # Get tickets
        tickets_res = requests.get(f"{BASE_URL}/tickets/file/{user_agency_id}", headers=headers)
        print("\nTickets File Response:", tickets_res.status_code)
        if tickets_res.status_code == 200:
            tickets = tickets_res.json()
            for t in tickets:
                print(f"  Ticket ID: {t.get('id')}, Num: {t.get('numero_ticket')}, Agent: {t.get('agent_id')}, Status: {t.get('statut')}")
    else:
        print("Login failed:", r.text)
except Exception as e:
    print("Error:", e)
