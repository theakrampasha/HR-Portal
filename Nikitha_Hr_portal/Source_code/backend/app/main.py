from fastapi import FastAPI, UploadFile, File, Form, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from typing import Optional, List
import asyncio
import logging
import os
import io

from dotenv import load_dotenv
load_dotenv()

logging.basicConfig(level=logging.WARNING)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("huggingface_hub").setLevel(logging.ERROR)
logging.getLogger("transformers").setLevel(logging.ERROR)
from pydantic import BaseModel
import smtplib
from email.mime.text import MIMEText
import json
import pdfplumber
from docx import Document

# ==============================
# IMPORT ROUTES
# ==============================
from app.routes import history
from app.routes import candidates
from app.routes import reports

from app.routes.offer             import router as offer_router
from app.routes.reject            import router as reject_router
from app.routes.settings          import router as settings_router
from app.routes.attendance        import router as attendance_router
from app.routes.send_google_form  import router as google_form_router
from app.routes.email_replies     import router as email_replies_router
from app.routes.form_schema       import router as form_schema_router
from app.routes.auth              import router as auth_router

# ==============================
# SERVICES
# ==============================
from app.services.scheduler    import router as schedule_router
from app.services.google_sheet import get_google_form_responses
from app.services.ai_resume import ai_resume_analysis, check_gemini_health

# ==============================
# HELPERS
# ==============================
from app.utils.helper import (
    extract_text,
    extract_email,
    extract_phone,
    extract_name,
    calculate_score,
    get_matched_skills,
    extract_job_role,
    extract_experience
)

# ==============================
# APP INIT
# ==============================
from app.database.db import init_db

app = FastAPI()


@app.on_event("startup")
def startup_init_database():
    try:
        init_db()
        print("Database ready:", "candidate_history table initialized")
    except Exception as e:
        print("Database init failed:", e)

# ==============================
# CORS
# ==============================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==============================
# ROUTERS
# ==============================
app.include_router(history.router)
app.include_router(candidates.router)
app.include_router(reports.router)
app.include_router(google_form_router)
app.include_router(schedule_router)
app.include_router(offer_router)
app.include_router(reject_router)
app.include_router(settings_router)
app.include_router(attendance_router)
app.include_router(email_replies_router)
app.include_router(form_schema_router)
app.include_router(auth_router)

# ==============================
# CONFIG
# ==============================
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

app.mount(
    "/uploads",
    StaticFiles(directory=UPLOAD_DIR),
    name="uploads"
)


# ==============================
# HELPERS
# ==============================
def extract_docx_text(file_bytes: bytes) -> str:
    """
    Extract ALL text from a .docx file — including content inside tables.
    doc.paragraphs only returns top-level paragraphs and misses table cells entirely.
    """
    doc = Document(io.BytesIO(file_bytes))
    lines = []

    # 1. Top-level paragraphs
    for para in doc.paragraphs:
        text = para.text.strip()
        if text:
            lines.append(text)

    # 2. Table cells
    seen_cells = set()
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                if cell.text in seen_cells:
                    continue
                seen_cells.add(cell.text)
                for para in cell.paragraphs:
                    text = para.text.strip()
                    if text:
                        lines.append(text)

    return "\n".join(lines)


# ==============================
# HOME
# ==============================
@app.get("/")
def home():
    return {"message": "AI Recruitment System Running 🚀"}

@app.get("/health/gemini")
async def gemini_health():
    """Endpoint to report Gemini API health status."""
    return await check_gemini_health()


