"""
ats_engine.py  –  ATS Scoring Backend  (v3 — bug-fixed)
Nikitha Build-Tech Private Limited
====================================
Domain: Construction | Civil | Structural | PEB | MEP | QS | HSE | Architecture

FIXES vs v2
-----------
FIX-1  COMPANY CONTEXT BONUS
       L&T (Larsen & Toubro), Tata Projects, Shapoorji, NCC, HCC, Afcons etc.
       are tier-1 Indian construction/infrastructure companies. Candidates from
       these firms are construction-domain by definition. A company-context
       score bonus (0–15 pts) is now added to keyword_score before final blend.

FIX-2  ROLE-AWARE JD KEYWORD WEIGHTING
       When the JD title is "General Manager / Project Director / Head" the role
       is strategic PM, not hands-on PEB fabrication. PEB execution-only terms
       (erection sequence, site fabrication, welding) that appear in the JD are
       now down-weighted by 50 % so PM candidates aren't unfairly penalised for
       not listing hands-on terms they'd never put on a resume.

FIX-3  AI PROMPT — removed hard cap on PM candidates
       "construction project management scores 40–70" cap is REMOVED. The cap
       was wrong because the GM-Projects JD IS a PM role. Score guidance is now
       JD-aware: if the JD title signals GM / Director level, senior PM
       candidates should score 65–90.

FIX-4  MAIN SCORE WEIGHTS — ATS ↓, AI ↑
       Old: 70% ATS + 30% AI
       New: 50% ATS + 50% AI
       Rationale: keyword-based ATS under-scores soft-skills-heavy senior roles;
       Gemini's semantic read is more reliable at GM level.

FIX-5  EXPERIENCE SCORE — 16 yrs candidate was scored correctly (10/10) once
       seniority inference works. Added explicit "16 years" / "almost 16" regex.

FIX-6  PMP / CERTIFICATION BONUS
       PMP certification is now treated as equivalent to "project management"
       with weight 3 (raised from existing alias that mapped to weight 2).

Score formula (v3)
------------------
  keyword_score      35%  – weighted domain keyword overlap + company bonus
  semantic_score     45%  – AI cosine similarity (chunked MiniLM)
  experience_score   20%  – years-of-experience gap penalty
  (AI/ATS blend in main.py is now 50/50 — see main.py FIX-4)
"""

# =========================
# IMPORTS
# =========================
import re
import math
from collections import defaultdict

from sentence_transformers import SentenceTransformer, util

try:
    import docx as _docx
    import pdfplumber
    from pdf2image import convert_from_path
    import pytesseract
    _IO_AVAILABLE = True
except ImportError:
    _IO_AVAILABLE = False


# =========================
# LOAD AI MODEL (once)
# =========================
_model = SentenceTransformer("all-MiniLM-L6-v2")


# =====================================================================
# FIX-1: TIER-1 CONSTRUCTION COMPANY LIST
# Candidates from these firms are construction-domain by definition.
# =====================================================================
_CONSTRUCTION_COMPANIES = [
    r"larsen\s*&?\s*toubro", r"\bl\s*&\s*t\b", r"\blt\s+construction\b",
    r"tata\s+projects", r"tata\s+consultancy\s+engineers",
    r"shapoorji\s+pallonji", r"\bncc\s+limited\b", r"\bncc\b",
    r"\bhcc\b", r"hindustan\s+construction",
    r"afcons", r"gammon\s+india", r"gammon",
    r"ircon", r"rites\b", r"nbcc",
    r"unitech\s+infra", r"simplex\s+infra", r"simplex\s+projects",
    r"patel\s+engineering", r"ivrcl", r"era\s+infra",
    r"stup\s+consultants", r"aecom", r"jacobs\s+engineering",
    r"samsung\s+engineering", r"hyundai\s+engineering",
    r"saipem", r"technip", r"petrofac",
    r"engineers\s+india", r"eil\b",
    r"cpwd", r"pwd\b", r"rites\b",
    r"ultratech\s+cement", r"acc\s+limited",
    r"nikitha\s+build", r"nikitha\s+buildtech",
]

_COMPANY_PATTERNS = [re.compile(p, re.I) for p in _CONSTRUCTION_COMPANIES]


