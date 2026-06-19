from fastapi import APIRouter, UploadFile, File, HTTPException, Query, Header
from pydantic import BaseModel, EmailStr
import json, os

router = APIRouter()

SETTINGS_FILE     = "email_settings.json"
TEMPLATE_FILE     = "email_template.json"
UPLOAD_DIR        = "app/offer_templates"

os.makedirs(UPLOAD_DIR, exist_ok=True)

OFFER_PATH        = os.path.join(UPLOAD_DIR, "offer.docx")
INTERN_OFFER_PATH = os.path.join(UPLOAD_DIR, "intern_offer.docx")

def get_offer_paths(user_email: str = None):
    g_offer = os.path.join(UPLOAD_DIR, "offer.docx")
    g_intern = os.path.join(UPLOAD_DIR, "intern_offer.docx")
    return g_offer, g_intern, g_offer, g_intern

GOOGLE_FORM_FILE     = "google_form.json"
GOOGLE_TEMPLATE_FILE = "google_form_template.json"


# ======================
# MODELS
# ======================
class EmailSettings(BaseModel):
    email:    EmailStr
    password: str


class TemplateSettings(BaseModel):
    interview_subject:  str
    interview_template: str
    reject_subject:     str = "Application Update — Nikitha Build Tech"
    reject_template:    str = ""


class GoogleFormSettings(BaseModel):
    form_link: str


class GoogleTemplateSettings(BaseModel):
    subject: str
    body:    str


# ======================
# SAVE EMAIL SETTINGS
# ======================
def update_env_file(email, password):
    env_path = ".env"
    if not os.path.exists(env_path):
        possible_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
        if os.path.exists(possible_path):
            env_path = possible_path

    lines = []
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            lines = f.readlines()

    email_found = False
    password_found = False
    new_lines = []

    for line in lines:
        stripped = line.strip()
        if stripped.startswith("SENDER_EMAIL="):
            new_lines.append(f"SENDER_EMAIL={email}\n")
            email_found = True
        elif stripped.startswith("EMAIL_PASSWORD="):
            new_lines.append(f"EMAIL_PASSWORD={password}\n")
            password_found = True
        else:
            new_lines.append(line)

    if not email_found:
        new_lines.append(f"SENDER_EMAIL={email}\n")
    if not password_found:
        new_lines.append(f"EMAIL_PASSWORD={password}\n")

    with open(env_path, "w") as f:
        f.writelines(new_lines)


