from google import genai
from dotenv import load_dotenv
import os
import json
from pydantic import BaseModel

# =========================
# LOAD ENV VARIABLES
# =========================
load_dotenv()

# =========================
# GEMINI CLIENT
# =========================
# Initialize Gemini client lazily; may be None if API key missing
try:
    client = genai.Client(
        api_key=os.getenv("GEMINI_API_KEY")
    )
except Exception as e:
    print(f"[ai_resume] GEMINI client init error: {e}")
    client = None

from typing import Optional

def get_gemini_client(user_email: str = None) -> Optional[genai.Client]:
    """Get the Gemini client. Checks database first for user-specific key,
    then falls back to global environment key.
    """
    global client
    api_key = None
    if user_email:
        try:
            from app.database.db import get_connection
            conn = get_connection()
            cursor = conn.cursor(dictionary=True)
            try:
                cursor.execute("SELECT gemini_api_key FROM user_settings WHERE email = %s", (user_email.strip().lower(),))
                row = cursor.fetchone()
                if row:
                    api_key = row.get("gemini_api_key", "").strip()
            except Exception:
                pass
            finally:
                if 'cursor' in locals():
                    cursor.close()
                if 'conn' in locals():
                    conn.close()
        except Exception as e:
            print(f"[ai_resume] Error fetching key from DB: {e}")

    if not api_key:
        api_key = os.getenv("GEMINI_API_KEY", "").strip()

    if not api_key:
        return client

    try:
        return genai.Client(api_key=api_key)
    except Exception as e:
        print(f"[ai_resume] Dynamic client init error: {e}")
        return client

def update_gemini_client(api_key: str):
    global client
    try:
        if api_key.strip():
            client = genai.Client(api_key=api_key.strip())
        else:
            client = None
    except Exception as e:
        print(f"[ai_resume] GEMINI client update error: {e}")
        client = None

# Max chars sent to Gemini per field — prevents context window overflow
_MAX_CHARS = 8_000


class AIAnalysis(BaseModel):
    ai_score: int
    analysis: str


# =====================================================================
# FIX-3: JD ROLE DETECTION — used to build a role-aware prompt
# =====================================================================
import re

_STRATEGIC_PM_JD_RE = re.compile(
    r"\b(general\s+manager|gm|project\s+director|director"
    r"|deputy\s+general\s+manager|dgm|head\s+of\s+projects?)\b",
    re.I,
)

_CONSTRUCTION_COMPANIES_RE = re.compile(
    r"larsen\s*&?\s*toubro|l\s*&\s*t\b|tata\s+projects|shapoorji"
    r"|afcons|gammon|ncc\s+limited|hcc\b|ircon|simplex\s+(infra|projects)"
    r"|patel\s+engineering|samsung\s+engineering|hyundai\s+engineering"
    r"|engineers\s+india|eil\b|cpwd\b|pwd\b|nikitha\s+build",
    re.I,
)


def _build_prompt(resume_text: str, jd_text: str) -> str:
    """
    Build a Gemini prompt that is role-aware.

    FIX-3 details:
    - OLD prompt capped "construction project management" at 40–70.
      This was WRONG when the JD itself is a GM/Director-level PM role.
    - NEW prompt detects whether the JD is strategic-PM or hands-on-PEB
      and sets the scoring guide accordingly.
    - Tier-1 construction company context (L&T, Tata Projects, etc.) is
      explicitly called out as a strong domain-fit signal.
    """

    is_strategic_pm_jd = bool(_STRATEGIC_PM_JD_RE.search(jd_text[:500]))
    has_construction_company = bool(_CONSTRUCTION_COMPANIES_RE.search(resume_text))

    if is_strategic_pm_jd:
        scoring_guide = """
ROLE CONTEXT — this JD is for a GENERAL MANAGER / DIRECTOR / HEAD level role.
The hiring need is a SENIOR PROJECT MANAGEMENT leader, not a hands-on PEB fabrication
engineer. Apply these domain rules:

- Candidates from tier-1 construction/infrastructure companies (L&T, Tata Projects,
  Shapoorji Pallonji, Afcons, NCC, HCC, Gammon, Samsung Engineering, etc.) are
  CONSTRUCTION-DOMAIN by definition, even if their resume doesn't say "PEB".
  Such candidates score 50–90 depending on seniority and PM skill match.

- Candidates with 12+ years of construction project management, PMP certification,
  Primavera P6 / MS Project, stakeholder management, budgeting, risk management,
  MIS reporting score 65–90.

- Candidates with 8–12 years of construction PM background score 50–65.

- Candidates from NON-CONSTRUCTION domains (pure IT, software, FMCG, finance
  with no construction exposure) score 0–20.

- Candidates from finance/accounts only (no project management at all) score 0–15,
  even if they worked at a construction company.

SCORING GUIDE for this GM-level JD:
  0–20  : Wrong domain (pure IT/software/FMCG/finance with no PM exposure)
  21–40 : Finance/Admin at a construction company — domain adjacent but not PM
  41–55 : Construction PM background but junior (<8 yrs) or weak JD keyword match
  56–70 : Good construction PM match, most requirements covered, some gaps
  71–85 : Strong match — senior PM at a construction firm, matches most requirements
  86–95 : Near-perfect — 15+ yrs construction PM, PMP, direct JD skill alignment
  96–100: Exceptional — every requirement met perfectly
"""
    else:
        scoring_guide = """
DOMAIN RULES — apply strictly:
- Candidates must have experience in construction, PEB, civil, structural,
  MEP, QS, HSE, or related engineering fields to score above 20.
- IT, software, AI/ML, or non-construction candidates score 0–15 MAXIMUM,
  even if they are technically impressive, because domain mismatch is
  disqualifying for all roles at this company.
- Construction project management experience (PM, planning, QS, contracts)
  scores 40–70 depending on seniority and keyword match.
- Hands-on PEB/structural/site experience scores 60–90.

SCORING GUIDE:
  0–15  : Wrong domain (IT, software, non-construction)
  16–35 : Tangentially related (general engineering, facilities management)
  36–55 : Construction background but weak keyword match to this specific JD
  56–75 : Good construction match, most JD requirements covered
  76–90 : Strong match, domain expert with direct JD skill alignment
  91–100: Near-perfect match, every requirement met
"""

    company_hint = (
        "\nNOTE: This candidate has worked at a tier-1 construction/infrastructure "
        "company. Treat this as strong domain-fit evidence even if the resume "
        "lacks PEB-specific buzzwords.\n"
        if has_construction_company else ""
    )

    return f"""
You are an ATS (Applicant Tracking System) for NIKITHA BUILD-TECH PRIVATE LIMITED,
a company that builds Pre-Engineered Buildings (PEB), steel structures, civil
construction, and industrial facilities in India.

{scoring_guide}
{company_hint}
Return ONLY a valid JSON object:
{{
    "ai_score": <integer 0–100>,
    "analysis": "<3–4 sentences: domain fit, matched strengths, key gaps, hire recommendation>"
}}

JOB DESCRIPTION:
{jd_text}

RESUME:
{resume_text}
"""


