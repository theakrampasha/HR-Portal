import os
import sys
import json
import random
from datetime import datetime, timedelta

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.db import get_connection

def seed():
    # Roles to seed
    roles = [
        "Civil Engineer", "Mechanical Engineer", "Site Engineer", "PPC Engineer", "Sales", "Marketing",
        "Software Engineer", "AI/ML Engineer", "Test Engineer", "Full Stack Developer", "Android App Developer", "iOS App Developer"
    ]
    
    # Skills for each role
    role_skills = {
        "Civil Engineer": {
            "all": ["AutoCAD", "STAAD Pro", "Revit Structure", "Etabs", "Project Estimation", "Site Surveying", "Concrete Design", "Steel Structures", "BIM Modeling"],
            "matched": ["AutoCAD", "STAAD Pro", "Project Estimation", "Steel Structures"],
            "missing": ["Revit Structure", "BIM Modeling"]
        },
        "Mechanical Engineer": {
            "all": ["SolidWorks", "ANSYS FEA", "GD&T", "Thermodynamics", "HVAC Design", "CNC Programming", "Fluid Mechanics", "DFM/DFA", "Product Development"],
            "matched": ["SolidWorks", "GD&T", "DFM/DFA"],
            "missing": ["ANSYS FEA", "HVAC Design"]
        },
        "Site Engineer": {
            "all": ["Site Supervision", "Project Execution", "Safety Audits", "Quality Control", "Vendor Coordination", "Billing & Estimation", "Surveying", "Concrete Pouring"],
            "matched": ["Site Supervision", "Project Execution", "Quality Control"],
            "missing": ["Safety Audits", "Billing & Estimation"]
        },
        "PPC Engineer": {
            "all": ["Production Planning", "Inventory Management", "Supply Chain", "ERP Systems", "Quality Assurance", "Lean Manufacturing", "Data Analysis", "Logistics", "Process Improvement"],
            "matched": ["Production Planning", "Inventory Management", "ERP Systems"],
            "missing": ["Lean Manufacturing", "Logistics"]
        },
        "Sales": {
            "all": ["B2B Sales", "Lead Generation", "CRM Software", "Negotiation", "Cold Calling", "Client Relationship", "Market Research", "Sales Pitching", "Account Management"],
            "matched": ["B2B Sales", "Lead Generation", "Negotiation"],
            "missing": ["CRM Software", "Market Research"]
        },
        "Marketing": {
            "all": ["Digital Marketing", "SEO/SEM", "Content Strategy", "Social Media", "Brand Management", "Google Analytics", "Email Marketing", "Copywriting", "Campaign Management"],
            "matched": ["Digital Marketing", "Content Strategy", "Social Media"],
            "missing": ["SEO/SEM", "Google Analytics"]
        },
        "Software Engineer": {
            "all": ["Java", "Python", "Data Structures", "Algorithms", "System Design", "Git", "Agile", "Microservices", "Docker"],
            "matched": ["Java", "Python", "Data Structures"],
            "missing": ["System Design", "Microservices"]
        },
        "AI/ML Engineer": {
            "all": ["Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", "NLP", "Computer Vision", "Data Science", "Python", "SQL"],
            "matched": ["Machine Learning", "Python", "TensorFlow"],
            "missing": ["NLP", "PyTorch"]
        },
        "Test Engineer": {
            "all": ["Manual Testing", "Automation Testing", "Selenium", "JUnit", "TestNG", "JIRA", "API Testing", "Postman", "CI/CD"],
            "matched": ["Manual Testing", "Selenium", "JIRA"],
            "missing": ["API Testing", "CI/CD"]
        },
        "Full Stack Developer": {
            "all": ["React", "Node.js", "Express", "MongoDB", "JavaScript", "TypeScript", "HTML/CSS", "Redux", "REST APIs"],
            "matched": ["React", "Node.js", "JavaScript"],
            "missing": ["TypeScript", "MongoDB"]
        },
        "Android App Developer": {
            "all": ["Kotlin", "Java", "Android Studio", "Firebase", "SQLite", "REST APIs", "MVVM", "Jetpack Compose", "Coroutines"],
            "matched": ["Kotlin", "Android Studio", "MVVM"],
            "missing": ["Jetpack Compose", "Firebase"]
        },
        "iOS App Developer": {
            "all": ["Swift", "Objective-C", "Xcode", "iOS SDK", "Core Data", "UIKit", "SwiftUI", "Combine", "REST APIs"],
            "matched": ["Swift", "Xcode", "UIKit"],
            "missing": ["SwiftUI", "Core Data"]
        }
    }

    # Dummy Names
    names = [
        "Aarav Sharma", "Aditya Patel", "Vihaan Verma", "Rohan Iyer", "Karan Malhotra",
        "Ananya Rao", "Diya Sen", "Ishaan Nair", "Kabir Gupta", "Meera Joshi",
        "Rahul Reddy", "Priya Choudhury", "Sanjay Kumar", "Sneha Nair", "Amit Mishra",
        "Nikita Deshmukh", "Vikram Rathore", "Divya Pillai", "Arjun Saxena", "Pooja Hegde",
        "Rishi Prasad", "Kriti Sanon", "Varun Dhawan", "Neha Kakkar", "Siddharth Malhotra",
        "Shraddha Kapoor", "Ayushmann Khurrana", "Rajkummar Rao", "Taapsee Pannu", "Vicky Kaushal"
    ]

    try:
        conn = get_connection()
        cursor = conn.cursor()
        print("Connected to database successfully.")

        # Clear existing seeded data if user wants to start fresh
        print("Clearing database tables...")
        cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")
        cursor.execute("TRUNCATE TABLE candidate_history;")
        cursor.execute("TRUNCATE TABLE rejected_history;")
        cursor.execute("TRUNCATE TABLE recruitment_funnel_stats;")
        cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")
        conn.commit()

        now = datetime.now()

        for idx, role in enumerate(roles):
            job_id = f"job_demo_{idx + 1}"
            skills = role_skills[role]
            
            # Funnel stats
            total_uploaded = 3
            google_form_sent = 3
            google_form_filled = 3
            
            # Insert funnel stats
            cursor.execute("""
                INSERT INTO recruitment_funnel_stats (job_id, job_role, total_uploaded, google_form_sent, google_form_filled, created_at)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (job_id, role, total_uploaded, google_form_sent, google_form_filled, now - timedelta(days=28)))

            # Hired candidates (2 resumes)
            hired_count = 2
            for h in range(hired_count):
                name = random.choice(names) + f" ({role} Hired {h+1})"
                email = f"{name.lower().replace(' ', '.')}@demo.com"
                ats_score = random.randint(75, 95)
                days_ago = random.randint(2, 20)
                created_at = now - timedelta(days=days_ago)
                
                form_data = {
                    "google_form": {
                        "ats_score": ats_score,
                        "score": ats_score,
                        "matched_skills": random.sample(skills["all"], k=random.randint(4, 7)),
                        "missing_skills": random.sample(skills["all"], k=random.randint(0, 2))
                    }
                }
                
                cursor.execute("""
                    INSERT INTO candidate_history (name, email, job_role, job_type, salary, joining_date, form_data, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (name, email, role, "Full-time", f"{random.randint(6, 15)} LPA", (now + timedelta(days=30)).strftime("%Y-%m-%d"), json.dumps(form_data), created_at))
            
            # Rejected candidates (1 resume)
            round_name = "telephonic technical"
            name = random.choice(names) + f" ({role} Rej Tech)"
            email = f"{name.lower().replace(' ', '.')}@demo.com"
            ats_score = random.randint(45, 68)
            days_ago = random.randint(3, 25)
            created_at = now - timedelta(days=days_ago)
            
            form_data = {
                "google_form": {
                    "ats_score": ats_score,
                    "score": ats_score,
                    "matched_skills": random.sample(skills["all"], k=random.randint(2, 4)),
                    "missing_skills": random.sample(skills["all"], k=random.randint(3, 5))
                }
            }
            
            cursor.execute("""
                INSERT INTO rejected_history (name, email, job_role, rejected_round, form_data, created_at)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (name, email, role, round_name, json.dumps(form_data), created_at))

        conn.commit()
        cursor.close()
        conn.close()
        print("Successfully seeded all dummy data!")
    except Exception as e:
        print("Seeding Error:", e)

if __name__ == "__main__":
    seed()