def _company_bonus(resume_text: str) -> float:
    """
    Return 0–15 bonus points if the resume mentions a known
    tier-1 construction/infrastructure company.
    """
    for pattern in _COMPANY_PATTERNS:
        if pattern.search(resume_text):
            return 15.0
    return 0.0


# =====================================================================
# FIX-2: DETECT JD ROLE TYPE (strategic PM vs hands-on PEB)
# =====================================================================
_PM_ROLE_PATTERNS = re.compile(
    r"\b(general\s+manager|gm|project\s+director|director|head\s+of\s+projects?"
    r"|deputy\s+general\s+manager|dgm|vp\s+projects?|vice\s+president)\b",
    re.I,
)
_HANDS_ON_PEB_TERMS = {
    "erection sequence", "erection methodology", "site fabrication",
    "welding", "bolting", "rigging", "crane operation", "purlins",
    "girts", "eave struts", "galvalume", "clip lock", "standing seam",
    "rebar", "reinforcement detailing",
}


def _is_strategic_pm_jd(jd_text: str) -> bool:
    """Return True if the JD is for a GM/Director/Head-level strategic PM role."""
    # Check first 500 chars (job title section) primarily
    return bool(_PM_ROLE_PATTERNS.search(jd_text[:500]))


# =====================================================================
# DOMAIN KEYWORD LIBRARY — Nikitha Build-Tech specific
# =====================================================================
DOMAIN_KEYWORDS: dict[str, int] = {

    # ── CAD / BIM / Design Software ──────────────────────────────
    "autocad": 3, "autocad 2d": 3, "autocad 3d": 3,
    "revit": 3, "staad pro": 3, "staad.pro": 3,
    "etabs": 3, "safe": 3, "tekla": 3,
    "solidedge": 2, "bim": 3, "navisworks": 3, "sketchup": 2,

    # ── Project Planning / Scheduling ─────────────────────────────
    "primavera": 3, "primavera p6": 3,
    "ms project": 2, "project scheduling": 2,
    "project schedule": 2, "project planning": 2,
    "baseline schedule": 2, "project baseline": 2,
    "resource allocation": 2, "critical path": 2,
    "eot": 3, "variation orders": 3, "claims management": 3,
    "milestones": 2,

    # FIX-6: PMP raised to weight 3 — it's a hard credential
    "pmp": 3,
    "project management professional": 3,

    # ── Structural Design & Analysis ──────────────────────────────
    "structural design": 3, "structural analysis": 3,
    "rcc design": 3, "rcc": 3, "prestressed concrete": 3,
    "post-tensioning": 3, "rebar": 2, "reinforcement detailing": 3,
    "load calculation": 3, "wind load": 3, "seismic design": 3,
    "foundation design": 3, "pile foundation": 3, "raft foundation": 3,
    "strip foundation": 3, "retaining wall": 3,
    "is code": 3, "is 456": 3, "is 800": 3, "is 875": 3,
    "nbc": 3, "portal frame": 3, "moment frame": 2,
    "truss": 2, "space frame": 3,

    # ── Pre-Engineered Buildings (PEB) ────────────────────────────
    "pre-engineered building": 3, "peb": 3, "peb construction": 3,
    "steel structure": 3, "steel fabrication": 3,
    "purlins": 3, "girts": 3, "eave struts": 3, "ridge cap": 2,
    "bay spacing": 2, "column": 2, "rafter": 2, "end frame": 2,
    "interior frame": 2, "mezzanine floor": 2,
    "crane beam": 3, "runway beam": 3,

    # ── Roofing & Cladding ────────────────────────────────────────
    "roofing": 2, "galvalume": 3, "clip lock": 3, "standing seam": 3,
    "metal roofing": 3, "roofing sheets": 2, "cladding": 2,
    "wall panel": 2, "insulation": 2, "under-deck insulation": 3,
    "glass wool": 2, "mineral wool": 2, "sandwich panel": 3,

    # ── Structural Glazing & Facades ──────────────────────────────
    "structural glazing": 3, "glazing": 2, "curtain wall": 3,
    "spider glazing": 3, "frameless glazing": 3, "skylights": 2,
    "polycarbonate": 2, "facade": 2, "aluminium composite": 2, "acp cladding": 3,

    # ── Civil Construction & Site Work ────────────────────────────
    "site supervision": 2, "site engineer": 2, "site management": 2,
    "civil works": 2, "civil operations": 2, "earthwork": 2,
    "grading": 2, "paving": 2, "drainage": 2, "waterproofing": 2,
    "plastering": 2, "masonry": 2, "concrete mix design": 3,
    "concrete pouring": 2, "formwork": 2, "scaffolding": 2,
    "piling": 3, "pile driving": 3, "shuttering": 2, "dewatering": 2,

    # ── Surveying ─────────────────────────────────────────────────
    "surveying": 2, "levelling": 2, "total station": 3,
    "gps survey": 2, "gis": 3, "arcgis": 3, "setting out": 3,
    "benchmark": 2, "theodolite": 2, "differential levelling": 2,

    # ── Erection & Fabrication ────────────────────────────────────
    "erection": 3, "erection sequence": 3, "erection methodology": 3,
    "fabrication": 3, "site fabrication": 3,
    "welding": 2, "cutting": 2, "bolting": 2, "crane operation": 3,
    "rigging": 3, "high-torque bolting": 3, "alignment": 2, "plumb": 2,

    # ── MEP ───────────────────────────────────────────────────────
    "mep": 3, "hvac": 3, "plumbing": 2,
    "fire fighting": 3, "fire suppression": 3, "electrical wiring": 2,
    "hv lv": 2, "transformer": 2, "substation": 2, "earthing": 2,
    "lighting": 2, "duct work": 2, "piping": 2,
    "chilled water": 2, "drainage system": 2,

    # ── Quantity Surveying & Cost ─────────────────────────────────
    "quantity surveying": 3, "qs": 3, "boq": 3, "bom": 2,
    "estimation": 2, "cost estimation": 3, "cost control": 3,
    "budget management": 3, "budget": 2, "financial performance": 2,
    "rate analysis": 3, "tendering": 3, "billing": 2, "invoice": 2,
    "abstract of cost": 3, "work breakdown structure": 2, "wbs": 2,
    "snag list": 2, "punch list": 2, "measurement sheet": 2,

    # ── Contract / Procurement ────────────────────────────────────
    "contract management": 3, "procurement": 2,
    "vendor management": 2, "vendor contract": 2,
    "subcontractor management": 3, "subcontractor": 2,
    "material planning": 2, "purchase order": 2, "work order": 2,
    "comparative statement": 2, "ndas": 1,

    # ── Project Management (GM-level) ─────────────────────────────
    "project management": 2, "construction management": 3,
    "project coordination": 2, "project execution": 2,
    "project handover": 2, "commissioning": 2, "handing over": 2,
    "progress reporting": 2, "daily progress report": 2, "dpr": 2,
    "mis report": 2, "mis": 2,
    "stakeholder management": 3, "stakeholder": 2,
    "stakeholder communication": 3,
    "team leadership": 2, "resource management": 2, "risk management": 2,
    "corrective actions": 2, "annual business plan": 2,
    "statutory compliance": 2, "statutory": 2,

    # ── Quality & Compliance ──────────────────────────────────────
    "quality control": 2, "qc": 2, "quality assurance": 2,
    "qa qc": 3, "iso 9001": 3, "ndt": 3,
    "non-destructive testing": 3, "ultrasonic testing": 3,
    "radiography": 3, "third party inspection": 3,
    "material testing": 2, "cube test": 2, "slump test": 2,
    "shop drawing review": 3, "as-built drawing": 3, "red-line drawing": 2,

    # ── HSE / Safety ──────────────────────────────────────────────
    "hse": 3, "health safety environment": 3, "safety management": 2,
    "osha": 3, "tool box talk": 2, "risk assessment": 2,
    "method statement": 3, "work permit": 2, "ppe": 2,
    "incident report": 2, "near miss": 2,

    # ── Green / Certification ─────────────────────────────────────
    "leed": 3, "igbc": 3, "green building": 2, "rera": 2,
    "cpwd": 3, "pwd": 2, "nbm": 2,

    # ── Drawings & Documentation ──────────────────────────────────
    "civil drawing": 2, "shop drawing": 3, "ga drawing": 3,
    "fabrication drawing": 3, "layout drawing": 2,
    "isometric drawing": 2, "section drawing": 2,
    "bar bending schedule": 3, "bbs": 2,

    # ── Tools & Software (generic) ────────────────────────────────
    "ms excel": 1, "ms word": 1, "powerpoint": 1, "microsoft office": 1,

    # ── Generic Professional (weight 1) ───────────────────────────
    "leadership": 1, "communication": 1, "teamwork": 1,
    "problem solving": 1, "planning": 1, "reporting": 1,
    "negotiation": 1, "performance": 1, "innovation": 1, "compliance": 1,
}