# =========================
# LOCAL FALLBACK ANALYSIS
# =========================
async def _local_fallback_analysis(resume_text: str, jd_text: str) -> dict:
    """Fallback local analysis when Gemini API is unavailable or quota is exceeded."""
    try:
        from app.services.scoring import calculate_score
        score = int(calculate_score(resume_text, jd_text))
    except Exception as e:
        print(f"[ai_resume] Local fallback scoring error: {e}")
        score = 0
    return {
        "ai_score": score,
        "analysis": "AI unavailable (quota exceeded) — ATS score used as fallback"
    }


# =========================
# AI RESUME ANALYSIS
# =========================
async def ai_resume_analysis(resume_text: str, jd_text: str, user_email: str = None) -> dict:
    """
    Score a resume against a JD using Gemini AI.

    Returns
    -------
    dict with keys:
        ai_score  : int   0–100
        analysis  : str   3–4 sentence summary
    """
    if not resume_text or not resume_text.strip():
        return {"ai_score": 0, "analysis": "Resume text is empty."}

    if not jd_text or not jd_text.strip():
        return {"ai_score": 0, "analysis": "Job description is empty."}

    resume_trimmed = resume_text.strip()[:_MAX_CHARS]
    jd_trimmed     = jd_text.strip()[:_MAX_CHARS]

    # FIX-3: use role-aware prompt builder
    prompt = _build_prompt(resume_trimmed, jd_trimmed)

    # Attempt Gemini API call
    req_client = get_gemini_client(user_email)
    if req_client is None:
        # No client; fallback immediately
        return await _local_fallback_analysis(resume_text, jd_text)
    try:
        response = await req_client.aio.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=AIAnalysis,
            ),
        )
    except Exception as e:
        print(f"[ai_resume] GEMINI API ERROR: {type(e).__name__}: {e}")
        # Fallback to local analysis on any Gemini error
        return await _local_fallback_analysis(resume_text, jd_text)

    try:
        result_text = response.text
        if not result_text:
            print("[ai_resume] WARNING: Gemini returned empty response.")
            return await _local_fallback_analysis(resume_text, jd_text)
        data = json.loads(result_text)
        ai_score = int(data.get("ai_score", 0))
        ai_score = max(0, min(ai_score, 100))
        return {
            "ai_score": ai_score,
            "analysis": data.get("analysis", "No analysis provided.")
        }
    except (json.JSONDecodeError, ValueError, KeyError) as e:
        print(f"[ai_resume] PARSE ERROR: {e} | raw response: {response.text!r:.200}")
        return await _local_fallback_analysis(resume_text, jd_text)

async def check_gemini_health() -> dict:
    """Check the health of the Gemini API client.

    Returns a dict with status information. If the client could not be
    initialized (e.g., missing API key) the status will be "unavailable".
    Any exception from the Gemini SDK results in a status of "error" with
    the exception message.
    """
    if client is None:
        return {"status": "unavailable", "reason": "Gemini client not initialized (missing API key)"}
    try:
        # Lightweight call to fetch model metadata
        client.models.get("gemini-2.0-flash")
        return {"status": "ok"}
    except Exception as e:
        return {"status": "error", "error": str(e)}