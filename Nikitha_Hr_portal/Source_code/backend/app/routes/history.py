from fastapi import APIRouter, HTTPException
from app.database.db import get_connection

router = APIRouter()


def _field(data: dict, *keys, default=""):
    for key in keys:
        val = data.get(key)
        if val is not None and str(val).strip():
            return val
    return default


def _history_key(email: str, name: str) -> str:
    email = (email or "").strip().lower()
    if email:
        return f"email:{email}"
    return f"name:{(name or '').strip().lower()}"


def save_candidate_to_history(data: dict) -> None:
    """Insert or update one hired candidate (one row per email)."""
    name = _field(data, "name")
    email = _field(data, "email")
    job_role = _field(data, "job_role", "jobRole")
    job_type = _field(data, "job_type", "roleType", "job_type")
    salary = _field(data, "salary")
    joining_date = _field(data, "joining_date", "joiningDate")
    form_data = data.get("form_data") or data.get("formData")
    if isinstance(form_data, (list, dict)):
        import json
        form_data = json.dumps(form_data)
    elif form_data is not None:
        form_data = str(form_data)

    conn = get_connection()
    cursor = conn.cursor()

    if email:
        cursor.execute(
            "SELECT id FROM candidate_history WHERE LOWER(TRIM(email)) = LOWER(TRIM(%s))",
            (email,),
        )
        row = cursor.fetchone()
        if row:
            cursor.execute("""
                UPDATE candidate_history
                SET name = %s, job_role = %s, job_type = %s, salary = %s, joining_date = %s, form_data = %s
                WHERE id = %s
            """, (name, job_role, job_type, salary, joining_date, form_data, row[0]))
            conn.commit()
            cursor.close()
            conn.close()
            return

    cursor.execute("""
        INSERT INTO candidate_history
        (name, email, job_role, job_type, salary, joining_date, form_data)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """, (name, email, job_role, job_type, salary, joining_date, form_data))
    conn.commit()
    cursor.close()
    conn.close()


def _remove_duplicate_rows(cursor, rows: list) -> list:
    """Keep newest row per email; delete older duplicates from DB."""
    seen = {}
    unique = []
    duplicate_ids = []

    for row in rows:
        key = _history_key(row.get("email"), row.get("name"))
        if key in seen:
            duplicate_ids.append(row["id"])
        else:
            seen[key] = True
            unique.append(row)

    for dup_id in duplicate_ids:
        cursor.execute("DELETE FROM candidate_history WHERE id = %s", (dup_id,))

    return unique


# ================= ADD HISTORY =================
@router.post("/history")
def add_history(data: dict):
    try:
        save_candidate_to_history(data)
        return {"message": "Candidate added successfully"}
    except Exception as e:
        print("ADD ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))


# ================= GET HISTORY =================
@router.get("/history")
def get_history():
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                id,
                name,
                email,
                job_role,
                job_type,
                salary,
                joining_date,
                form_data,
                created_at
            FROM candidate_history
            ORDER BY id DESC
        """)

        data = cursor.fetchall()
        unique = _remove_duplicate_rows(cursor, data)
        if len(unique) < len(data):
            conn.commit()

        cursor.close()
        conn.close()

        return {"candidates": unique}

    except Exception as e:
        print("GET HISTORY ERROR:", e)
        raise HTTPException(status_code=500, detail=f"Failed to fetch history: {e}")


# ================= UPDATE HISTORY =================
@router.put("/history/{id}")
def update_history(id: int, data: dict):
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE candidate_history
            SET
                job_role = %s,
                job_type = %s,
                salary = %s,
                joining_date = %s
            WHERE id = %s
        """, (
            _field(data, "job_role", "jobRole"),
            _field(data, "job_type", "roleType", "job_type"),
            _field(data, "salary"),
            _field(data, "joining_date", "joiningDate"),
            id,
        ))

        conn.commit()

        cursor.close()
        conn.close()

        return {"message": "Updated successfully"}

    except Exception as e:
        print("UPDATE ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))


# ================= DELETE HISTORY =================
@router.delete("/history/{id}")
def delete_history(id: int):
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute(
            "DELETE FROM candidate_history WHERE id = %s",
            (id,),
        )

        conn.commit()

        cursor.close()
        conn.close()

        return {"message": "Deleted successfully"}

    except Exception as e:
        print("DELETE ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))


# ================= GET REJECTED HISTORY =================
def _remove_rejected_duplicate_rows(cursor, rows: list) -> list:
    """Keep newest row per email; delete older duplicates from DB."""
    seen = {}
    unique = []
    duplicate_ids = []

    for row in rows:
        key = _history_key(row.get("email"), row.get("name"))
        if key in seen:
            duplicate_ids.append(row["id"])
        else:
            seen[key] = True
            unique.append(row)

    for dup_id in duplicate_ids:
        cursor.execute("DELETE FROM rejected_history WHERE id = %s", (dup_id,))

    return unique


@router.get("/history/rejected")
def get_rejected_history():
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                id,
                name,
                email,
                job_role,
                rejected_round,
                form_data,
                created_at
            FROM rejected_history
            ORDER BY id DESC
        """)

        data = cursor.fetchall()
        unique = _remove_rejected_duplicate_rows(cursor, data)
        if len(unique) < len(data):
            conn.commit()

        cursor.close()
        conn.close()

        return {"candidates": unique}

    except Exception as e:
        print("GET REJECTED HISTORY ERROR:", e)
        raise HTTPException(status_code=500, detail=f"Failed to fetch rejected history: {e}")


# ================= DELETE REJECTED HISTORY =================
@router.delete("/history/rejected/{id}")
def delete_rejected_history(id: int):
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute(
            "DELETE FROM rejected_history WHERE id = %s",
            (id,),
        )

        conn.commit()

        cursor.close()
        conn.close()

        return {"message": "Deleted successfully from rejected history"}

    except Exception as e:
        print("DELETE REJECTED ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))