@router.post("/save-email-settings")
def save_email_settings(data: EmailSettings, x_user_email: str = Header(None)):
    try:
        cleaned_password = data.password.replace(" ", "").strip()
        email_str = str(data.email).strip()
        
        # Save to database if user email is present
        if x_user_email:
            safe_email = x_user_email.strip().lower()
            from app.database.db import get_connection
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO user_settings (email, smtp_email, smtp_password)
                VALUES (%s, %s, %s)
                ON DUPLICATE KEY UPDATE smtp_email = VALUES(smtp_email), smtp_password = VALUES(smtp_password)
            """, (safe_email, email_str, cleaned_password))
            conn.commit()
            cursor.close()
            conn.close()
        else:
            # 1. Update .env file
            update_env_file(email_str, cleaned_password)
            # 2. Update environmental variables in current running process
            os.environ["SENDER_EMAIL"] = email_str
            os.environ["EMAIL_PASSWORD"] = cleaned_password
        
        if len(cleaned_password) != 16:
            return {
                "message": (
                    "Settings saved ✅ — WARNING: Gmail App Passwords are exactly 16 characters. "
                    "If email sending fails, generate one at myaccount.google.com → Security → App Passwords"
                )
            }
        return {"message": "Email settings saved to database ✅" if x_user_email else "Email settings saved to .env ✅"}
    except Exception as e:
        raise HTTPException(500, f"Save failed: {str(e)}")


# ======================
# GET EMAIL SETTINGS (SAFE — never returns the password)
# ======================
@router.get("/get-email-settings")
def get_email_settings(x_user_email: str = Header(None)):
    try:
        from app.services.mail_service import load_settings
        data = load_settings(x_user_email.strip().lower() if x_user_email else None)
        pwd = data.get("password", "")
        return {
            "email":          data.get("email", ""),
            "password":       "",
            "password_saved": bool(pwd),
            "app_password":   len(pwd) == 16,
        }
    except Exception as e:
        raise HTTPException(500, str(e))


# ======================
# SAVE INTERVIEW TEMPLATE + SUBJECT
# ======================
@router.post("/save-template")
def save_template(data: TemplateSettings, x_user_email: str = Header(None)):
    try:
        with open(TEMPLATE_FILE, "w") as f:
            json.dump(data.dict(), f, indent=4)
        return {"message": "Template saved ✅"}
    except Exception as e:
        raise HTTPException(500, f"Template save failed: {str(e)}")


# ======================
# GET INTERVIEW TEMPLATE + SUBJECT
# ======================
@router.get("/get-template")
def get_template(x_user_email: str = Header(None)):
    try:
        if not os.path.exists(TEMPLATE_FILE):
            return {
                "interview_subject":  "Interview Scheduled",
                "interview_template": "",
                "reject_subject":     "Application Update — Nikitha Build Tech",
                "reject_template":    "",
            }
        with open(TEMPLATE_FILE, "r") as f:
            data = json.load(f)
        # Back-compat: old files may not have interview_subject
        if "interview_subject" not in data:
            data["interview_subject"] = "Interview Scheduled"
        if "reject_subject" not in data:
            data["reject_subject"] = "Application Update — Nikitha Build Tech"
        if "reject_template" not in data:
            data["reject_template"] = ""
        return data
    except Exception as e:
        raise HTTPException(500, str(e))


# ======================
# SAVE GOOGLE FORM LINK
# ======================
@router.post("/save-google-form")
def save_google_form(data: GoogleFormSettings, x_user_email: str = Header(None)):
    try:
        with open(GOOGLE_FORM_FILE, "w") as f:
            json.dump({"form_link": data.form_link}, f, indent=4)
        return {"message": "Google Form saved ✅"}
    except Exception as e:
        raise HTTPException(500, str(e))


# ======================
# GET GOOGLE FORM LINK
# ======================
@router.get("/get-google-form")
def get_google_form(x_user_email: str = Header(None)):
    try:
        if not os.path.exists(GOOGLE_FORM_FILE):
            return {"form_link": ""}
        with open(GOOGLE_FORM_FILE, "r") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(500, str(e))


# ======================
# SAVE GOOGLE MAIL TEMPLATE
# ======================
@router.post("/save-google-template")
def save_google_template(data: GoogleTemplateSettings, x_user_email: str = Header(None)):
    try:
        with open(GOOGLE_TEMPLATE_FILE, "w") as f:
            json.dump({"subject": data.subject, "body": data.body}, f, indent=4)
        return {"message": "Google template saved ✅"}
    except Exception as e:
        raise HTTPException(500, str(e))


# ======================
# GET GOOGLE MAIL TEMPLATE
# ======================
@router.get("/get-google-template")
def get_google_template(x_user_email: str = Header(None)):
    try:
        if not os.path.exists(GOOGLE_TEMPLATE_FILE):
            return {"subject": "Candidate Application Form", "body": ""}
        with open(GOOGLE_TEMPLATE_FILE, "r") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(500, str(e))


# ======================
# UPLOAD FULL-TIME OFFER TEMPLATE
# ======================
@router.post("/upload-offer-template")
async def upload_offer_template(file: UploadFile = File(...), x_user_email: str = Header(None)):
    if not file.filename:
        raise HTTPException(400, "No file selected")
    if not file.filename.lower().endswith(".docx"):
        raise HTTPException(400, "Only .docx files allowed")
    try:
        contents = await file.read()
        _, _, user_offer, _ = get_offer_paths(x_user_email)
        with open(user_offer, "wb") as buffer:
            buffer.write(contents)
        return {"message": "Full-Time offer template uploaded ✅", "filename": os.path.basename(user_offer)}
    except Exception as e:
        raise HTTPException(500, f"Upload failed: {str(e)}")
    finally:
        await file.close()


# ======================
# UPLOAD INTERNSHIP OFFER TEMPLATE
# ======================
@router.post("/upload-intern-offer-template")
async def upload_intern_offer_template(file: UploadFile = File(...), x_user_email: str = Header(None)):
    if not file.filename:
        raise HTTPException(400, "No file selected")
    if not file.filename.lower().endswith(".docx"):
        raise HTTPException(400, "Only .docx files allowed")
    try:
        contents = await file.read()
        _, _, _, user_intern = get_offer_paths(x_user_email)
        with open(user_intern, "wb") as buffer:
            buffer.write(contents)
        return {"message": "Internship offer template uploaded ✅", "filename": os.path.basename(user_intern)}
    except Exception as e:
        raise HTTPException(500, f"Upload failed: {str(e)}")
    finally:
        await file.close()


# ======================
# CHECK IF OFFER TEMPLATE EXISTS
# ======================
@router.get("/check-offer-template")
def check_offer_template(type: str = Query("fulltime"), x_user_email: str = Header(None)):
    offer_path, intern_path, _, _ = get_offer_paths(x_user_email)
    path = intern_path if type == "intern" else offer_path
    if os.path.exists(path):
        return {"exists": True, "filename": os.path.basename(path)}
    raise HTTPException(404, "Template not found")


# ======================
# TEST EMAIL CONNECTION
# ======================
@router.post("/test-email")
def test_email(x_user_email: str = Header(None)):
    import smtplib
    try:
        from app.services.mail_service import load_settings
        settings = load_settings(x_user_email.strip().lower() if x_user_email else None)
        email    = settings.get("email", "").strip()
        password = settings.get("password", "").strip()
        if not email or not password:
            return {"success": False, "error": "Email or password is empty"}
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(email, password)
        server.quit()
        return {"success": True, "message": f"SMTP connection successful for {email} ✅"}
    except smtplib.SMTPAuthenticationError:
        return {
            "success": False,
            "error": "Gmail authentication failed ❌ — Use an App Password from myaccount.google.com → Security → App Passwords"
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


# ======================
# GEMINI API KEY SETTINGS
# ======================
class GeminiSettings(BaseModel):
    api_key: str

def update_env_gemini_key(api_key: str):
    env_path = ".env"
    if not os.path.exists(env_path):
        possible_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
        if os.path.exists(possible_path):
            env_path = possible_path

    lines = []
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            lines = f.readlines()

    key_found = False
    new_lines = []

    for line in lines:
        stripped = line.strip()
        if stripped.startswith("GEMINI_API_KEY="):
            new_lines.append(f"GEMINI_API_KEY={api_key}\n")
            key_found = True
        else:
            new_lines.append(line)

    if not key_found:
        new_lines.append(f"GEMINI_API_KEY={api_key}\n")

    with open(env_path, "w") as f:
        f.writelines(new_lines)

@router.post("/save-gemini-settings")
def save_gemini_settings(data: GeminiSettings, x_user_email: str = Header(None)):
    try:
        api_key = data.api_key.strip()
        # 1. Update .env file
        update_env_gemini_key(api_key)
        # 2. Update environmental variables in current running process
        os.environ["GEMINI_API_KEY"] = api_key
        # 3. Re-initialize Gemini client in services/ai_resume
        from app.services.ai_resume import update_gemini_client
        update_gemini_client(api_key)
        
        # 4. Save to DB if user is logged in
        if x_user_email:
            safe_email = x_user_email.strip().lower()
            from app.database.db import get_connection
            conn = get_connection()
            cursor = conn.cursor()
            try:
                # Ensure column exists
                try:
                    cursor.execute("ALTER TABLE user_settings ADD COLUMN gemini_api_key VARCHAR(255) DEFAULT ''")
                    conn.commit()
                except Exception:
                    pass
                cursor.execute("""
                    INSERT INTO user_settings (email, gemini_api_key)
                    VALUES (%s, %s)
                    ON DUPLICATE KEY UPDATE gemini_api_key = VALUES(gemini_api_key)
                """, (safe_email, api_key))
                conn.commit()
            finally:
                cursor.close()
                conn.close()
        
        return {"message": "Gemini API key saved successfully ✅"}
    except Exception as e:
        raise HTTPException(500, f"Save failed: {str(e)}")

@router.get("/get-gemini-settings")
def get_gemini_settings(x_user_email: str = Header(None)):
    try:
        api_key = ""
        # Check database first if user is logged in
        if x_user_email:
            safe_email = x_user_email.strip().lower()
            from app.database.db import get_connection
            conn = get_connection()
            cursor = conn.cursor(dictionary=True)
            try:
                cursor.execute("SELECT gemini_api_key FROM user_settings WHERE email = %s", (safe_email,))
                row = cursor.fetchone()
                if row:
                    api_key = row.get("gemini_api_key", "")
            except Exception:
                pass
            finally:
                cursor.close()
                conn.close()
        
        # Fallback to env variable
        if not api_key:
            api_key = os.getenv("GEMINI_API_KEY", "")
            
        return {
            "api_key": api_key,
            "api_key_saved": bool(api_key)
        }
    except Exception as e:
        raise HTTPException(500, str(e))