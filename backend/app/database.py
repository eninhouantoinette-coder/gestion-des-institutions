from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root:@localhost:3306/banque_queue")
DB_ECHO = os.getenv("DB_ECHO", "False").lower() == "true"
DB_POOL_DISABLED = os.getenv("DB_POOL_DISABLED", "True").lower() == "true"

# Mode sans pool - crée une nouvelle connexion à chaque requête
# Évite les problèmes de saturation du pool et les connexions stale
engine = create_engine(
    DATABASE_URL,
    echo=DB_ECHO,
    poolclass=NullPool,
    connect_args={
        'connect_timeout': 10,
        'read_timeout': 30,
        'write_timeout': 30
    }
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()


def create_tables():
    Base.metadata.create_all(bind=engine)
