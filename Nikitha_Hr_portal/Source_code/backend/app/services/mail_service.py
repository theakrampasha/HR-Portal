import smtplib
from email.message import EmailMessage
import json
import os

SETTINGS_FILE = "email_settings.json"


def load_settings(user_email: str = None):
    # 0. Try loading user-specific configurations from database
    if user_email:
        safe_email = user_email.strip().lower()
        try:
            from app.database.db import get_connection
            conn = get_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                "SELECT smtp_email, smtp_password FROM user_settings WHERE email = %s",
                (safe_email,)
            )
            row = cursor.fetchone()
            cursor.close()
            conn.close()
            if row and row.get("smtp_email") and row.get("smtp_password"):
                return {"email": row["smtp_email"], "password": row["smtp_password"]}
        except Exception as e:
            print(f"Error loading settings from DB for {safe_email}: {e}")
        return {"email": "", "password": ""} # No fallback to global configurations if a user is logged in

    # 1. Try loading from environment variables first (if no user_email is provided)
    sender_email = os.getenv("SENDER_EMAIL")
    email_password = os.getenv("EMAIL_PASSWORD")
    if sender_email and email_password:
        return {"email": sender_email, "password": email_password}

    # 2. Try parsing .env manually (if load_dotenv wasn't run)
    env_file = ".env"
    if os.path.exists(env_file):
        try:
            with open(env_file, "r") as f:
                env_data = {}
                for line in f:
                    if "=" in line:
                        k, v = line.strip().split("=", 1)
                        env_data[k.strip()] = v.strip()
                if env_data.get("SENDER_EMAIL") and env_data.get("EMAIL_PASSWORD"):
                    return {"email": env_data["SENDER_EMAIL"], "password": env_data["EMAIL_PASSWORD"]}
        except Exception:
            pass

    return {"email": "", "password": ""}


def send_email(to_email, subject, body, file_path=None, user_email: str = None):
    settings = load_settings(user_email)

    sender_email = settings["email"]
    password = settings["password"]

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = sender_email
    msg["To"] = to_email
    msg.set_content(body)

    # Attach PDF
    if file_path:
        with open(file_path, "rb") as f:
            file_data = f.read()
            msg.add_attachment(
                file_data,
                maintype="application",
                subtype="pdf",
                filename="offer_letter.pdf"
            )

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
        smtp.login(sender_email, password)
        smtp.send_message(msg)