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
        # Assign agent@banque.com to agence_id = 2
        cursor.execute("UPDATE users SET agence_id = 2 WHERE email = 'agent@banque.com'")
        # Assign manager@banque.com to agence_id = 2
        cursor.execute("UPDATE users SET agence_id = 2 WHERE email = 'manager@banque.com'")
        # Reset login attempts for jean@gmail.com and set password to hashed 'agent123'
        import bcrypt
        hashed = bcrypt.hashpw(b"agent123", bcrypt.gensalt()).decode('utf-8')
        cursor.execute("UPDATE users SET mot_de_passe = %s, tentatives_connexion = 0 WHERE email = 'jean@gmail.com'", (hashed,))
        
        conn.commit()
        print("Updated agent@banque.com and manager@banque.com to agence_id = 2, and reset jean@gmail.com password!")
finally:
    if 'conn' in locals() and conn.open:
        conn.close()
