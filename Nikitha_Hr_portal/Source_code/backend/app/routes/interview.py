from fastapi import APIRouter
from app.routes.candidates import candidates_db
from app.services.mail_service import send_email

router = APIRouter()

@router.post("/schedule")
def schedule(data: dict):
    date = data["date"]

    for c in candidates_db:
        if c["status"] in ["selected", "ai-selected"]:
            send_email(c["email"], f"Interview scheduled on {date}")
        else:
            send_email(c["email"], "Sorry, not selected")

    return {"message": "Emails sent"}