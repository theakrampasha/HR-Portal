from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.database.db import get_connection

router = APIRouter()

class LoginRequest(BaseModel):
    gmail: Optional[str] = None
    email: Optional[str] = None
    password: str

class SignUpRequest(BaseModel):
    name: str
    email: str
    password: str

@router.post("/login")
def login(payload: LoginRequest):
    email_val = payload.gmail or payload.email
    if not email_val:
        raise HTTPException(status_code=400, detail="Email is required")
    
    email_val = email_val.strip().lower()
    
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True, buffered=True)
        
        # Check against users table columns Name, Email, password
        cursor.execute(
            "SELECT Name, Email, password FROM users WHERE LOWER(TRIM(Email)) = %s",
            (email_val,)
        )
        user = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Plain text password comparison (as requested)
        if user["password"] != payload.password:
            raise HTTPException(status_code=401, detail="Invalid email or password")
            
        return {
            "success": True,
            "token": "session_token_hr_portal_secure",
            "username": user["Name"],
            "gmail": user["Email"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print("LOGIN ERROR:", e)
        raise HTTPException(status_code=500, detail=f"Database error during login: {str(e)}")

@router.post("/signup")
def signup(payload: SignUpRequest):
    if not payload.name or not payload.email or not payload.password:
        raise HTTPException(status_code=400, detail="All fields are required")
    
    email_val = payload.email.strip().lower()
    
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True, buffered=True)
        
        # Check if email already exists
        cursor.execute(
            "SELECT Email FROM users WHERE LOWER(TRIM(Email)) = %s",
            (email_val,)
        )
        existing_user = cursor.fetchone()
        
        if existing_user:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=400, detail="Account with this email already exists")
        
        # Insert new user
        cursor.execute(
            "INSERT INTO users (Name, Email, password) VALUES (%s, %s, %s)",
            (payload.name.strip(), email_val, payload.password)
        )
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return {
            "success": True,
            "message": "Account created successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print("SIGNUP ERROR:", e)
        raise HTTPException(status_code=500, detail=f"Database error during signup: {str(e)}")
