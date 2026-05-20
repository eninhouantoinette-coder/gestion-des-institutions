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
finally:
    if 'conn' in locals() and conn.open:
        conn.close()
