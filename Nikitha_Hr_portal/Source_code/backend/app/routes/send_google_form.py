from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from typing import List
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import json
import os

from app.services.google_sheet import (
    get_google_form_responses,
    save_sent_emails,
    clear_sent_emails,
)

router = APIRouter()

GOOGLE_FORM_FILE     = "google_form.json"
GOOGLE_TEMPLATE_FILE = "google_form_template.json"


# =========================================
# MODELS
# =========================================
class Candidate(BaseModel):
    name: str
    email: str


class FormRequest(BaseModel):
    candidates: List[Candidate]
    close_time: str


# =========================================
# GET GOOGLE FORM CANDIDATES
# Called by frontend after timer ends /
# stop-timer button pressed.
# Returns ONLY candidates from THIS batch
# who actually filled the form.
# =========================================
@router.get("/google-form-candidates")
def google_form_candidates(x_user_email: str = Header(None)):
    try:
        candidates = get_google_form_responses()
        return {"candidates": candidates}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =========================================
# SEND GOOGLE FORM EMAIL
# =========================================
@router.post("/send-google-form")
def send_google_form(data: FormRequest, x_user_email: str = Header(None)):
    try:
        from app.services.mail_service import load_settings
        safe_user_email = x_user_email.strip().lower() if x_user_email else None
        settings = load_settings(safe_user_email)

        sender_email    = settings.get("email", "")
        sender_password = settings.get("password", "")

        if not sender_email or not sender_password:
            raise HTTPException(status_code=400, detail="Please add the Gmail and Password to send Google Form")

        google_form_link = ""
        # Load Google Form link from shared config
        if os.path.exists(GOOGLE_FORM_FILE):
            with open(GOOGLE_FORM_FILE, "r") as f:
                form_data = json.load(f)
            google_form_link = form_data.get("form_link", "")

        email_subject = "Google Form Round"
        email_body_template = (
            "Hello {name},\n\n"
            "Please fill the Google Form below:\n\n"
            "{google_form_link}\n\n"
            "Please fill it within the date and time: {close_time}, otherwise it will be considered as rejected.\n\n"
            "Regards,\nHR Team"
        )

        # Load Google Template from shared config
        if os.path.exists(GOOGLE_TEMPLATE_FILE):
            with open(GOOGLE_TEMPLATE_FILE, "r") as f:
                template_data = json.load(f)
            email_subject       = template_data.get("subject", email_subject)
            email_body_template = template_data.get("body", email_body_template)

        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(sender_email, sender_password)

        sent_email_list = []
        sent_candidates = []

        for candidate in data.candidates:
            candidate_email = candidate.email.strip().lower()
            candidate_name  = str(candidate.name).strip().title()

            if not candidate_email or "@" not in candidate_email:
                continue

            body = (
                email_body_template
                .replace("{name}", candidate_name)
                .replace("{google_form_link}", google_form_link)
                .replace("{close_time}", data.close_time)
            )

            msg            = MIMEMultipart()
            msg["From"]    = sender_email
            msg["To"]      = candidate_email
            msg["Subject"] = email_subject
            msg.attach(MIMEText(body, "plain"))

            server.sendmail(sender_email, candidate_email, msg.as_string())
            sent_email_list.append(candidate_email)
            sent_candidates.append({"name": candidate_name, "email": candidate_email})

        server.quit()

        save_sent_emails(sent_email_list, sent_candidates)

        return {
            "success": True,
            "message": f"Google Form sent to {len(sent_email_list)} candidates"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =========================================
# RESET BATCH
# =========================================
@router.post("/reset-batch")
def reset_batch(x_user_email: str = Header(None)):
    try:
        clear_sent_emails()
        return {"success": True, "message": "Batch reset. Ready for new candidates."}
    except Exception as e:
        return {"success": False, "error": str(e)}
