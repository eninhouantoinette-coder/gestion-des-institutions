import pymysql

try:
    conn = pymysql.connect(
        host="localhost",
        user="root",
        password="",
        database="banque_queue",
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor
    )
    with conn.cursor() as cursor:
        cursor.execute("SELECT id, nom, email, role, agence_id FROM users")
        users = cursor.fetchall()
        print("USERS:")
        for u in users:
            print(f"  ID: {u['id']}, Nom: {u['nom']}, Email: {u['email']}, Role: {u['role']}, Agence ID: {u['agence_id']}")

        cursor.execute("SELECT id, nom FROM agences")
        agences = cursor.fetchall()
        print("\nAGENCES:")
        for a in agences:
            print(f"  ID: {a['id']}, Nom: {a['nom']}")

        cursor.execute("SELECT id, numero_ticket, agence_id, service_id, agent_id, statut FROM tickets")
        tickets = cursor.fetchall()
        print("\nTICKETS:")
        for t in tickets:
            print(f"  ID: {t['id']}, Numéro: {t['numero_ticket']}, Agence: {t['agence_id']}, Service: {t['service_id']}, Agent: {t['agent_id']}, Statut: {t['statut']}")
finally:
    if 'conn' in locals() and conn.open:
        conn.close()
