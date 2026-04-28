import pymysql

try:
    print("Connexion au serveur MySQL (localhost:3306, root, sans mot de passe)...")
    conn = pymysql.connect(host='localhost', user='root')
    cursor = conn.cursor()
    cursor.execute("CREATE DATABASE IF NOT EXISTS banque_queue CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
    conn.commit()
    conn.close()
    print(" Base de données 'banque_queue' prête !")
except Exception as e:
    print(f" Erreur lors de la création de la base de données : {e}")
    print("   Assurez-vous que XAMPP est lancé et que le module MySQL est démarré.")
