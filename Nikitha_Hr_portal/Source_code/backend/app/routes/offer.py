from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import smtplib, json, os, re
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders

from docx import Document

from app.routes.history import save_candidate_to_history

router = APIRouter()

SETTINGS_FILE     = "email_settings.json"
OFFER_DIR         = "app/offer_templates"
FULLTIME_TEMPLATE = os.path.join(OFFER_DIR, "offer.docx")
INTERN_TEMPLATE   = os.path.join(OFFER_DIR, "intern_offer.docx")
TEMP_DIR          = "app/temp_offers"

os.makedirs(TEMP_DIR, exist_ok=True)


# ===========================
# MODELS
# ===========================
class OfferCandidate(BaseModel):
    name:        str
    email:       str
    jobRole:     str
    roleType:    str    # "Full-Time" or "Intern"
    salary:      str    # salary (full-time) or stipend (intern)
    months:      str = ""
    joiningDate: str
    status:      str = "selected"
    formData:    Optional[str] = ""
    jobName:     Optional[str] = ""

class OfferRequest(BaseModel):
    candidates: List[OfferCandidate]


# ===========================
# REPLACE PLACEHOLDERS IN ONE PARAGRAPH
# ===========================
def replace_in_paragraph(para, variables: dict):
    """
    Word often splits a single placeholder like {joiningDate} across
    multiple runs: e.g.  run0="{joining"  run1="Date}".

    Fix: merge ALL run texts → do replacement on merged string →
    write result into run[0] (preserving its formatting) → blank
    all other runs.  Formatting (bold, font, size, colour) is never
    touched because we only change .text, not .font / .bold etc.

    Supports both  {key}  and  {{key}}  placeholder styles.
    """
    if not para.runs:
        return

    # 1. Merge
    full_text = "".join(run.text for run in para.runs)

    # 2. Replace — double-brace first so we don't double-process
    new_text = full_text
    for key, val in variables.items():
        new_text = new_text.replace(f"{{{{{key}}}}}", str(val))  # {{key}}
        new_text = new_text.replace(f"{{{key}}}", str(val))       # {key}

    if new_text == full_text:
        return  # nothing changed — leave runs untouched

    # 3. Write back: first run keeps formatting, rest are blanked
    para.runs[0].text = new_text
    for run in para.runs[1:]:
        run.text = ""


# ===========================
# FILL ENTIRE DOCX TEMPLATE
# ===========================
def fill_docx_template(template_path: str, output_path: str, variables: dict):
    """
    Replace placeholders in every paragraph, table cell,
    header, and footer of the document.
    """
    doc = Document(template_path)

    # Body paragraphs
    for para in doc.paragraphs:
        replace_in_paragraph(para, variables)

    # Tables
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for para in cell.paragraphs:
                    replace_in_paragraph(para, variables)

    # Headers & Footers (date / company name often live here)
    for section in doc.sections:
        for para in section.header.paragraphs:
            replace_in_paragraph(para, variables)
        for para in section.footer.paragraphs:
            replace_in_paragraph(para, variables)

    doc.save(output_path)


from fastapi import APIRouter, HTTPException, Header

