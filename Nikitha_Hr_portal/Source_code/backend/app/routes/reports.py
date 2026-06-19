from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional, List
import json
from app.database.db import get_connection

router = APIRouter()

class FunnelStatsRequest(BaseModel):
    job_id: str
    job_role: str
    total_uploaded: Optional[int] = None
    google_form_sent: Optional[int] = None
    google_form_filled: Optional[int] = None

@router.post("/reports/funnel-stats")
def update_funnel_stats(req: FunnelStatsRequest):
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # Check if row exists for this job_id
        cursor.execute("SELECT id, total_uploaded, google_form_sent, google_form_filled FROM recruitment_funnel_stats WHERE job_id = %s", (req.job_id,))
        row = cursor.fetchone()

        if row:
            # Update fields that are provided
            updates = []
            params = []
            if req.total_uploaded is not None:
                updates.append("total_uploaded = total_uploaded + %s")
                params.append(req.total_uploaded)
            if req.google_form_sent is not None:
                updates.append("google_form_sent = google_form_sent + %s")
                params.append(req.google_form_sent)
            if req.google_form_filled is not None:
                updates.append("google_form_filled = %s")
                params.append(req.google_form_filled)
            
            if updates:
                params.append(req.job_id)
                query = f"UPDATE recruitment_funnel_stats SET {', '.join(updates)} WHERE job_id = %s"
                cursor.execute(query, tuple(params))
        else:
            # Insert new row
            total_up = req.total_uploaded if req.total_uploaded is not None else 0
            gf_sent = req.google_form_sent if req.google_form_sent is not None else 0
            gf_filled = req.google_form_filled if req.google_form_filled is not None else 0
            
            cursor.execute("""
                INSERT INTO recruitment_funnel_stats (job_id, job_role, total_uploaded, google_form_sent, google_form_filled)
                VALUES (%s, %s, %s, %s, %s)
            """, (req.job_id, req.job_role, total_up, gf_sent, gf_filled))

        conn.commit()
        cursor.close()
        conn.close()
        return {"success": True, "message": "Funnel stats updated"}
    except Exception as e:
        print("UPDATE FUNNEL STATS ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reports")
