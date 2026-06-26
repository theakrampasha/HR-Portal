import os
import shutil
import json
import sys

# Add the current directory to python path to resolve 'app' imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.db import get_connection

def clear_database():
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Disable foreign key checks if any, though there shouldn't be
        cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")
        
        tables = ["candidate_history", "rejected_history", "recruitment_funnel_stats"]
        for table in tables:
            print(f"Truncating table: {table}")
            try:
                cursor.execute(f"TRUNCATE TABLE {table};")
            except Exception as ex:
                print(f"Failed to truncate {table}: {ex}")
            
        cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")
        conn.commit()
        cursor.close()
        conn.close()
        print("Database tables cleared successfully!")
    except Exception as e:
        print("Error clearing database:", e)

def clear_uploads():
    uploads_dir = "uploads"
    if os.path.exists(uploads_dir):
        for filename in os.listdir(uploads_dir):
            file_path = os.path.join(uploads_dir, filename)
            try:
                if os.path.isfile(file_path) or os.path.islink(file_path):
                    os.unlink(file_path)
                    print(f"Deleted file: {file_path}")
                elif os.path.isdir(file_path):
                    shutil.rmtree(file_path)
                    print(f"Deleted directory: {file_path}")
            except Exception as e:
                print(f"Failed to delete {file_path}. Reason: {e}")
    else:
        print("Uploads directory does not exist.")

def clear_sent_emails():
    sent_emails_file = "sent_emails.json"
    if os.path.exists(sent_emails_file):
        try:
            with open(sent_emails_file, "w") as f:
                json.dump({"emails": [], "candidates": []}, f, indent=4)
            print("Cleared sent_emails.json")
        except Exception as e:
            print("Error resetting sent_emails.json:", e)

if __name__ == "__main__":
    print("Starting application data reset...")
    clear_database()
    clear_uploads()
    clear_sent_emails()
    print("Reset completed.")
