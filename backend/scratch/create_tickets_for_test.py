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
        # Create a few tickets with statut 'en_attente' for agence 2 and service 1
        tickets_data = [
            ("A101", 2, 1, "Client A"),
            ("A102", 2, 1, "Client B"),
            ("A103", 2, 2, "Client C"),
        ]
        for num, agence, service, name in tickets_data:
            cursor.execute(
                "INSERT INTO tickets (numero_ticket, agence_id, service_id, client_nom, statut, position, temps_estime, priorite_score, created_at) "
                "VALUES (%s, %s, %s, %s, 'en_attente', 1, 15, 10, NOW())",
                (num, agence, service, name)
            )
        conn.commit()
        print("Successfully inserted 3 waiting tickets for agence 2!")
finally:
    if 'conn' in locals() and conn.open:
        conn.close()