# =====================================================================
# ALIAS MAP  →  canonical form (all lowercase)
# =====================================================================
_ALIASES: dict[str, str] = {
    # Software
    "autocad civil 3d": "autocad 3d", "acad": "autocad",
    "staad.pro": "staad pro", "staad-pro": "staad pro",
    "etabs v18": "etabs", "tekla structures": "tekla",
    "ms project": "ms project", "microsoft project": "ms project",
    "primavera p6": "primavera p6", "oracle primavera": "primavera p6",
    "revit mep": "revit", "revit structure": "revit",
    "revit architecture": "revit", "bim 360": "bim",
    "navisworks manage": "navisworks",
    # PEB
    "pre engineered building": "pre-engineered building",
    "pre engineered steel building": "pre-engineered building",
    "pre-engineered steel building": "pre-engineered building",
    "peb structure": "peb", "peb construction": "peb construction",
    "metal building": "peb",
    # Roofing
    "clip-lock": "clip lock", "cliplock": "clip lock",
    "standing seam roofing": "standing seam",
    # Steel
    "structural steel": "steel structure", "steel structures": "steel structure",
    # Drawings
    "fabrication drawing": "fabrication drawing",
    "ga drawings": "ga drawing", "general arrangement": "ga drawing",
    "bar bending schedule": "bar bending schedule", "bbs": "bbs",
    "as built drawing": "as-built drawing", "as-built": "as-built drawing",
    "red line drawing": "red-line drawing", "shop drawings": "shop drawing",
    # QA QC
    "quality assurance quality control": "qa qc", "qa/qc": "qa qc",
    # HSE
    "hse management": "hse", "health & safety": "hse",
    "health and safety": "hse", "safety officer": "hse",
    # NDT
    "non destructive testing": "ndt", "non-destructive testing": "ndt",
    "ut testing": "ultrasonic testing",
    # Method statements
    "method statements": "method statement", "work permits": "work permit",
    "risk assessments": "risk assessment",
    # Certifications
    "leed certified": "leed", "leed ap": "leed",
    "igbc certified": "igbc", "cpwd specification": "cpwd",
    # IS codes
    "is:456": "is 456", "is:800": "is 800", "is:875": "is 875",
    "is-456": "is 456", "is-800": "is 800",
    # EOT
    "eot claim": "eot", "extension of time": "eot",
    # QS
    "bill of quantities": "boq", "bill of materials": "bom",
    "bill of material": "bom", "rate analysis sheet": "rate analysis",
    "variation order": "variation orders", "change order": "variation orders",
    # Reports
    "daily progress report": "dpr", "daily progress reports": "dpr",
    "mis reports": "mis report", "monthly mis": "mis report",
    "weekly mis": "mis report",
    # Crane / rigging
    "crane ops": "crane operation", "rigging plan": "rigging",
    # Insulation
    "glass wool insulation": "glass wool", "rockwool": "mineral wool",
    "mineral wool insulation": "mineral wool",
    # MEP
    "mep works": "mep", "mep services": "mep",
    "fire fighting system": "fire fighting",
    # Survey
    "total station survey": "total station", "gps surveying": "gps survey",
    "differential leveling": "differential levelling",
    # Tests
    "cube testing": "cube test", "slump testing": "slump test",
    # HVAC
    "hvac system": "hvac",
    # Misc
    "mezzanine": "mezzanine floor", "ms excel": "ms excel",
    "excel": "ms excel", "microsoft excel": "ms excel",
    "ms word": "ms word", "microsoft word": "ms word",
    # Sub-contractor variants
    "sub contractor": "subcontractor", "sub contractors": "subcontractor",
    "sub-contractor": "subcontractor", "sub-contractors": "subcontractor",
    "subcontractors": "subcontractor",
    "subcontractor management": "subcontractor management",
    # Erection
    "erection sequence": "erection sequence",
    "erection methodologies": "erection methodology",
    "erection methodology": "erection methodology",
    "site fabrication": "site fabrication",
    # Planning
    "project baseline": "project baseline", "baseline": "baseline schedule",
    "project schedules": "project schedule",
    "project scheduling": "project scheduling",
    "resource allocation plans": "resource allocation",
    "corrective actions": "corrective actions",
    "corrective measures": "corrective actions",
    # Stakeholder
    "stakeholder communication": "stakeholder communication",
    "stakeholders": "stakeholder",
    # Cost / budget
    "cost control": "cost control", "budget control": "budget management",
    "budgeting": "budget management", "financial budgeting": "budget management",
    # Vendor / contracts
    "vendor contracts": "vendor contract", "work orders": "work order",
    "work order": "work order", "measurement sheet": "measurement sheet",
    "month wise measurement": "measurement sheet",
    # Compliance
    "statutory compliance": "statutory compliance",
    "statutory compliances": "statutory compliance",
    "labour laws": "statutory compliance",
    # Risk / leadership
    "risk management": "risk management",
    "team leadership": "team leadership", "team lead": "team leadership",
    "civil operations": "civil operations",
    "performance reporting": "progress reporting",
    "performance review": "reporting",
    "annual business plan": "annual business plan",
    "business plan": "annual business plan",
    # FIX-6: PMP aliases all map to "pmp" (weight 3)
    "pmp": "pmp",
    "pmp®": "pmp",
    "pmp certified": "pmp",
    "project management professional": "project management professional",
    "p.m.p": "pmp",
    # L&T aliases → company bonus is handled separately, but normalize the text
    "larsen & toubro": "larsen and toubro",
    "larsen and toubro": "larsen and toubro",
    "l & t": "larsen and toubro",
    "l&t": "larsen and toubro",
}


