"""
app/routes/email_replies.py

Handles:
  - GET  /email-replies          → fetch all parsed reply threads
  - POST /email-replies/send     → send a reply back to a candidate
  - POST /email-replies/refresh  → re-fetch inbox and re-parse replies

FIX: In-memory cache (30s TTL) prevents "Too many simultaneous IMAP connections"
     Both /attendance and /email-replies now share one cached fetch.
"""

from fastapi import APIRouter
from pydantic import BaseModel
import imaplib
import email
from email.header import decode_header
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import json
import os
import re
import time
from datetime import datetime
from typing import List, Optional

router = APIRouter()

# =========================================
# IN-MEMORY CACHE  ← FIX for IMAP overload
# =========================================
_reply_cache: list = []
_cache_ts: float   = 0.0
CACHE_TTL: int     = 30   # seconds — only one real IMAP conn per 30 s


# =========================================
# HELPERS
# =========================================
def load_settings(user_email: str = None):
    from app.services.mail_service import load_settings
    return load_settings(user_email)


def decode_str(s):
    """Decode encoded email header strings."""
    if s is None:
        return ""
    parts = decode_header(s)
    result = ""
    for part, enc in parts:
        if isinstance(part, bytes):
            result += part.decode(enc or "utf-8", errors="replace")
        else:
            result += part
    return result


def extract_body(msg):
    """
    Extract ONLY the candidate's own reply text — strip Gmail/Outlook
    quoted history (lines starting with '>' or the 'On ... wrote:' block).
    """
    body = ""
    if msg.is_multipart():
        for part in msg.walk():
            ct = part.get_content_type()
            cd = str(part.get("Content-Disposition", ""))
            if ct == "text/plain" and "attachment" not in cd:
                charset = part.get_content_charset() or "utf-8"
                body += part.get_payload(decode=True).decode(charset, errors="replace")
    else:
        charset = msg.get_content_charset() or "utf-8"
        body = msg.get_payload(decode=True).decode(charset, errors="replace")

    # Strip quoted reply history
    lines = body.splitlines()
    clean_lines = []
    for line in lines:
        stripped = line.strip()
        
        # Check if the line contains "On ... wrote:" (e.g. inline reply headers)
        match = re.search(r"\bOn\s+.+?\s+wrote\s*:", stripped, re.IGNORECASE)
        if match:
            prefix = stripped[:match.start()].strip()
            if prefix:
                clean_lines.append(prefix)
            break
            
        # Check if the line has other markers of start of reply history
        if re.search(r"^-+\s*Original Message\s*-+", stripped, re.IGNORECASE) or \
           re.search(r"^-+\s*Forwarded message\s*-+", stripped, re.IGNORECASE):
            break

        if re.match(r"^\bFrom:\s*\S+@\S+", stripped, re.IGNORECASE) or \
           re.match(r"^\bSent:\s*", stripped, re.IGNORECASE) or \
           re.match(r"^\bTo:\s*", stripped, re.IGNORECASE) or \
           re.match(r"^\bSubject:\s*", stripped, re.IGNORECASE):
            break

        if stripped.startswith(">"):
            continue
            
        clean_lines.append(line)

    return "\n".join(clean_lines).strip()


# ─────────────────────────────────────────────────────────────────────────────
# CLASSIFY REPLY
# Priority: strong confirm phrases → issue keywords → weak confirm words → unknown
# ─────────────────────────────────────────────────────────────────────────────

STRONG_CONFIRM_PHRASES = [
    "i will attend the interview",
    "i'll attend the interview",
    "i will attend",
    "i'll attend",
    "i will be there",
    "i'll be there",
    "i will come",
    "i'll come",
    "i am attending",
    "i'm attending",
    "i am coming",
    "i'm coming",
    "i shall attend",
    "will attend the interview",
    "happy to attend",
    "glad to attend",
    "please confirm my attendance",
    "i accept",
    "accepted",
    "count me in",
    "comfrom",
    "comfirm",
    "comfirmed",
    "confrom",
    "confromed",
    "i will attended the interview",
    "i'll attended the interview",
    "i will attended",
    "i'll attended",
    "will attended the interview",
    "will attended",
    "i am attended",
    "i'm attended",
    "i shall attended",
    "confirm my attendance",
    "confirmed my attendance",
    "confrom my attendance",
    "comfrom my attendance",
]