def get_reports(start_date: Optional[str] = None, end_date: Optional[str] = None):
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # Build SQL queries
        funnel_query = """
            SELECT 
                job_id, 
                job_role, 
                total_uploaded, 
                google_form_sent, 
                google_form_filled,
                created_at
            FROM recruitment_funnel_stats
        """
        hired_query = """
            SELECT 
                id, 
                name, 
                email, 
                job_role, 
                created_at
            FROM candidate_history
        """
        rejected_query = """
            SELECT 
                id, 
                name, 
                email, 
                job_role, 
                rejected_round,
                created_at
            FROM rejected_history
        """

        params = []
        if start_date and end_date:
            date_filter = " WHERE DATE(created_at) BETWEEN %s AND %s "
            funnel_query += date_filter
            hired_query += date_filter
            rejected_query += date_filter
            # Standard params list: since we execute 3 queries, we will reuse params for each
            params = [start_date, end_date]

        funnel_query += " ORDER BY created_at DESC"
        hired_query += " ORDER BY created_at DESC"
        rejected_query += " ORDER BY created_at DESC"

        if params:
            cursor.execute(funnel_query, tuple(params))
            funnel_rows = cursor.fetchall()
            
            cursor.execute(hired_query, tuple(params))
            hired_rows = cursor.fetchall()
            
            cursor.execute(rejected_query, tuple(params))
            rejected_rows = cursor.fetchall()
        else:
            cursor.execute(funnel_query)
            funnel_rows = cursor.fetchall()
            
            cursor.execute(hired_query)
            hired_rows = cursor.fetchall()
            
            cursor.execute(rejected_query)
            rejected_rows = cursor.fetchall()

        cursor.close()
        conn.close()

        # Group by job role
        reports_map = {}

        def get_report_entry(role_name: str):
            clean_role = role_name.strip().lower()
            if clean_role not in reports_map:
                reports_map[clean_role] = {
                    "job_role": role_name.strip(),
                    "total_uploaded": 0,
                    "google_form_sent": 0,
                    "google_form_filled": 0,
                    "hired_count": 0,
                    "rejected_count": 0,
                    "rejections_by_round": {
                        "telephonic": 0,
                        "telephonic_tech": 0,
                        "f2f_schedule": 0,
                        "f2f": 0,
                        "final_interview": 0,
                        "negotiation": 0
                    }
                }
            return reports_map[clean_role]

        # Process funnel stats
        for f in funnel_rows:
            role = f["job_role"] or "Unknown Domain"
            entry = get_report_entry(role)
            entry["total_uploaded"] += f["total_uploaded"] or 0
            entry["google_form_sent"] += f["google_form_sent"] or 0
            entry["google_form_filled"] += f["google_form_filled"] or 0

        # Process hired candidates
        for h in hired_rows:
            role = h["job_role"] or "Unknown Domain"
            entry = get_report_entry(role)
            entry["hired_count"] += 1

        # Normalized mapping of stage titles from DB
        STAGE_MAPPING = {
            "telephonic": "telephonic",
            "telephonic technical": "telephonic_tech",
            "telephonic technical ": "telephonic_tech",
            "schedule f2f": "f2f_schedule",
            "face to face": "f2f",
            "final interview": "final_interview",
            "negotion and offer letter": "negotiation",
            " negotion and offer letter": "negotiation",
        }

        # Process rejected candidates
        for r in rejected_rows:
            role = r["job_role"] or "Unknown Domain"
            entry = get_report_entry(role)
            entry["rejected_count"] += 1
            
            raw_round = (r["rejected_round"] or "").strip().lower()
            mapped_round = STAGE_MAPPING.get(raw_round)
            if mapped_round:
                entry["rejections_by_round"][mapped_round] += 1
            else:
                if "tech" in raw_round:
                    entry["rejections_by_round"]["telephonic_tech"] += 1
                elif "face" in raw_round or "f2f" in raw_round:
                    entry["rejections_by_round"]["f2f"] += 1
                elif "negotiat" in raw_round or "offer" in raw_round:
                    entry["rejections_by_round"]["negotiation"] += 1
                elif "final" in raw_round:
                    entry["rejections_by_round"]["final_interview"] += 1
                else:
                    entry["rejections_by_round"]["telephonic"] += 1

        result_reports = []
        for clean_role, entry in reports_map.items():
            rejections = entry["rejections_by_round"]
            hired = entry["hired_count"]
            
            # Cumulative calculations
            stages_data = {}
            
            # 1. Negotiation
            neg_rej = rejections["negotiation"]
            neg_passed = hired
            neg_started = neg_passed + neg_rej
            stages_data["negotiation"] = {
                "started": neg_started,
                "passed": neg_passed,
                "rejected": neg_rej
            }
            
            # 2. Final Interview
            fi_rej = rejections["final_interview"]
            fi_passed = neg_started
            fi_started = fi_passed + fi_rej
            stages_data["final_interview"] = {
                "started": fi_started,
                "passed": fi_passed,
                "rejected": fi_rej
            }
            
            # 3. Face to Face
            f2f_rej = rejections["f2f"]
            f2f_passed = fi_started
            f2f_started = f2f_passed + f2f_rej
            stages_data["f2f"] = {
                "started": f2f_started,
                "passed": f2f_passed,
                "rejected": f2f_rej
            }
            
            # 4. Schedule F2F
            f2fs_rej = rejections["f2f_schedule"]
            f2fs_passed = f2f_started
            f2fs_started = f2fs_passed + f2fs_rej
            stages_data["f2f_schedule"] = {
                "started": f2fs_started,
                "passed": f2fs_passed,
                "rejected": f2fs_rej
            }
            
            # 5. Telephonic Tech
            tt_rej = rejections["telephonic_tech"]
            tt_passed = f2fs_started
            tt_started = tt_passed + tt_rej
            stages_data["telephonic_tech"] = {
                "started": tt_started,
                "passed": tt_passed,
                "rejected": tt_rej
            }
            
            # 6. Telephonic
            tel_rej = rejections["telephonic"]
            tel_passed = tt_started
            tel_started = tel_passed + tel_rej
            stages_data["telephonic"] = {
                "started": tel_started,
                "passed": tel_passed,
                "rejected": tel_rej
            }

            if entry["total_uploaded"] == 0:
                entry["total_uploaded"] = tel_started
                entry["google_form_sent"] = tel_started
                entry["google_form_filled"] = tel_started

            entry["stages"] = stages_data
            result_reports.append(entry)

        result_reports.sort(key=lambda x: x["job_role"])

        return {"reports": result_reports}
    except Exception as e:
        print("GET REPORTS ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reports/candidates")