# =====================================================================
# TEXT PRE-PROCESSING
# =====================================================================

def _normalise(text: str) -> str:
    """Lowercase + collapse whitespace + alias substitution."""
    text = text.lower()
    text = re.sub(r"\s+", " ", text)
    for alias, canonical in sorted(_ALIASES.items(), key=lambda x: -len(x[0])):
        text = re.sub(r"\b" + re.escape(alias) + r"\b", canonical, text)
    return text


def _remove_noise(text: str) -> str:
    return re.sub(r"[^a-z0-9\s#+.]", " ", text)


# =====================================================================
# SECTION-AWARE TEXT WEIGHTING
# =====================================================================
_SECTION_HEADERS = re.compile(
    r"(skills|technical skills|core competencies|key skills|"
    r"experience|work experience|professional experience|employment|"
    r"certifications|projects|project experience|education|qualifications|"
    r"summary|objective|profile)",
    re.IGNORECASE,
)
_HIGH_WEIGHT_SECTIONS = {
    "skills", "technical skills", "core competencies", "key skills",
    "certifications", "projects", "project experience",
}
_MEDIUM_WEIGHT_SECTIONS = {
    "experience", "work experience", "professional experience", "employment",
}


def extract_weighted_text(raw_text: str) -> str:
    lines = raw_text.split("\n")
    current_weight = 1
    weighted_lines: list[str] = []
    for line in lines:
        header_match = _SECTION_HEADERS.match(line.strip())
        if header_match:
            section = header_match.group(0).lower()
            if section in _HIGH_WEIGHT_SECTIONS:
                current_weight = 3
            elif section in _MEDIUM_WEIGHT_SECTIONS:
                current_weight = 2
            else:
                current_weight = 1
        weighted_lines.extend([line] * current_weight)
    return "\n".join(weighted_lines)


