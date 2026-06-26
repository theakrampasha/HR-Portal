import os
import sys
import json
from datetime import datetime, timedelta

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.db import get_connection

def seed_only_two():
    try:
        conn = get_connection()
        cursor = conn.cursor()
        print("Connected to database successfully.")

        # Clear existing data
        print("Clearing database tables...")
        cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")
        cursor.execute("TRUNCATE TABLE candidate_history;")
        cursor.execute("TRUNCATE TABLE rejected_history;")
        cursor.execute("TRUNCATE TABLE recruitment_funnel_stats;")
        cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")
        conn.commit()

        now = datetime.now()

        # 1. Seed Civil Engineer
        civil_job_id = "job_demo_1"
        civil_role = "Civil Engineer"
        civil_name = "Arjun Sharma"
        civil_email = "arjun.sharma@demo.com"
        civil_score = 85
        civil_created_at = now - timedelta(days=20)
        civil_form_data = {
            "google_form": {
                "ats_score": civil_score,
                "score": civil_score,
                "matched_skills": ["AutoCAD", "STAAD Pro", "Project Estimation", "Steel Structures"],
                "missing_skills": ["Revit Structure", "BIM Modeling"]
            }
        }

        # Insert Funnel Stats for Civil
        cursor.execute("""
            INSERT INTO recruitment_funnel_stats (job_id, job_role, total_uploaded, google_form_sent, google_form_filled, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (civil_job_id, civil_role, 1, 1, 1, civil_created_at))

        # Insert Candidate History for Civil (Status Selected/Hired)
        cursor.execute("""
            INSERT INTO candidate_history (name, email, job_role, job_type, salary, joining_date, form_data, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (civil_name, civil_email, civil_role, "Full-time", "12 LPA", (now + timedelta(days=30)).strftime("%Y-%m-%d"), json.dumps(civil_form_data), civil_created_at))

        # 2. Seed Mechanical Engineer
        mech_job_id = "job_demo_2"
        mech_role = "Mechanical Engineer"
        mech_name = "Rohan Patel"
        mech_email = "rohan.patel@demo.com"
        mech_score = 78
        mech_created_at = now - timedelta(days=15)
        mech_form_data = {
            "google_form": {
                "ats_score": mech_score,
                "score": mech_score,
                "matched_skills": ["SolidWorks", "GD&T", "DFM/DFA"],
                "missing_skills": ["ANSYS FEA", "HVAC Design"]
            }
        }

        # Insert Funnel Stats for Mechanical
        cursor.execute("""
            INSERT INTO recruitment_funnel_stats (job_id, job_role, total_uploaded, google_form_sent, google_form_filled, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (mech_job_id, mech_role, 1, 1, 1, mech_created_at))

        # Insert Candidate History for Mechanical (Status Selected/Hired)
        cursor.execute("""
            INSERT INTO candidate_history (name, email, job_role, job_type, salary, joining_date, form_data, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (mech_name, mech_email, mech_role, "Full-time", "10 LPA", (now + timedelta(days=30)).strftime("%Y-%m-%d"), json.dumps(mech_form_data), mech_created_at))

        conn.commit()
        cursor.close()
        conn.close()
        print("Successfully seeded exactly 2 candidates (Civil Engineer and Mechanical Engineer)!")
    except Exception as e:
        print("Seeding Error:", e)

if __name__ == "__main__":
    seed_only_two()
