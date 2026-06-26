from fastapi import APIRouter, HTTPException
from typing import List
from pydantic import BaseModel

router = APIRouter()

# =========================================
# IN-MEMORY STORE

jobs_candidates_db = {}
candidates_db = []


# =========================================
# HELPERS
# =========================================
def _normalize(val) -> str:
    """Convert pandas NaN strings and None to empty string."""
    if val is None:
        return ""
    s = str(val).strip()
    return "" if s.lower() == "nan" else s


# =========================================
# MODELS
# =========================================
class CandidateUpdate(BaseModel):
    name: str
    status: str  # "selected" | "ai-selected" | "rejected" | "pending"


class BulkCandidates(BaseModel):
    candidates: List[dict]


# =========================================
# GET ALL CANDIDATES
# =========================================
@router.get("/candidates")
def get_candidates():
    return candidates_db


# =========================================
# ADD CANDIDATES (bulk)
# Called after Google Form responses are
# fetched — normalizes "nan" values from pandas
# =========================================
@router.post("/candidates/bulk")
def add_candidates_bulk(payload: BulkCandidates):
    global candidates_db
    normalized = []

    for c in payload.candidates:
        normalized.append({
            "name":           _normalize(c.get("name")),
            "email":          _normalize(c.get("email")),
            "phone":          _normalize(c.get("phone")),
            "degree":         _normalize(c.get("degree")),
            "specialization": _normalize(c.get("specialization")),
            "college":        _normalize(c.get("college")),
            "experience":     _normalize(c.get("experience")),
            "location":       _normalize(c.get("location")),
            "joining":        _normalize(c.get("joining") or c.get("notice_period")),
            "gender":         _normalize(c.get("gender")),
            "dob":            _normalize(c.get("dob")),
            "ats_score":      c.get("ats_score") or c.get("score") or 0,
            "filename":       _normalize(c.get("filename")),
            "status":         _normalize(c.get("status")) or "pending",
        })

    candidates_db.extend(normalized)
    return {
        "message": f"{len(normalized)} candidates added",
        "total": len(candidates_db)
    }


# =========================================
# UPDATE CANDIDATE STATUS
# =========================================
@router.post("/update")
def update_candidate(data: CandidateUpdate):
    for c in candidates_db:
        if c.get("name") == data.name:
            c["status"] = data.status
            return {"message": "updated", "candidate": c}
    raise HTTPException(status_code=404, detail="Candidate not found")


# =========================================
# GET FINAL ROUND CANDIDATES
# Only candidates explicitly selected
# =========================================
@router.get("/final")
def get_final():
    return [
        c for c in candidates_db
        if c.get("status") in ("selected", "ai-selected")
    ]


# =========================================
# RESET ALL CANDIDATES
# Call this when starting a new batch
# =========================================
@router.delete("/candidates/reset")
def reset_candidates():
    global candidates_db
    candidates_db = []
    jobs_candidates_db.clear()
    return {"message": "All candidates cleared"}