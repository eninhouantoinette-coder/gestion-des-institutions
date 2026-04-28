import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from jinja2 import Environment, BaseLoader
from dotenv import load_dotenv
import os

load_dotenv()

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", "no-reply@banquequeue.com")

RESET_TEMPLATE = """
<html><body style="font-family:Arial,sans-serif;background:#f4f6f9;padding:20px">
  <div style="max-width:600px;margin:auto;background:#fff;border-radius:12px;padding:32px">
    <h2 style="color:#1e40af">🏦 BanqueQueue</h2>
    <h3>Réinitialisation de votre mot de passe</h3>
    <p>Bonjour <strong>{{ nom }}</strong>,</p>
    <p>Cliquez sur le bouton ci-dessous pour réinitialiser votre mot de passe :</p>
    <a href="{{ reset_url }}" style="display:inline-block;background:#1e40af;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;margin:16px 0">
      Réinitialiser le mot de passe
    </a>
    <p style="color:#6b7280;font-size:12px">Ce lien expire dans 1 heure.</p>
  </div>
</body></html>
"""

NOTIF_TEMPLATE = """
<html><body style="font-family:Arial,sans-serif;background:#f4f6f9;padding:20px">
  <div style="max-width:600px;margin:auto;background:#fff;border-radius:12px;padding:32px">
    <h2 style="color:#1e40af">🏦 BanqueQueue</h2>
    <h3>{{ titre }}</h3>
    <p>Bonjour <strong>{{ nom }}</strong>,</p>
    <p>{{ message }}</p>
    <p style="color:#6b7280;font-size:12px">BanqueQueue — Système de gestion bancaire</p>
  </div>
</body></html>
"""


async def send_email(to_email: str, subject: str, html_content: str):
    if not SMTP_USER or not SMTP_PASSWORD:
        print(f"[EMAIL MOCK] To: {to_email} | Subject: {subject}")
        return

    msg = MIMEMultipart("alternative")
    msg["From"] = SMTP_FROM
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(html_content, "html"))

    try:
        await aiosmtplib.send(
            msg,
            hostname=SMTP_HOST,
            port=SMTP_PORT,
            username=SMTP_USER,
            password=SMTP_PASSWORD,
            start_tls=True,
        )
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")


async def send_reset_email(to_email: str, nom: str, reset_token: str):
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    reset_url = f"{frontend_url}/reset-password?token={reset_token}"
    env = Environment(loader=BaseLoader())
    tmpl = env.from_string(RESET_TEMPLATE)
    html = tmpl.render(nom=nom, reset_url=reset_url)
    await send_email(to_email, "Réinitialisation de mot de passe — BanqueQueue", html)


async def send_notification_email(to_email: str, nom: str, titre: str, message: str):
    env = Environment(loader=BaseLoader())
    tmpl = env.from_string(NOTIF_TEMPLATE)
    html = tmpl.render(nom=nom, titre=titre, message=message)
    await send_email(to_email, f"{titre} — BanqueQueue", html)