# =====================================================================
# KEYWORD EXTRACTION
# =====================================================================

def _extract_domain_matches(text: str) -> dict[str, int]:
    norm = _normalise(text)
    found: dict[str, int] = {}
    sorted_kws = sorted(
        DOMAIN_KEYWORDS.keys(), key=lambda k: len(k.split()), reverse=True
    )
    for kw in sorted_kws:
        pattern = r"\b" + re.escape(kw) + r"\b"
        if re.search(pattern, norm):
            found[kw] = DOMAIN_KEYWORDS[kw]
    return found


# =====================================================================
# EXPERIENCE EXTRACTION
# =====================================================================

_JD_SENIORITY_PATTERNS: list[tuple[re.Pattern, float]] = [
    (re.compile(r"\b(chief\s+executive|ceo|managing\s+director|md)\b", re.I), 20.0),
    (re.compile(r"\b(general\s+manager|gm)\b", re.I),                        15.0),
    (re.compile(r"\b(deputy\s+general\s+manager|dgm|senior\s+director)\b", re.I), 12.0),
    (re.compile(r"\b(project\s+director|director)\b", re.I),                 12.0),
    (re.compile(r"\b(senior\s+manager|sr\.?\s+manager)\b", re.I),            10.0),
    (re.compile(r"\b(manager|project\s+manager|construction\s+manager)\b", re.I), 8.0),
    (re.compile(r"\b(deputy\s+manager|assistant\s+manager)\b", re.I),         6.0),
    (re.compile(r"\b(senior\s+engineer|sr\.?\s+engineer|lead\s+engineer)\b", re.I), 5.0),
]


