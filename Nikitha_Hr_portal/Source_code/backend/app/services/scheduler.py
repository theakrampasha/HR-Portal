from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import smtplib, json, os
from datetime import datetime

from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.routes.attendance import store_scheduled_candidates

router = APIRouter()

SETTINGS_FILE = "email_settings.json"
TEMPLATE_FILE = "email_template.json"


from fastapi import Header

def load_email_settings(user_email: str = None):
    from app.services.mail_service import load_settings
    data = load_settings(user_email)
    if not data.get("email") or not data.get("password"):
        raise HTTPException(400, "Email settings not configured")
    return data


def load_mail_template(user_email: str = None):
    filename = TEMPLATE_FILE
    if not os.path.exists(filename):
        return "", "Interview Scheduled"

    with open(filename, "r") as f:
        data = json.load(f)

    return (
        data.get("interview_template", ""),
        data.get("interview_subject", "Interview Scheduled"),
    )


def dedupe_candidates(candidates: list) -> list:
    """One email per person — keeps first occurrence."""
    seen = set()
    unique = []
    for c in candidates:
        email = (c.email or "").strip().lower()
        if not email or "@" not in email or email in seen:
            continue
        seen.add(email)
        unique.append(c)
    return unique


class Candidate(BaseModel):
    name: str
    email: str
    jobRole: str = ""


class ScheduleRequest(BaseModel):
    date: str
    candidates: List[Candidate]


@router.post("/schedule")
def schedule(req: ScheduleRequest, x_user_email: str = Header(None)):
    if not req.date:
        raise HTTPException(400, "Date missing")

    unique_candidates = dedupe_candidates(req.candidates)
    if not unique_candidates:
        raise HTTPException(400, "No valid candidates to schedule")

    try:
        dt = datetime.fromisoformat(req.date)
        formatted_date = dt.strftime("%d-%m-%Y")
        formatted_time = dt.strftime("%I:%M %p")
    except Exception:
        raise HTTPException(400, "Invalid date format")

    safe_email = x_user_email.strip().lower() if x_user_email else None
    settings = load_email_settings(safe_email)
    sender_email = settings["email"]
    password = settings["password"]
    template, subject_template = load_mail_template(safe_email)

    sent_count = 0

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(sender_email, password)

            for c in unique_candidates:
                if not template:
                    body = (
                        f"Hello {c.name},\n\n"
                        f"Your interview is scheduled on {formatted_date} at {formatted_time}.\n\n"
                        f"Please be available.\n\n"
                        f"Regards,\nHR Team"
                    )
                else:
                    body = template
                    body = body.replace("{name}", c.name)
                    body = body.replace("{date}", formatted_date)
                    body = body.replace("{time}", formatted_time)
                    body = body.replace("{role}", c.jobRole or "")

                subject = subject_template
                subject = subject.replace("{name}", c.name)
                subject = subject.replace("{role}", c.jobRole or "")

                msg = MIMEMultipart()
                msg["Subject"] = subject
                msg["From"] = sender_email
                msg["To"] = c.email
                msg.attach(MIMEText(body, "plain"))
                server.send_message(msg)
                sent_count += 1

        store_scheduled_candidates(
            [{"name": c.name, "email": c.email} for c in unique_candidates]
        )

        return {
            "message": f"{sent_count} interview email(s) sent successfully",
            "sent": sent_count,
        }

    except smtplib.SMTPAuthenticationError:
        raise HTTPException(401, "Invalid Gmail App Password")

    except Exception as e:
        raise HTTPException(500, str(e))
