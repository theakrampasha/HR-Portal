from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import smtplib, json, os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.database.db import get_connection

router = APIRouter()

SETTINGS_FILE = "email_settings.json"
TEMPLATE_FILE = "email_template.json"

DEFAULT_REJECT_SUBJECT = "Application Update — Nikitha Build Tech"
DEFAULT_REJECT_BODY = (
    "Dear {name},\n\n"
    "Thank you for your interest in Nikitha Build Tech and for taking the time "
    "to participate in our interview process for the {role} position.\n\n"
    "After careful consideration, we regret to inform you that we will not be "
    "moving forward with your application at this time.\n\n"
    "We appreciate your effort and wish you all the best in your future endeavors.\n\n"
    "Regards,\n"
    "HR Team\n"
    "Nikitha Build Tech"
)


from fastapi import Header

def load_email_settings(user_email: str = None):
    from app.services.mail_service import load_settings
    data = load_settings(user_email)
    if not data.get("email") or not data.get("password"):
        raise HTTPException(400, "Email settings not configured")
    return data


def load_reject_template(user_email: str = None):
    filename = TEMPLATE_FILE
    if not os.path.exists(filename):
        return DEFAULT_REJECT_BODY, DEFAULT_REJECT_SUBJECT

    with open(filename, "r") as f:
        data = json.load(f)

    body = data.get("reject_template", "").strip()
    subject = data.get("reject_subject", DEFAULT_REJECT_SUBJECT).strip() or DEFAULT_REJECT_SUBJECT
    if not body:
        body = DEFAULT_REJECT_BODY
    return body, subject


class RejectCandidate(BaseModel):
    name:           str
    email:          str
    jobRole:        str = ""
    rejected_round: Optional[str] = ""
    form_data:      Optional[str] = ""


class RejectRequest(BaseModel):
    candidates: List[RejectCandidate]


@router.post("/send-rejection")
def send_rejection(req: RejectRequest, x_user_email: str = Header(None)):
    if not req.candidates:
        raise HTTPException(400, "No candidates provided")

    safe_email = x_user_email.strip().lower() if x_user_email else None
    settings = load_email_settings(safe_email)
    sender_email = settings["email"]
    password = settings["password"]
    template, subject_template = load_reject_template(safe_email)

    sent_count = 0
    errors = []

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(sender_email, password)

            for c in req.candidates:
                if not c.email or "@" not in c.email:
                    errors.append(f"{c.name}: invalid email")
                    continue

                clean_name = (c.name or "Candidate").strip()
                role = (c.jobRole or "the applied").strip()

                body = template
                body = body.replace("{name}", clean_name)
                body = body.replace("{role}", role)

                subject = subject_template.replace("{name}", clean_name)
                subject = subject.replace("{role}", role)

                msg = MIMEMultipart()
                msg["Subject"] = subject
                msg["From"] = sender_email
                msg["To"] = c.email
                msg.attach(MIMEText(body, "plain"))

                try:
                    server.send_message(msg)
                    sent_count += 1
                    
                    try:
                        conn = get_connection()
                        cursor = conn.cursor()
                        cursor.execute("""
                            INSERT INTO rejected_history
                            (name, email, job_role, rejected_round, form_data)
                            VALUES (%s, %s, %s, %s, %s)
                        """, (
                            c.name,
                            c.email,
                            c.jobRole,
                            c.rejected_round or "",
                            c.form_data or ""
                        ))
                        conn.commit()
                        cursor.close()
                        conn.close()
                    except Exception as db_err:
                        print(f"REJECT DB SAVE ERROR for {c.email}:", db_err)
                except Exception as e:
                    errors.append(f"{c.name}: {str(e)}")

        if sent_count == 0 and errors:
            raise HTTPException(500, "; ".join(errors))

        result = {"message": f"{sent_count} rejection email(s) sent successfully", "sent": sent_count}
        if errors:
            result["errors"] = errors
        return result

    except smtplib.SMTPAuthenticationError:
        raise HTTPException(401, "Invalid Gmail App Password")

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(500, str(e))
