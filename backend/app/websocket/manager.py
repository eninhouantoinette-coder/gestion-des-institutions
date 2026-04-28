from typing import List, Optional
from fastapi import WebSocket
import json


class ConnectionManager:
    """
    Gère les connexions WebSocket par canal.
    Canaux : file/{agence_id}, notifications/{user_id}, dashboard/{role}
    """

    def __init__(self):
        # canal -> list of WebSockets
        self.active_connections: dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, channel: str):
        # accept() is called in the endpoint before this
        if channel not in self.active_connections:
            self.active_connections[channel] = []
        self.active_connections[channel].append(websocket)
        print(f"[WS] Connexion sur canal '{channel}' — {len(self.active_connections[channel])} client(s)")

    def disconnect(self, websocket: WebSocket, channel: str):
        if channel in self.active_connections:
            try:
                self.active_connections[channel].remove(websocket)
            except ValueError:
                pass
        print(f"[WS] Déconnexion du canal '{channel}'")

    async def send_to_channel(self, channel: str, event: str, data: dict):
        """Envoie un message à tous les clients d'un canal."""
        message = json.dumps({"event": event, "data": data})
        if channel not in self.active_connections:
            return
        dead = []
        for ws in self.active_connections[channel]:
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws, channel)

    async def broadcast_to_role(self, role: str, event: str, data: dict):
        """Broadcast à tous les connectés sur dashboard/{role}."""
        await self.send_to_channel(f"dashboard/{role}", event, data)

    async def notify_user(self, user_id: int, event: str, data: dict):
        """Envoie une notification à un utilisateur précis."""
        await self.send_to_channel(f"notifications/{user_id}", event, data)

    async def update_queue(self, agence_id: int, data: dict):
        """Met à jour la file d'attente d'une agence."""
        await self.send_to_channel(f"file/{agence_id}", "position_mise_a_jour", data)

    def get_stats(self) -> dict:
        return {
            canal: len(clients)
            for canal, clients in self.active_connections.items()
        }


# Instance globale partagée
manager = ConnectionManager()