# ===========================
# SEND OFFER LETTER
# ===========================
@router.post("/offer-letter")
def send_offer_letter(req: OfferRequest, x_user_email: str = Header(None)):

    # Load email settings
    from app.services.mail_service import load_settings
    settings = load_settings(x_user_email.strip().lower() if x_user_email else None)

    sender_email = settings.get("email", "").strip()
    password     = settings.get("password", "").strip()

    if not sender_email or not password:
        raise HTTPException(400, "Email settings missing")

    today_str = datetime.now().strftime("%d-%m-%Y")
    sent:   List[str] = []
    errors: List[str] = []

    # Connect to Gmail
    try:
        server = smtplib.SMTP_SSL("smtp.gmail.com", 465)
        server.login(sender_email, password)
    except smtplib.SMTPAuthenticationError:
        raise HTTPException(401, "Gmail App Password incorrect")
    except Exception as e:
        raise HTTPException(500, f"SMTP connection failed: {str(e)}")

    for c in req.candidates:
        try:
            # Choose template
            is_intern     = c.roleType.lower() in ("intern", "internship")
            from app.routes.settings import get_offer_paths
            offer_path, intern_path, _, _ = get_offer_paths(x_user_email)
            template_path = intern_path if is_intern else offer_path

            if not os.path.exists(template_path):
                label = "Internship" if is_intern else "Full-Time"
                errors.append(f"{c.name}: {label} offer template not uploaded in Settings")
                continue

            # Variable map — covers every placeholder convention:
            #   single-brace  {name}         standard
            #   double-brace  {{name}}        some Word exports
            #   snake_case    {joining_date}  pdf_generator style
            clean_name = c.name.strip().title()
            variables = {
                # The official placeholders for .docx templates
                "name":         clean_name,    # {name}
                "salary":       c.salary,      # {salary}
                "stipend":      c.salary,      # {stipend}
                "months":       c.months,      # {months}
                "joining_date": c.joiningDate, # {joining_date}
                "issue_date":   today_str,     # {issue_date} — auto today
                "role":         c.jobRole,     # {role}
            }

            # Generate personalised DOCX
            safe_name   = re.sub(r"[^\w]", "_", c.email)
            output_path = os.path.join(TEMP_DIR, f"offer_{safe_name}.docx")
            fill_docx_template(template_path, output_path, variables)

            # Build email
            role_label = "Internship" if is_intern else "Full-Time"
            subject    = f"Offer Letter — {c.jobRole} ({role_label}) | Nikitha Build Tech"
            
            if is_intern:
                comp_text = f"Stipend: {c.salary}\nDuration: {c.months} Months\n"
            else:
                comp_text = f"CTC: {c.salary}\n"

            body = (
                f"Dear {clean_name},\n\n"
                f"Congratulations! We are pleased to offer you the position of "
                f"{c.jobRole} ({role_label}) at Nikitha Build Tech.\n\n"
                f"{comp_text}"
                f"Joining Date: {c.joiningDate}\n\n"
                f"Please find your offer letter attached.\n\n"
                f"Best Regards,\nHR Team\nNikitha Build Tech"
            )

            msg            = MIMEMultipart()
            msg["From"]    = sender_email
            msg["To"]      = c.email.strip()
            msg["Subject"] = subject
            msg.attach(MIMEText(body, "plain"))

            # Attach DOCX
            with open(output_path, "rb") as att:
                part = MIMEBase("application", "octet-stream")
                part.set_payload(att.read())
            encoders.encode_base64(part)
            safe_fname = re.sub(r"[^\w ]", "_", clean_name).replace(" ", "_")
            part.add_header(
                "Content-Disposition",
                f'attachment; filename="OfferLetter_{safe_fname}.docx"'
            )
            msg.attach(part)

            server.send_message(msg)
            sent.append(c.email)

            try:
                save_candidate_to_history({
                    "name": c.name,
                    "email": c.email,
                    "job_role": c.jobName if c.jobName else c.jobRole,
                    "job_type": c.roleType,
                    "salary": c.salary,
                    "joining_date": c.joiningDate,
                    "form_data": c.formData,
                })
            except Exception as db_err:
                print(f"HISTORY SAVE ERROR for {c.email}:", db_err)

            # Clean up temp file
            try:
                os.remove(output_path)
            except Exception:
                pass

        except Exception as e:
            errors.append(f"{c.name}: {str(e)}")

    server.quit()

    if errors and not sent:
        raise HTTPException(500, f"All sends failed: {'; '.join(errors)}")

    result = {"message": f"Offer letters sent to {len(sent)} candidate(s) ✅"}
    if errors:
        result["warnings"] = errors
    return result