WEAK_CONFIRM_WORDS = [
    "confirm", "confirmed", "yes", "attending", "present",
    "sure", "absolutely", "definitely",
    "sounds good", "noted", "acknowledged", "thank you",
    "thanks", "received", "got it",
    "comfrom", "comfirm", "confrom", "conformed", "conforming",
    "attend", "attended", "will attend", "will attended", "attending",
    r"\bok\b", r"\bokay\b",
]

ISSUE_KEYWORDS = [
    "issue", "problem", "venue", "address",
    "zoom", "google meet", "teams", "meeting link",
    "reschedule", "postpone", "can't attend", "cannot attend",
    "unable to attend", "won't be able", "will not be able",
    "question", "query", "clarify", "clarification",
    "please share", "kindly share", "could you send",
    "confused", "not sure", "doubt",
]


def _kw_match(keywords: list, text: str) -> bool:
    for kw in keywords:
        if kw.startswith(r"\b"):
            if re.search(kw, text):
                return True
        else:
            if kw in text:
                return True
    return False


def classify_reply(body: str) -> str:
    lower = body.lower()

    for phrase in STRONG_CONFIRM_PHRASES:
        if phrase in lower:
            return "confirmed"

    issue_hit   = _kw_match(ISSUE_KEYWORDS,     lower)
    confirm_hit = _kw_match(WEAK_CONFIRM_WORDS, lower)

    if confirm_hit and not issue_hit:
        return "confirmed"
    if issue_hit:
        return "issue"
    return "unknown"


# =========================================
# FETCH REPLIES FROM INBOX  (with cache)
# =========================================
def fetch_replies_from_inbox(force: bool = False, user_email: str = None) -> List[dict]:
    """
    Connects to Gmail via IMAP and returns parsed reply objects.

    Uses a 30-second in-memory cache so that rapid polling from
    /attendance and /email-replies doesn't open a new IMAP connection
    every time — which causes Gmail's 'Too many simultaneous connections' error.

    Pass force=True (from the /refresh endpoint) to bypass the cache.
    """
    global _reply_cache, _cache_ts

    now = time.time()
    # Return cached data if still fresh and not a forced refresh
    if not force and _reply_cache and (now - _cache_ts) < CACHE_TTL:
        return _reply_cache

    settings        = load_settings(user_email)
    sender_email    = settings["email"]
    sender_password = settings["password"]

    replies = []
    mail    = None

    try:
        mail = imaplib.IMAP4_SSL("imap.gmail.com")
        mail.login(sender_email, sender_password)
        mail.select("inbox")

        # 1. Search SINCE 3 days ago (locale-independent)
        from datetime import datetime, timedelta
        three_days_ago = datetime.now() - timedelta(days=3)
        months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        since_date = f"{three_days_ago.day:02d}-{months[three_days_ago.month - 1]}-{three_days_ago.year}"
        
        _, data_since = mail.search(None, f"SINCE {since_date}")
        ids_since = data_since[0].split() if data_since[0] else []
        
        # 2. Also search latest 50 messages to ensure fallback/overlap
        _, data_all = mail.search(None, "ALL")
        ids_all = data_all[0].split() if data_all[0] else []
        ids_latest = ids_all[-50:]
        
        # Combine and deduplicate IDs, preserving order (oldest to newest)
        ids_since_ints = [int(x) for x in ids_since]
        ids_latest_ints = [int(x) for x in ids_latest]
        combined_ids_ints = sorted(list(set(ids_since_ints + ids_latest_ints)))
        
        # Limit combined to latest 100 to avoid any extreme overload
        ids = [str(x).encode() for x in combined_ids_ints[-100:]]

        for num in ids:
            # Fetch headers only first (very fast, doesn't download attachments)
            _, msg_data = mail.fetch(num, "(BODY.PEEK[HEADER])")
            raw_headers = msg_data[0][1]
            msg = email.message_from_bytes(raw_headers)

            from_addr = decode_str(msg.get("From", ""))
            subject   = decode_str(msg.get("Subject", ""))
            date_str  = msg.get("Date", "")

            email_match = re.search(r"[\w.\-+]+@[\w.\-]+\.\w+", from_addr)
            from_email  = email_match.group(0).lower() if email_match else from_addr.lower()

            if from_email == sender_email.lower():
                continue

            subj_lower = subject.lower()
            
            # Pre-filter: only fetch full body if subject has recruitment keywords or reply tags
            is_reply_subj = (
                subj_lower.startswith("re:") or
                "re:" in subj_lower or
                "aw:" in subj_lower or
                "fw:" in subj_lower or
                "interview" in subj_lower or
                "schedule"  in subj_lower or
                "confirm"   in subj_lower or
                "attend"    in subj_lower or
                "issue"     in subj_lower
            )
            
            if not is_reply_subj:
                # Skip downloading full body for non-replies
                continue

            # Fetch the actual full message body only for matches
            _, full_msg_data = mail.fetch(num, "(RFC822)")
            raw_bytes = full_msg_data[0][1]
            full_msg = email.message_from_bytes(raw_bytes)
            body = extract_body(full_msg)
            body_lower = body.lower()

            is_reply = (
                is_reply_subj or
                "interview" in body_lower or
                "schedule"  in body_lower or
                "confirm"   in body_lower or
                "attend"    in body_lower or
                "issue"     in body_lower or
                "problem"   in body_lower or
                "reschedule" in body_lower or
                "postpone"  in body_lower
            )
            if not is_reply:
                continue

            reply_type = classify_reply(body)

            try:
                from email.utils import parsedate_to_datetime
                dt = parsedate_to_datetime(date_str)
                replied_at = dt.strftime("%d %b %Y, %I:%M %p")
            except Exception:
                replied_at = date_str

            all_emails = list(set(re.findall(
                r"[\w.\-+]+@[\w.\-]+\.\w+",
                raw_bytes.decode("utf-8", errors="replace").lower()
            )))
            all_emails = [e for e in all_emails if e != sender_email.lower()]

            replies.append({
                "from_email":       from_email,
                "from_name":        from_addr.split("<")[0].strip().strip('"'),
                "subject":          subject,
                "body":             body[:2000],
                "reply_type":       reply_type,
                "replied_at":       replied_at,
                "candidate_emails": all_emails,
            })

    except Exception as e:
        print("IMAP ERROR:", e)
        # On failure return the last good cache so the UI doesn't break
        return _reply_cache

    finally:
        # Always close the connection — prevents lingering open sessions
        if mail:
            try:
                mail.logout()
            except Exception:
                pass

    # Deduplicate by from_email — keep latest
    seen = {}
    for r in reversed(replies):
        if r["from_email"] not in seen:
            seen[r["from_email"]] = r

    _reply_cache = list(seen.values())
    _cache_ts    = time.time()
    return _reply_cache


