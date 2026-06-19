import os
import mysql.connector
from mysql.connector import Error

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "m@niharini2529")
DB_NAME = os.getenv("DB_NAME", "hr_ai_db")


def get_connection():
    return mysql.connector.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
    )


def _server_connection():
    """Connect without selecting a database (for CREATE DATABASE)."""
    return mysql.connector.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
    )


def init_db():
    """Ensure database and candidate_history table exist."""
    conn = _server_connection()
    cursor = conn.cursor()
    cursor.execute(
        f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}` "
        "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
    )
    cursor.close()
    conn.close()

    conn = get_connection()
    cursor = conn.cursor(buffered=True)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS candidate_history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) DEFAULT '',
            job_role VARCHAR(255) DEFAULT '',
            job_type VARCHAR(100) DEFAULT '',
            salary VARCHAR(100) DEFAULT '',
            joining_date VARCHAR(50) DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    try:
        cursor.execute(
            "ALTER TABLE candidate_history "
            "ADD COLUMN email VARCHAR(255) DEFAULT '' AFTER name"
        )
    except Error as e:
        if e.errno != 1060:
            raise

    try:
        cursor.execute(
            "ALTER TABLE candidate_history "
            "ADD COLUMN form_data LONGTEXT"
        )
    except Error as e:
        if e.errno != 1060:
            raise

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS rejected_history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) DEFAULT '',
            job_role VARCHAR(255) DEFAULT '',
            rejected_round VARCHAR(100) DEFAULT '',
            form_data LONGTEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS recruitment_funnel_stats (
            id INT AUTO_INCREMENT PRIMARY KEY,
            job_id VARCHAR(255) UNIQUE NOT NULL,
            job_role VARCHAR(255) NOT NULL,
            total_uploaded INT DEFAULT 0,
            google_form_sent INT DEFAULT 0,
            google_form_filled INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Ensure users table exists and seed default user
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            Name VARCHAR(255),
            Email VARCHAR(255) UNIQUE,
            password VARCHAR(255)
        )
    """)

    # Ensure user_settings table exists
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_settings (
            email VARCHAR(255) PRIMARY KEY,
            smtp_email VARCHAR(255) DEFAULT '',
            smtp_password VARCHAR(255) DEFAULT '',
            interview_subject VARCHAR(255) DEFAULT 'Interview Scheduled',
            interview_template TEXT,
            reject_subject VARCHAR(255) DEFAULT 'Application Update — Nikitha Build Tech',
            reject_template TEXT,
            google_form_link TEXT,
            google_template_subject VARCHAR(255) DEFAULT 'Candidate Application Form',
            google_template_body TEXT,
            gemini_api_key VARCHAR(255) DEFAULT ''
        )
    """)

    try:
        cursor.execute(
            "ALTER TABLE user_settings "
            "ADD COLUMN gemini_api_key VARCHAR(255) DEFAULT ''"
        )
    except Error as e:
        if e.errno != 1060:  # 1060: Duplicate column name
            raise


    cursor.execute("SELECT COUNT(*) FROM users")
    count = cursor.fetchone()[0]
    if count == 0:
        cursor.execute(
            "INSERT INTO users (Name, Email, password) VALUES (%s, %s, %s)",
            ("Admin", "admin@gmail.com", "admin123")
        )

    conn.commit()
    cursor.close()
    conn.close()

