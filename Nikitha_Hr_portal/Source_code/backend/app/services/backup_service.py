import os
import subprocess
from datetime import datetime

def backup_database():
    """Backup MySQL database"""
    backup_dir = "backups/"
    os.makedirs(backup_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = f"{backup_dir}/hr_ai_db_{timestamp}.sql"
    
    MYSQL_PATH = "C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqldump.exe"
    DB_NAME = "hr_ai_db"
    DB_USER = "root"
    DB_PASSWORD = "m@niharini2529"
    
    print(f"🔄 Starting backup...")
    
    result = subprocess.run([
    MYSQL_PATH,
    f"-u{DB_USER}",
    f"-p{DB_PASSWORD}",
    DB_NAME,
    f"--result-file={backup_file}"
], capture_output=True, text=True)

    print("Return code:", result.returncode)
    print("STDOUT:", result.stdout)
    print("STDERR:", result.stderr)
    
    if result.returncode == 0:
        print(f"✅ Backup created: {backup_file}")
        return backup_file
    else:
        print(f"❌ Failed: {result.stderr}")
        return None

if __name__ == "__main__":
    backup_database()