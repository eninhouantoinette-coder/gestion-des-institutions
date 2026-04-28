import pymysql
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
print(f"Testing connection to: {DATABASE_URL}")

# Parse URL (simple way)
# mysql+pymysql://root:@127.0.0.1:3306/banque_queue?ssl_disabled=true
try:
    conn = pymysql.connect(
        host='localhost',
        user='root',
        password='',
        database='banque_queue',
        port=3306
    )
    print("Connection successful!")
    conn.close()
except Exception as e:
    print(f"Connection failed: {e}")
