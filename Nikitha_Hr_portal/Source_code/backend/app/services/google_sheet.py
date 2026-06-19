import logging
import pandas as pd
import json
import os

logger = logging.getLogger(__name__)

# ======================================
# GOOGLE SHEET CSV LINK
# ======================================
SHEET_CSV = (
    "https://docs.google.com/spreadsheets/d/e/"
    "2PACX-1vTQhYVXu4mY4NjWqrm5k67oa-DH20vByHp0iwvEbqQQzmSmOhEWaxve3QIa_5o1tMWMhrCZkm11Ze8i/pub?output=csv"
)

# ======================================
# FILE: stores which emails were sent
# the form in the CURRENT batch
# ======================================
SENT_EMAILS_FILE = "sent_emails.json"
GOOGLE_FORM_FILE = "google_form.json"

import time
# Cache for Google Sheet CSV responses
_CSV_CACHE = {}
_CACHE_TTL = 10  # Cache duration in seconds


# ======================================
# FIND COLUMN
# Searches column headers for keywords
# and returns the cell value (or "")
# ======================================
def find_column(row, possible_names):
    """
    Search column headers for any of the possible_names (substring match).
    Strips whitespace from both column header and search term.
    Returns cell value or "" for NaN/missing.
    """
    for col in row.index:
        col_lower = str(col).strip().lower()
        for name in possible_names:
            if name.strip().lower() in col_lower:
                val = str(row[col]).strip()
                return "" if val.lower() == "nan" else val
    return ""


# ======================================
# ATS SCORE CALCULATOR
# ======================================
def calculate_form_ats(candidate):
    score = 0

    qualification  = str(candidate.get("degree", "")).lower()
    experience     = str(candidate.get("experience", "")).lower()
    joining        = str(candidate.get("joining", "")).lower()
    location       = str(candidate.get("location", "")).lower()
    specialization = str(candidate.get("specialization", "")).lower()

    # DEGREE
    if any(x in qualification for x in ["b.e", "be", "btech", "b.tech"]):
        score += 30
    if "mca" in qualification:
        score += 25
    if "msc" in qualification:
        score += 20
    if "bsc" in qualification:
        score += 15

    # SPECIALIZATION
    tech_skills = [
        "computer science", "cse", "it",
        "information technology", "ai", "ml", "ece"
    ]
    for skill in tech_skills:
        if skill in specialization:
            score += 10
            break

    # EXPERIENCE
    if "fresher" in experience:
        score += 20
    elif "1" in experience:
        score += 30
    elif "2" in experience:
        score += 40
    elif "3" in experience:
        score += 50

    # JOINING
    if "immediate" in joining:
        score += 20

    # LOCATION (has any value = +10)
    if location:
        score += 10

    return min(score, 100)


# ======================================
# SAVE SENT EMAILS
# Called by send_google_form after emails
# are sent — persists this batch's emails
# and name->email map for forms without
# an email field
# ======================================
def save_sent_emails(email_list: list, candidates: list = None, user_email: str = None):
    with open(SENT_EMAILS_FILE, "w") as f:
        json.dump(
            {
                "emails":     email_list,
                "candidates": candidates or []
            },
            f,
            indent=4
        )


# ======================================
# LOAD SENT EMAILS AS SET
# Returns a set of lowercase emails
# ======================================
def load_sent_emails(user_email: str = None) -> set:
    if not os.path.exists(SENT_EMAILS_FILE):
        return set()
    try:
        with open(SENT_EMAILS_FILE, "r") as f:
            data = json.load(f)
        return {e.strip().lower() for e in data.get("emails", [])}
    except Exception:
        return set()


# ======================================
# LOAD SENT EMAILS AS NAME->EMAIL MAP
# Used for name-based matching when the
# Google Form has no email field
# ======================================
def _load_sent_emails_raw(user_email: str = None) -> dict:
    """Returns {name_lower: email} from sent_emails.json candidates list."""
    if not os.path.exists(SENT_EMAILS_FILE):
        return {}
    try:
        with open(SENT_EMAILS_FILE, "r") as f:
            data = json.load(f)
        # Format: {"emails": [...], "candidates": [{"name":..,"email":..}]}
        result = {}
        for c in data.get("candidates", []):
            name  = str(c.get("name", "")).strip().lower()
            email = str(c.get("email", "")).strip().lower()
            if name and email:
                result[name] = email
        return result
    except Exception:
        return {}


# ======================================
# CLEAR SENT EMAILS
# Called on batch reset
# ======================================
def clear_sent_emails(user_email: str = None):
    if os.path.exists(SENT_EMAILS_FILE):
        os.remove(SENT_EMAILS_FILE)