def extract_experience(text: str, is_jd: bool = False) -> float:
    """Return max years of experience found in text."""
    text_l = text.lower()
    # FIX-5: also match "almost 16 years", "16+ years", "over 15 years"
    matches = re.findall(
        r"(?:almost|over|around|approximately)?\s*(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\b",
        text_l,
    )
    if matches:
        return max(float(m) for m in matches)

    if is_jd:
        check_zone = text[:400] + text_l
        for pattern, min_years in _JD_SENIORITY_PATTERNS:
            if pattern.search(check_zone):
                return min_years
    return 0.0


# =====================================================================
# EXPERIENCE SCORE  (0–10)
# =====================================================================

def _experience_score(resume_exp: float, jd_exp: float) -> float:
    if jd_exp == 0:
        return 10.0
    diff = resume_exp - jd_exp
    if diff >= 0:
        return 10.0
    elif diff >= -1:
        return 8.0
    elif diff >= -2:
        return 6.0
    elif diff >= -3:
        return 4.0
    else:
        return 2.0


# =====================================================================
# KEYWORD SCORE  (weighted)  — FIX-1 + FIX-2 applied here
# =====================================================================

def keyword_score(resume_text: str, jd_text: str) -> float:
    """
    Weighted precision: fraction of JD's domain vocabulary (by weight)
    that is also present in the resume.

    FIX-1: Company-context bonus (0–15) added for tier-1 construction firms.
    FIX-2: For strategic-PM JDs (GM/Director), hands-on PEB execution terms
           in the JD are down-weighted by 50% so PM candidates aren't penalised
           for not listing terms they'd never put on a planning-level resume.
    """
    resume_kws = _extract_domain_matches(resume_text)
    jd_kws     = _extract_domain_matches(jd_text)

    # FIX-2: down-weight hands-on PEB execution terms when JD is strategic PM
    if _is_strategic_pm_jd(jd_text):
        for term in _HANDS_ON_PEB_TERMS:
            if term in jd_kws:
                jd_kws[term] = max(1, jd_kws[term] // 2)

    if not jd_kws:
        r_words = set(_remove_noise(_normalise(resume_text)).split())
        j_words = set(_remove_noise(_normalise(jd_text)).split())
        j_words = {w for w in j_words if len(w) > 2}
        if not j_words:
            return 0.0
        return round(len(r_words & j_words) / len(j_words) * 100, 2)

    total_weight   = sum(jd_kws.values())
    matched_weight = sum(
        weight for kw, weight in jd_kws.items() if kw in resume_kws
    )
    base_score = round((matched_weight / total_weight) * 100, 2)

    # FIX-1: add company-context bonus, cap at 100
    bonus = _company_bonus(resume_text)
    return min(100.0, round(base_score + bonus, 2))


# =====================================================================
# SEMANTIC SCORE  (chunked cosine similarity)
# =====================================================================

def _chunk_text(text: str, max_words: int = 200) -> list[str]:
    words = text.split()
    return [
        " ".join(words[i: i + max_words])
        for i in range(0, len(words), max_words)
    ]


def semantic_score(resume_text: str, jd_text: str) -> float:
    jd_emb = _model.encode(jd_text, convert_to_tensor=True)
    chunks  = _chunk_text(resume_text)
    if not chunks:
        return 0.0
    scores = [
        util.cos_sim(
            _model.encode(chunk, convert_to_tensor=True), jd_emb
        ).item()
        for chunk in chunks
    ]
    best = max(scores)
    mean = sum(scores) / len(scores)
    return round((0.6 * best + 0.4 * mean) * 100, 2)


# =====================================================================
# MATCHED / MISSING SKILLS
# =====================================================================

def get_matched_skills(resume_text: str, jd_text: str) -> list[str]:
    resume_kws = _extract_domain_matches(resume_text)
    jd_kws     = _extract_domain_matches(jd_text)
    matched = sorted(
        (kw for kw in jd_kws if kw in resume_kws),
        key=lambda k: jd_kws[k], reverse=True,
    )
    return matched[:25]


def get_missing_skills(resume_text: str, jd_text: str) -> list[str]:
    resume_kws = _extract_domain_matches(resume_text)
    jd_kws     = _extract_domain_matches(jd_text)
    missing = sorted(
        (kw for kw in jd_kws if kw not in resume_kws),
        key=lambda k: jd_kws[k], reverse=True,
    )
    return missing[:20]


# =====================================================================
# MAIN ATS SCORE  (entry point)
# =====================================================================

def calculate_ats_score(resume_text: str, jd_text: str) -> dict:
    weighted_resume = extract_weighted_text(resume_text)

    ks = keyword_score(weighted_resume, jd_text)
    ss = semantic_score(weighted_resume, jd_text)

    resume_exp = extract_experience(resume_text, is_jd=False)
    jd_exp     = extract_experience(jd_text,     is_jd=True)
    es         = _experience_score(resume_exp, jd_exp)

    # Weights: keyword 35% | semantic 45% | experience 20%
    final = round(
        0.35 * ks
        + 0.45 * ss
        + 0.20 * (es * 10),
        2,
    )

    return {
        "ats_score":            final,
        "keyword_score":        ks,
        "semantic_score":       ss,
        "experience_score_raw": es,
        "resume_exp_years":     resume_exp,
        "jd_exp_years":         jd_exp,
        "matched_skills":       get_matched_skills(resume_text, jd_text),
        "missing_skills":       get_missing_skills(resume_text, jd_text),
        "score_breakdown": {
            "keyword_weight":    "35%",
            "semantic_weight":   "45%",
            "experience_weight": "20%",
        },
    }


# Backward-compat alias
def calculate_score(resume_text: str, jd_text: str) -> float:
    return calculate_ats_score(resume_text, jd_text)["ats_score"]


# =====================================================================
# FILE EXTRACTION
# =====================================================================

def extract_text(file_path: str) -> str:
    if not _IO_AVAILABLE:
        raise RuntimeError(
            "Install pdfplumber, python-docx, pdf2image, pytesseract "
            "to use file extraction."
        )
    text = ""
    try:
        if file_path.endswith(".pdf"):
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    text += page.extract_text() or ""
            if not text.strip():
                images = convert_from_path(file_path)
                for img in images:
                    text += pytesseract.image_to_string(img)

        elif file_path.endswith(".docx"):
            doc = _docx.Document(file_path)
            for para in doc.paragraphs:
                text += para.text + "\n"
            seen_cells = set()
            for table in doc.tables:
                for row in table.rows:
                    for cell in row.cells:
                        if cell.text in seen_cells:
                            continue
                        seen_cells.add(cell.text)
                        for para in cell.paragraphs:
                            text += para.text + " "

        elif file_path.endswith(".txt"):
            with open(file_path, encoding="utf-8") as f:
                text = f.read()

    except Exception as exc:
        print(f"[extract_text] ERROR: {exc}")
    return text


# =====================================================================
# CANDIDATE INFO EXTRACTION
# =====================================================================

def extract_name(text: str) -> str:
    if not text:
        return "Unknown Candidate"
    lines = [ln.strip() for ln in text.split("\n") if ln.strip()]
    blacklist = {
        "resume", "cv", "curriculum vitae", "profile", "summary",
        "objective", "contact", "email", "phone", "education",
        "skills", "experience", "engineer", "manager", "architect",
        "surveyor", "inspector", "supervisor", "technician",
    }
    for line in lines[:20]:
        if any(b in line.lower() for b in blacklist):
            continue
        if "@" in line or re.search(r"\d", line):
            continue
        clean = re.sub(r"[^A-Za-z\s]", " ", line)
        words = clean.split()
        if 2 <= len(words) <= 4:
            return " ".join(w.capitalize() for w in words)
    return "Unknown Candidate"


def extract_email(text: str) -> str:
    if not text:
        return "Not Found"
    text = text.lower()
    text = re.sub(r"[^\x00-\x7F]+", " ", text)
    text = text.replace("[at]", "@").replace("(at)", "@")
    text = text.replace("[dot]", ".").replace("(dot)", ".")
    text = re.sub(r"\s*@\s*", "@", text)
    text = re.sub(r"(?<!\S)([a-z]+)\s+([a-z0-9]+@)", r"\1\2", text)

    def _fix_domain(m):
        return "@" + re.sub(r"\s*\.\s*", ".", m.group(1))

    text = re.sub(
        r"@([a-z0-9]+(?:\s{0,2}\.\s{0,2}[a-z0-9]+)+)", _fix_domain, text
    )
    text = re.sub(r"\d{6,}\s+(?=[a-z0-9._%+-]+@)", " ", text)
    text = re.sub(r"\d{6,}([a-z][a-z0-9._%+-]*@)", r"\1", text)
    matches = re.findall(r"[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}", text)
    if not matches:
        return "Not Found"
    blacklist_usernames = {
        "hr", "info", "admin", "support", "contact", "office",
        "corporate", "noreply", "no-reply", "careers", "recruitment",
    }
    valid_emails = []
    for email in matches:
        username, _ = email.split("@", 1)
        if username.isdigit() or username in blacklist_usernames or len(username) < 3:
            continue
        valid_emails.append(email)
    if not valid_emails:
        return matches[0]
    for email in valid_emails:
        if any(p in email for p in ["gmail.com", "yahoo.com", "outlook.com",
                                     "hotmail.com", "icloud.com"]):
            return email
    return max(valid_emails, key=len)


def extract_phone(text: str) -> str:
    if not text:
        return "Not Found"
    plain = re.findall(r"\b\d{10}\b", text)
    if plain:
        return plain[0]
    formatted = re.findall(
        r"(?:\+?\d{1,3}[\s\-.])?(?:\(?\d{2,4}\)?[\s\-.])\d{3,5}[\s\-.]?\d{4,5}",
        text,
    )
    for match in formatted:
        digits = re.sub(r"\D", "", match)
        if 10 <= len(digits) <= 13:
            return match.strip()
    return "Not Found"


def extract_job_role(text: str) -> str:
    text_l = text.lower()
    patterns = [
        "pre-engineered building engineer", "peb engineer",
        "structural design engineer", "structural engineer",
        "site engineer", "civil engineer", "construction engineer",
        "project engineer", "planning engineer",
        "quantity surveyor", "qs engineer",
        "mep engineer", "hvac engineer",
        "hse engineer", "safety officer", "safety engineer",
        "qa qc engineer", "quality engineer",
        "erection engineer", "fabrication engineer",
        "general manager", "deputy general manager",
        "project director", "project manager",
        "construction manager", "site manager",
        "deputy project manager",
        "contract manager", "procurement manager",
        "bim coordinator", "bim manager",
        "surveyor", "architect",
        "engineer", "manager", "coordinator", "supervisor",
    ]
    for p in patterns:
        if re.search(r"\b" + re.escape(p) + r"\b", text_l):
            return p.title()
    return "Not Specified"


# =====================================================================
# FULL RESUME PROCESSOR
# =====================================================================

def process_resume(file_path: str, jd_text: str) -> dict:
    text   = extract_text(file_path)
    result = calculate_ats_score(text, jd_text)
    result.update({
        "name":  extract_name(text),
        "email": extract_email(text),
        "phone": extract_phone(text),
        "role":  extract_job_role(text),
    })
    return result