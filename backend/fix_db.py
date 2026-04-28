import pymysql

conn = pymysql.connect(host='localhost', user='root', database='banque_queue')
cursor = conn.cursor()

# Ajouter ticket_id et rdv_id dans la table taches
try:
    cursor.execute("ALTER TABLE taches ADD COLUMN ticket_id INT DEFAULT NULL;")
    print("ticket_id added to taches!")
except Exception as e:
    print(f"ticket_id: {e}")

try:
    cursor.execute("ALTER TABLE taches ADD COLUMN rdv_id INT DEFAULT NULL;")
    print("rdv_id added to taches!")
except Exception as e:
    print(f"rdv_id: {e}")

# Ajouter agent_id dans rendezvous si manquant
try:
    cursor.execute("ALTER TABLE rendezvous ADD COLUMN agent_id INT DEFAULT NULL;")
    print("agent_id added to rendezvous!")
except Exception as e:
    print(f"rendezvous.agent_id: {e}")

conn.commit()
conn.close()
print("Done!")
