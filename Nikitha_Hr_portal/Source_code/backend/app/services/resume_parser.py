import re
from PyPDF2 import PdfReader


# -------------------------------
# EXTRACT TEXT FROM PDF
# -------------------------------
def extract_text(file_path):
    try:
        reader = PdfReader(file_path)
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
        return text
    except Exception as e:
        print("Error reading PDF:", e)
        return ""


# -------------------------------
# EMAIL EXTRACTION
# -------------------------------
def extract_email(text):
    match = re.search(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", text)
    return match.group(0) if match else "Not Found"


# -------------------------------
# PHONE EXTRACTION
# -------------------------------
def extract_phone(text):
    match = re.search(r"\b\d{10}\b", text)
    return match.group(0) if match else "Not Found"


# -------------------------------
# NAME EXTRACTION
# -------------------------------
def extract_name(text):
    lines = text.strip().split("\n")

    # Try first meaningful line
    for line in lines[:5]:
        if len(line.strip()) > 2 and not any(char.isdigit() for char in line):
            return line.strip()

    return "Unknown"


# -------------------------------
# SIMPLE ATS SCORING
# -------------------------------
def calculate_score(resume_text, jd_text):
    resume_words = set(resume_text.lower().split())
    jd_words = set(jd_text.lower().split())

    if len(jd_words) == 0:
        return 0

    match = resume_words.intersection(jd_words)
    score = int((len(match) / len(jd_words)) * 100)

    return score


# -------------------------------
# MAIN FUNCTION (IMPORTANT)
# -------------------------------
def parse_resume(file_path, jd_text):
    text = extract_text(file_path)

    name = extract_name(text)
    email = extract_email(text)
    phone = extract_phone(text)
    score = calculate_score(text, jd_text)

    return {
        "name": name,
        "email": email,
        "phone": phone,
        "score": score
    }