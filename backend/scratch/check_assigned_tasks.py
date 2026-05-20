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
        cursor.execute("SELECT * FROM taches ORDER BY id DESC LIMIT 5")
        taches = cursor.fetchall()
        print("LAST 5 TASKS:")
        for t in taches:
            print(f"  ID: {t['id']}, Agent: {t['agent_id']}, Titre: {t['titre']}, Statut: {t['statut']}, Ticket: {t['ticket_id']}, RDV: {t['rdv_id']}")

        cursor.execute("SELECT * FROM tickets WHERE statut = 'en_cours' OR agent_id IS NOT NULL ORDER BY id DESC LIMIT 5")
        tickets = cursor.fetchall()
        print("\nLAST 5 ACTIVE/ASSIGNED TICKETS:")
        for t in tickets:
            print(f"  ID: {t['id']}, Num: {t['numero_ticket']}, Agence: {t['agence_id']}, Agent: {t['agent_id']}, Statut: {t['statut']}")
finally:
    if 'conn' in locals() and conn.open:
        conn.close()