# ==============================
# ANALYZE RESUMES
# ==============================
@app.post("/analyze")
async def analyze(
    files: List[UploadFile] = File(...),
    jd: Optional[str] = Form(None),
    jd_file: UploadFile = File(None),
    x_user_email: str = Header(None)
):
    jd_text = ""

    # ── Parse JD ────────────────────────────────────────────────────────────
    if jd_file:
        file_bytes = await jd_file.read()
        filename_lower = jd_file.filename.lower()

        if filename_lower.endswith(".pdf"):
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                for page in pdf.pages:
                    jd_text += page.extract_text() or ""

        elif filename_lower.endswith(".docx"):
            jd_text = extract_docx_text(file_bytes)

        else:
            return {"success": False, "error": "Unsupported JD file format. Use .pdf or .docx"}

    elif jd:
        jd_text = jd

    else:
        return {"success": False, "error": "Provide JD text or upload a JD file"}

    if not jd_text.strip():
        return {"success": False, "error": "JD file was parsed but no text could be extracted"}

    print(f"JD TEXT LENGTH: {len(jd_text)} chars")

    # ── Process each resume ──────────────────────────────────────────────────
    async def process_resume(file: UploadFile):
        try:
            file_path  = os.path.join(UPLOAD_DIR, file.filename)
            file_bytes = await file.read()
            with open(file_path, "wb") as buffer:
                buffer.write(file_bytes)

            resume_text = extract_text(file_path)

            if not resume_text or len(resume_text.strip()) < 50:
                return {
                    "name":           file.filename,
                    "email":          "Not Found",
                    "phone":          "Not Found",
                    "role":           "Unknown",
                    "experience":     0,
                    "ats_score":      0,
                    "ai_score":       0,
                    "score":          0,
                    "matched_skills": [],
                    "filename":       file.filename,
                    "ai_analysis":    "Resume extraction failed — file may be scanned/image-based",
                    "status":         "pending"
                }

            # ATS score: keyword overlap between resume and JD
            ats_score = calculate_score(resume_text, jd_text)

            # AI score: Gemini semantic analysis
            try:
                ai_result   = await ai_resume_analysis(resume_text, jd_text, x_user_email)
                ai_score    = ai_result.get("ai_score", 0)
                ai_analysis = ai_result.get("analysis", "No analysis returned")
            # FIXED — use ATS score as fallback when Gemini quota is exhausted
            except Exception as e:
                print(f"AI ERROR for {file.filename}: {e}")
                ai_score    = ats_score   # fallback to ATS score so final isn't halved
                ai_analysis = f"AI unavailable (quota exceeded) — ATS score used as fallback"

            # ──────────────────────────────────────────────────────────────
            # FIX-4: Weighted final score  →  50% ATS + 50% AI
            #
            # WHY: The old 70/30 split over-relied on keyword matching.
            # For senior / GM-level roles the resume language is strategic
            # ("financial performance", "stakeholder management") not
            # hands-on PEB ("purlins", "erection sequence"), so the ATS
            # keyword score unfairly tanks. Gemini's semantic read is more
            # reliable at this level, so we balance the two equally.
            # ──────────────────────────────────────────────────────────────
            final_score = round((0.50 * ats_score) + (0.50 * ai_score), 2)

            return {
                "name":           extract_name(resume_text),
                "email":          extract_email(resume_text),
                "phone":          extract_phone(resume_text),
                "role":           extract_job_role(resume_text),
                "experience":     extract_experience(resume_text),
                "ats_score":      ats_score,
                "ai_score":       ai_score,
                "score":          final_score,
                "ai_analysis":    ai_analysis,
                "matched_skills": get_matched_skills(resume_text, jd_text),
                "filename":       file.filename,
                "status":         "pending"
            }

        except Exception as e:
            print(f"RESUME ERROR for {file.filename}: {e}")
            return {
                "name":           file.filename,
                "email":          "Error",
                "phone":          "Error",
                "role":           "Unknown",
                "experience":     0,
                "ats_score":      0,
                "ai_score":       0,
                "score":          0,
                "matched_skills": [],
                "filename":       file.filename,
                "ai_analysis":    f"Processing failed: {str(e)}",
                "status":         "pending"
            }

    results = await asyncio.gather(*[process_resume(f) for f in files])
    results = sorted(results, key=lambda x: x["score"], reverse=True)

    return {
        "success":          True,
        "message":          "Analysis complete 🚀",
        "total_candidates": len(results),
        "candidates":       results
    }



# Add at top of main.py
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.services.backup_service import backup_database

# Create scheduler
scheduler = AsyncIOScheduler()

# Auto-backup database every day at 6 PM
scheduler.add_job(
    backup_database,
    trigger="cron",
    hour=18,
    id="daily_db_backup",
    replace_existing=True
)

# Start scheduler
scheduler.start()