# ======================================
# MAIN: GET GOOGLE FORM RESPONSES
#
# KEY FIXES:
# 1. Skips rows with empty email
# 2. Only returns candidates from THIS
#    batch (cross-matched via sent_emails)
# 3. Deduplicates multiple submissions
#    (keeps latest row per email)
# ======================================
def get_google_form_responses(user_email: str = None):
    try:
        sheet_url = SHEET_CSV
        if os.path.exists(GOOGLE_FORM_FILE):
            try:
                with open(GOOGLE_FORM_FILE, "r") as f:
                    form_data = json.load(f)
                sheet_url = form_data.get("form_link", SHEET_CSV) or SHEET_CSV
            except Exception as e:
                logger.error("Error loading custom Google Sheet URL: %s", e)

        if sheet_url and ("docs.google.com/forms" in sheet_url or "forms.gle" in sheet_url):
            raise ValueError(
                "You configured a Google Form URL instead of a Google Sheet URL. "
                "Please configure the Google Sheet URL (where form responses are collected) in Settings."
            )

        # Robust Auto-convert Google Sheet URLs to CSV export links
        if sheet_url and "docs.google.com/spreadsheets" in sheet_url:
            if "/d/e/" in sheet_url:
                if "/pub" in sheet_url and "output=csv" not in sheet_url:
                    # Convert published HTML to CSV: /pubhtml -> /pub?output=csv
                    parts = sheet_url.split("/pub")
                    sheet_url = parts[0] + "/pub?output=csv"
            elif "/d/" in sheet_url:
                if "/export" not in sheet_url and "output=csv" not in sheet_url:
                    parts = sheet_url.split("/d/")
                    if len(parts) > 1:
                        sp_id = parts[1].split("/")[0]
                        sheet_url = f"https://docs.google.com/spreadsheets/d/{sp_id}/export?format=csv"

        import requests
        import io

        # Check Cache
        now = time.time()
        cached = _CSV_CACHE.get(sheet_url)
        if cached and (now - cached["timestamp"] < _CACHE_TTL):
            csv_text = cached["csv_text"]
            logger.info("Using cached Google Sheet CSV responses for url: %s", sheet_url)
        else:
            try:
                response = requests.get(sheet_url, timeout=5)
                response.raise_for_status()
                csv_text = response.text
                _CSV_CACHE[sheet_url] = {
                    "timestamp": now,
                    "csv_text": csv_text
                }
            except requests.exceptions.Timeout:
                if cached:
                    logger.warning("Google Sheet fetch timed out, falling back to cached CSV")
                    csv_text = cached["csv_text"]
                else:
                    raise ValueError("Connection to Google Sheet timed out after 5 seconds. Please try again.")
            except requests.exceptions.HTTPError as he:
                if he.response.status_code in (401, 403):
                    raise ValueError("Google Sheet is private. Please update sharing settings to 'Anyone with the link can view'.")
                if cached:
                    logger.warning("Google Sheet fetch failed with HTTP %s, falling back to cached CSV", he.response.status_code)
                    csv_text = cached["csv_text"]
                else:
                    raise ValueError(f"Failed to fetch Google Sheet: HTTP {he.response.status_code}")
            except Exception as e:
                if cached:
                    logger.warning("Google Sheet fetch failed, falling back to cached CSV: %s", e)
                    csv_text = cached["csv_text"]
                else:
                    raise ValueError(f"Could not connect to Google Sheet: {str(e)}")

        try:
            df = pd.read_csv(io.StringIO(csv_text))
        except Exception:
            raise ValueError("The configured URL did not return valid CSV data. Please verify it is a Google Sheet URL.")

        sent_emails     = load_sent_emails()           # set of lowercase emails
        sent_names_map  = _load_sent_emails_raw()      # {name_lower: email}

        # No active batch — do not return entire sheet history
        if not sent_emails and not sent_names_map:
            return []

        # key(email) -> candidate — keeps HIGHEST ATS score per person
        candidates_map = {}

        for row_idx, row in df.iterrows():
            candidate = {
                # ── BASIC ─────────────────────────────────────────
                "name":  find_column(row, ["full name", "name"]),
                "email": find_column(row, ["email address", "email"]),
                "phone": find_column(row, ["mobile number", "mobile", "phone"]),

                # ── EDUCATION ─────────────────────────────────────
                "degree":         find_column(row, ["degree"]),
                "specialization": find_column(row, ["specialization", "branch"]),
                "college":        find_column(row, ["college", "university"]),
                "year":           find_column(row, ["year of passing", "passing"]),

                # ── EXPERIENCE ────────────────────────────────────
                "experience": find_column(row, ["position applying", "experience"]),

                # ── LOCATION ──────────────────────────────────────
                "location": find_column(row, ["current location", "permanent location", "location"]),

                # ── JOINING ───────────────────────────────────────
                "joining": find_column(row, ["joining", "notice period"]),

                # ── GENDER ────────────────────────────────────────
                "gender": find_column(row, ["gender"]),

                # ── DOB ───────────────────────────────────────────
                "dob": find_column(row, ["date of birth", "dob"]),
            }

            email_lower = candidate["email"].strip().lower()
            name_lower  = candidate["name"].strip().lower()

            if not name_lower:
                continue

            # ── MATCHING ──────────────────────────────────────────
            if email_lower and email_lower in sent_emails:
                match_key = email_lower
            elif not email_lower and name_lower in sent_names_map:
                matched_email = sent_names_map[name_lower]
                candidate["email"] = matched_email
                match_key = matched_email.lower()
            else:
                continue

            # ATS SCORE
            candidate["ats_score"] = calculate_form_ats(candidate)

            # STATUS
            if candidate["ats_score"] >= 75:
                candidate["status"] = "Selected"
            elif candidate["ats_score"] >= 50:
                candidate["status"] = "Review"
            else:
                candidate["status"] = "Rejected"

            # DEDUP: keep the submission with the HIGHEST ATS score
            existing = candidates_map.get(match_key)
            if not existing or candidate["ats_score"] >= existing["ats_score"]:
                candidates_map[match_key] = candidate

        candidates = list(candidates_map.values())
        return sorted(candidates, key=lambda x: x["ats_score"], reverse=True)

    except ValueError as ve:
        logger.warning("Google Sheet validation error: %s", ve)
        raise
    except Exception as e:
        logger.exception("Google Sheet fetch failed: %s", e)
        raise ValueError(f"An unexpected error occurred while loading Google Sheet: {str(e)}")