# Banque Queue - Système de Gestion de File d'Attente

Application de gestion de files d'attente pour les institutions bancaires avec prise de ticket virtuel, rendez-vous, et gestion des tâches.

## Technologies

### Backend
- FastAPI (Python)
- SQLAlchemy ORM
- MySQL
- WebSocket pour temps réel
- Alembic pour migrations

### Frontend
- React
- React Router
- Axios
- Socket.io-client
- React Hot Toast

## Installation

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend
```bash
cd frontend
npm install
npm start
```

## Configuration

Créez un fichier `.env` dans le dossier `backend` avec les variables suivantes :

```
DATABASE_URL=mysql+pymysql://root:@localhost:3306/banque_queue
SECRET_KEY=votre_secret_key_jwt
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

## Fonctionnalités

- **Clients** : Prise de ticket virtuel, prise de rendez-vous, suivi en temps réel
- **Agents** : Gestion de file d'attente, gestion des tâches assignées
- **Managers** : Supervision de la file, assignation de tickets aux agents, gestion des tâches
- **Admin** : Gestion des utilisateurs, institutions, agences et services

## Structure du Projet

```
finance/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── database.py
│   │   └── routers/
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   └── context/
│   └── package.json
└── README.md
```