def get_reports_candidates(start_date: Optional[str] = None, end_date: Optional[str] = None):
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        hired_query = "SELECT name, email, job_role, form_data, created_at FROM candidate_history"
        rejected_query = "SELECT name, email, job_role, rejected_round, form_data, created_at FROM rejected_history"
        
        params = []
        if start_date and end_date:
            date_filter = " WHERE DATE(created_at) BETWEEN %s AND %s"
            hired_query += date_filter
            rejected_query += date_filter
            params = [start_date, end_date]

        hired_query += " ORDER BY created_at DESC"
        rejected_query += " ORDER BY created_at DESC"

        if params:
            cursor.execute(hired_query, tuple(params))
            hired_rows = cursor.fetchall()
            cursor.execute(rejected_query, tuple(params))
            rejected_rows = cursor.fetchall()
        else:
            cursor.execute(hired_query)
            hired_rows = cursor.fetchall()
            cursor.execute(rejected_query)
            rejected_rows = cursor.fetchall()

        cursor.close()
        conn.close()

        candidates = []
        # Process hired
        for row in hired_rows:
            form_data = {}
            if row["form_data"]:
                try:
                    form_data = json.loads(row["form_data"])
                except Exception:
                    pass
            
            google_form = form_data.get("google_form", {})
            ats_score = google_form.get("ats_score", google_form.get("score", 0))
            matched_skills = google_form.get("matched_skills", [])
            
            candidates.append({
                "name": row["name"],
                "email": row["email"],
                "job_role": row["job_role"],
                "score": ats_score,
                "status": "selected",
                "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                "matched_skills": matched_skills
            })

        # Process rejected
        for row in rejected_rows:
            form_data = {}
            if row["form_data"]:
                try:
                    form_data = json.loads(row["form_data"])
                except Exception:
                    pass
            
            google_form = form_data.get("google_form", {})
            ats_score = google_form.get("ats_score", google_form.get("score", 0))
            matched_skills = google_form.get("matched_skills", [])

            candidates.append({
                "name": row["name"],
                "email": row["email"],
                "job_role": row["job_role"],
                "score": ats_score,
                "status": "rejected",
                "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                "matched_skills": matched_skills
            })

        return {"candidates": candidates}
    except Exception as e:
        print("GET REPORTS CANDIDATES ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))


class ReportAnalysisRequest(BaseModel):
    job_role: str
    total_uploaded: int
    shortlisted: int
    hired_count: int
    rejected_count: int
    shortlist_ratio: float
    avg_ats_score: float
    highest_ats_score: float
    google_form_sent: int
    google_form_filled: int
    google_form_response_rate: float
    stages: dict
    top_skills: List[str]
    missing_skills: List[str]


@router.post("/reports/analyze")
async def analyze_report_metrics(req: ReportAnalysisRequest, x_user_email: str = Header(None)):
    try:
        from app.services.ai_resume import get_gemini_client
        from google import genai
        
        # Build prompt
        prompt = f"""
You are a senior recruitment consultant and HR analyst at Nikitha Build-Tech Private Limited.
Analyze the following recruitment metrics for the job role: '{req.job_role}'.
NIKITHA BUILD-TECH is a construction & pre-engineered buildings (PEB) company, so focus on industry-appropriate hiring insights and candidates' domain qualifications.

RECRUITMENT FUNNEL METRICS:
- Job Role: {req.job_role}
- Total Uploaded/Screened: {req.total_uploaded}
- Shortlisted: {req.shortlisted}
- Selected/Hired: {req.hired_count}
- Rejected: {req.rejected_count}
- Shortlist Ratio: {req.shortlist_ratio}%
- Average ATS Score: {req.avg_ats_score}%
- Highest ATS Score: {req.highest_ats_score}%
- Google Form Sent: {req.google_form_sent}
- Google Form Filled: {req.google_form_filled}
- Google Form Response Rate: {req.google_form_response_rate}%
- Drop-offs by stage (started vs passed): {json.dumps(req.stages)}
- Top Skills Found: {json.dumps(req.top_skills)}
- Top Missing Skills: {json.dumps(req.missing_skills)}

Based on this data, provide:
1. AI Insights Summary: 4 concise, data-driven observations. Mention key metrics (shortlist ratio, ATS scores, response rates, drop-offs).
2. Actionable Recommendations: 4 specific, actionable strategies to improve recruitment speed, candidate quality, or process conversion.

Return ONLY a valid JSON object matching this schema:
{{
    "insights": [
        "Insight 1 (e.g., Analyzed 4 candidates with a shortlist ratio of 75.0%.)",
        "Insight 2",
        "Insight 3",
        "Insight 4"
    ],
    "recommendations": [
        "Recommendation 1 (e.g., Increase sourcing efforts for...)",
        "Recommendation 2",
        "Recommendation 3",
        "Recommendation 4"
    ]
}}
"""
        
        req_client = get_gemini_client(x_user_email)
        if req_client is None:
            return get_local_report_fallback(req)
            
        try:
            class ReportAnalysisSchema(BaseModel):
                insights: List[str]
                recommendations: List[str]

            response = await req_client.aio.models.generate_content(

                model="gemini-2.0-flash",
                contents=prompt,
                config=genai.types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=ReportAnalysisSchema,
                ),
            )
            data = json.loads(response.text)
            return data
        except Exception as e:
            print("GEMINI REPORT ANALYSIS ERROR:", e)
            return get_local_report_fallback(req)

    except Exception as e:
        print("REPORT ANALYSIS SERVICE ERROR:", e)
        return get_local_report_fallback(req)


