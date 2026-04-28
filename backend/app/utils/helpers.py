import qrcode
import qrcode.image.svg
from io import BytesIO
import base64
from datetime import datetime
from typing import Optional
import re


def generate_ticket_number(prefix: str, sequence: int) -> str:
    """Génère un numéro ticket de type A001, B002, etc."""
    return f"{prefix}{sequence:03d}"


def get_ticket_prefix(service_nom: str) -> str:
    """Retourne le préfixe basé sur le nom du service."""
    mapping = {
        "caisse": "C",
        "crédit": "R",
        "épargne": "E",
        "virement": "V",
        "compte": "A",
        "conseil": "S",
        "international": "I",
        "assurance": "U",
    }
    service_lower = service_nom.lower()
    for key, prefix in mapping.items():
        if key in service_lower:
            return prefix
    return "T"


def generate_qr_code_base64(data: str) -> str:
    """Génère un QR code en base64 PNG."""
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    return "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode()


def calculate_wait_time(position: int, duree_moyenne: int) -> int:
    """Calcule le temps d'attente estimé en minutes."""
    return max(0, position * duree_moyenne)


def calculate_priority_score(
    est_urgent: bool = False,
    anciennete_jours: int = 0,
    type_service_prioritaire: bool = False,
    heure_arrivee_minutes: int = 0,
) -> float:
    """
    Score de priorité IA (plus haut = prioritaire).
    Facteurs : urgence médicale, ancienneté, type service, heure d'arrivée.
    """
    score = 0.0
    if est_urgent:
        score += 100.0
    if type_service_prioritaire:
        score += 20.0
    # Ancienneté : 1 point par année (max 30)
    score += min(anciennete_jours / 365, 30)
    # Pénalité légère pour arrivée tardive (normalise l'équité)
    score -= heure_arrivee_minutes * 0.01
    return round(score, 4)


def paginate(query, page: int = 1, per_page: int = 20):
    """Helper de pagination SQLAlchemy."""
    total = query.count()
    items = query.offset((page - 1) * per_page).limit(per_page).all()
    return {
        "items": items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
    }


def format_date_fr(dt: Optional[datetime]) -> Optional[str]:
    if not dt:
        return None
    return dt.strftime("%d/%m/%Y %H:%M")


def slugify(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[àáâãäå]", "a", text)
    text = re.sub(r"[éèêë]", "e", text)
    text = re.sub(r"[îï]", "i", text)
    text = re.sub(r"[ôö]", "o", text)
    text = re.sub(r"[ùûü]", "u", text)
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


def get_client_ip(request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"