# =========================================
# MODELS
# =========================================
class SendReplyRequest(BaseModel):
    to_email: str
    to_name:  Optional[str] = ""
    subject:  str
    body:     str


# =========================================
# ROUTES
# =========================================
from fastapi import Header

@router.get("/email-replies")
def get_email_replies(x_user_email: str = Header(None)):
    try:
        replies = fetch_replies_from_inbox(user_email=x_user_email.strip().lower() if x_user_email else None)
        return {"success": True, "replies": replies, "total": len(replies)}
    except Exception as e:
        return {"success": False, "error": str(e), "replies": []}


@router.post("/email-replies/send")
def send_reply(data: SendReplyRequest, x_user_email: str = Header(None)):
    try:
        settings        = load_settings(x_user_email.strip().lower() if x_user_email else None)
        sender_email    = settings["email"]
        sender_password = settings["password"]

        msg = MIMEMultipart("alternative")
        msg["Subject"] = data.subject
        msg["From"]    = sender_email
        msg["To"]      = data.to_email

        part = MIMEText(data.body, "plain")
        msg.attach(part)

        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(sender_email, sender_password)
        server.sendmail(sender_email, data.to_email, msg.as_string())
        server.quit()

        return {"success": True, "message": f"Reply sent to {data.to_email}"}
    except Exception as e:
        print("SEND REPLY ERROR:", e)
        return {"success": False, "error": str(e)}


@router.post("/email-replies/refresh")
def refresh_replies(x_user_email: str = Header(None)):
    """Force a fresh IMAP fetch, bypassing the cache."""
    try:
        replies = fetch_replies_from_inbox(force=True, user_email=x_user_email.strip().lower() if x_user_email else None)
        return {"success": True, "replies": replies, "total": len(replies)}
    except Exception as e:
        return {"success": False, "error": str(e), "replies": []}