def get_local_report_fallback(req: ReportAnalysisRequest):
    insights = [
        f"Analyzed {req.total_uploaded} candidates for the {req.job_role} role with a shortlist ratio of {req.shortlist_ratio}%.",
        f"The average ATS score registered at {req.avg_ats_score}% for the current recruitment period.",
        f"Google Form engagement rate stands at {req.google_form_response_rate}% ({req.google_form_filled}/{req.google_form_sent} forms filled).",
    ]
    
    # Try to find a drop-off stage
    high_dropoff_stage = "Interview"
    max_rej = 0
    for stage, details in req.stages.items():
        rej = details.get("rejected", 0)
        if rej > max_rej:
            max_rej = rej
            high_dropoff_stage = stage.replace("_", " ").title()
            
    if max_rej > 0:
        insights.append(f"Stage-wise drop-off is highest during the '{high_dropoff_stage}' phase with {max_rej} rejections.")
    else:
        insights.append("Candidate volume remained stable across current interview rounds without major drop-offs.")
        
    recommendations = [
        f"Increase sourcing channels targeting candidate profiles matching the '{req.job_role}' domain requirements.",
        f"Optimize the initial screening ATS score threshold to filter out low-matching resumes early."
    ]
    
    if req.google_form_response_rate < 70:
        recommendations.append("Send automated reminders or follow-ups to candidates to improve Google Form response rate.")
    else:
        recommendations.append("Maintain the current Google Form onboarding workflow as engagement is high.")
        
    if req.missing_skills:
        skills_str = ", ".join(req.missing_skills[:3])
        recommendations.append(f"Target candidates with missing domain expertise in: {skills_str}.")
    else:
        recommendations.append("Ensure secondary technical skills are verified during subsequent screening rounds.")
        
    return {
        "insights": insights[:4],
        "recommendations": recommendations[:4]
    }