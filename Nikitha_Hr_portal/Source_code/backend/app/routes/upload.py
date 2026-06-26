from fastapi import APIRouter, UploadFile, File, Form
from typing import List, Optional
import os
import io
import pdfplumber
from docx import Document
from datetime import datetime

from app.services.resume_parser import extract_text
from app.services.scoring import calculate_score
from app.routes.candidates import jobs_candidates_db

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# =========================
# JD FILE TEXT EXTRACTION
# =========================
def extract_jd_text(file_bytes, filename):
    text = ""

    if filename.endswith(".pdf"):
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                text += page.extract_text() or ""

    elif filename.endswith(".docx"):
        doc = Document(io.BytesIO(file_bytes))
        for para in doc.paragraphs:
            text += para.text + "\n"

    return text


# =========================
# MAIN API
# =========================
@router.post("/upload")
async def upload_resumes(
    resumes: List[UploadFile] = File(...),
    job_id: str = Form(...),
    job_description: Optional[str] = Form(None),
    jd_file: UploadFile = File(None)
):
    if job_id not in jobs_candidates_db:
        jobs_candidates_db[job_id] = []

    jobs_candidates_db[job_id].clear()

    # =========================
    # GET JD TEXT
    # =========================
    jd_text = ""

    if jd_file:
        file_bytes = await jd_file.read()
        jd_text = extract_jd_text(file_bytes, jd_file.filename)

    elif job_description:
        jd_text = job_description

    else:
        return {"error": "Provide Job Description (text or file)"}

    # =========================
    # PROCESS RESUMES
    # =========================
    for file in resumes:
        path = f"{UPLOAD_DIR}/{file.filename}"

        with open(path, "wb") as f:
            f.write(await file.read())

        resume_text = extract_text(path)

        # ⚠️ IMPORTANT: correct order
        score = calculate_score(resume_text, jd_text)

        jobs_candidates_db[job_id].append({
            "name": file.filename,
            "email": "not_found",
            "phone": "not_found",
            "score": score,
            "status": "pending",
            "created_at": datetime.now().isoformat()
        })

    # =========================
    # SORT + AI SELECT
    # =========================
    jobs_candidates_db[job_id].sort(key=lambda x: x["score"], reverse=True)
    for i in range(min(3, len(jobs_candidates_db[job_id]))):
        jobs_candidates_db[job_id][i]["status"] = "ai-selected"

    return {
    "message": "Analysis complete",
    "job_id": job_id,
    "candidates": jobs_candidates_db[job_id]
}