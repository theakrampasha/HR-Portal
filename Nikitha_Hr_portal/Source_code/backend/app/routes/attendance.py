"""
app/routes/attendance.py  (v2)

KEY FIXES:
  1. "Issue" is now a proper attendance status (not ignored)
  2. A newer reply always overwrites an older one — no stale "Confirmed"
     blocking a later "Issue" message
  3. store_scheduled_candidates() called by /schedule route for email matching
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter()

_attendance: dict = {}           # { registered_email: { status, ... } }
_scheduled_candidates: list = []


class AttendanceOverride(BaseModel):
    email:  str
    status: str   # "Confirmed" | "Declined" | "Issue" | "Pending"


def store_scheduled_candidates(candidates: list):
    global _scheduled_candidates
    existing_emails = {c["email"] for c in _scheduled_candidates}
    for c in candidates:
        email = c.get("email", "").lower().strip()
        if email and email not in existing_emails:
            _scheduled_candidates.append({
                "name": c.get("name", ""),
                "email": email
            })


def _get_all_candidates():
    # Merge _scheduled_candidates and candidates_db
    candidates = []
    seen = set()
    for c in _scheduled_candidates:
        email = c.get("email", "").lower().strip()
        if email and email not in seen:
            seen.add(email)
            candidates.append(c)

    try:
        from app.routes.candidates import candidates_db
        for c in candidates_db:
            email = c.get("email", "").lower().strip()
            if email and email not in seen:
                seen.add(email)
                candidates.append({
                    "name": c.get("name", ""),
                    "email": email
                })
    except Exception as e:
        print("ERROR loading candidates_db in attendance:", e)

    return candidates


def _find_registered_email(reply: dict) -> Optional[str]:
    candidates = _get_all_candidates()
    if not candidates:
        return reply["from_email"]

    registered   = {c["email"]: c for c in candidates}
    from_email   = reply.get("from_email", "").lower().strip()
    thread_emails = [e.lower().strip() for e in reply.get("candidate_emails", [])]
    from_name    = reply.get("from_name", "").lower().strip()

    if from_email in registered:
        return from_email
    for addr in thread_emails:
        if addr in registered:
            return addr
    for reg_email, cand in registered.items():
        parts = cand["name"].lower().split()
        if parts and (parts[0] in from_name or from_name.startswith(parts[0])):
            return reg_email

    return reply["from_email"]


def _sync_from_inbox():
    try:
        from app.routes.email_replies import fetch_replies_from_inbox
        replies = fetch_replies_from_inbox()

        for r in replies:
            rtype      = r["reply_type"]   # confirmed | issue | unknown
            replied_at = r["replied_at"]
            matched    = _find_registered_email(r)
            if not matched:
                continue

            existing = _attendance.get(matched, {})

            # ── FIX 1: don't update if manually overridden ────────────────
            if existing.get("manually_set"):
                continue

            # ── FIX 2: always update — newer reply wins over older one ────
            # (previously "confirmed" from 15 May would block "issue" from today)
            if rtype == "confirmed":
                new_status = "Confirmed"
            elif rtype == "issue":
                new_status = "Issue"       # ← FIX: was ignored before
            else:
                continue                   # unknown → leave as-is

            _attendance[matched] = {
                **existing,
                "status":       new_status,
                "replied_at":   replied_at,
                "reply_body":   r["body"],
                "reply_type":   rtype,
                "replied_from": r["from_email"],
            }

    except Exception as e:
        print("ATTENDANCE SYNC ERROR:", e)


@router.get("/attendance")
def get_attendance():
    _sync_from_inbox()
    return {"success": True, "attendance": _attendance}


@router.post("/attendance/override")
def override_attendance(data: AttendanceOverride):
    existing = _attendance.get(data.email, {})
    _attendance[data.email] = {
        **existing,
        "status":       data.status,
        "manually_set": True,
    }
    return {"success": True, "attendance": _attendance[data.email]}


@router.delete("/attendance/reset")
def reset_attendance():
    global _attendance
    _attendance = {}
    return {"success": True}