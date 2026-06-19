from fastapi import APIRouter, UploadFile, File, Form
import os, shutil

from app.services.resume_parser import (
    extract_text,
    extract_email,
    extract_phone,
    extract_name,
)

from app.services.jd_parser import extract_skills
from app.services.scoring import calculate_score

router = APIRouter()

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


@router.post("/analyze")
async def analyze_resumes(
    files: list[UploadFile] = File(...),
    jd: str = Form(...)
):
    results = []

    # Extract JD skills
    jd_skills = extract_skills(jd)

    for file in files:
        file_path = os.path.join(UPLOAD_FOLDER, file.filename)

        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Extract resume text
        text = extract_text(file_path)

        # Extract details
        name = extract_name(text)
        email = extract_email(text)
        phone = extract_phone(text)

        # Score
        score = calculate_score(text, jd_skills)

        results.append({
            "name": name,
            "email": email,
            "phone": phone,
            "score": score
        })

    return {"candidates": results}