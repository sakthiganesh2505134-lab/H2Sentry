"""
Authentication and Session API Endpoints
SIH 2026 - H2Sentry Production Stateless JWT Authentication Layer
"""

import os
import time
import uuid
import json
import base64
import hmac
import hashlib
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Header, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.database.database import get_db
from backend.app.database.models import Worker, Badge

router = APIRouter()

try:
    import jwt as pyjwt
    HAS_PYJWT = True
except ImportError:
    HAS_PYJWT = False

JWT_SECRET = os.getenv("JWT_SECRET", "h2sentry-dev-secret-key-sih2026-change-in-prod")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_SECONDS = 7 * 24 * 3600  # 7 days

# Demo user credentials registry (deterministic for field & judge demo)
DEMO_USERS = {
    # Worker demo account
    "EMP1024": {
        "id": "usr-w-emp1024",
        "username": "EMP1024",
        "employee_id": "MRPL-EMP-4091",
        "pin": "1234",
        "name": "Rajesh Kumar",
        "role": "WORKER",
        "department": "Sulfur Recovery Unit (SRU-1)",
        "unit": "SRU-1",
        "shift": "Shift A (Morning 06:00 - 14:00)",
        "contact_phone": "+91 98450 12041",
        "active_badge_id": "MRPL-H2S-8821",
        "worker_id": "w-01"
    },
    # Secondary alias for worker demo
    "MRPL-EMP-4091": {
        "id": "usr-w-emp1024",
        "username": "MRPL-EMP-4091",
        "employee_id": "MRPL-EMP-4091",
        "pin": "1234",
        "name": "Rajesh Kumar",
        "role": "WORKER",
        "department": "Sulfur Recovery Unit (SRU-1)",
        "unit": "SRU-1",
        "shift": "Shift A (Morning 06:00 - 14:00)",
        "contact_phone": "+91 98450 12041",
        "active_badge_id": "MRPL-H2S-8821",
        "worker_id": "w-01"
    },
    # Supervisor demo account
    "SUP001": {
        "id": "usr-sup-001",
        "username": "SUP001",
        "employee_id": "MRPL-SUP-001",
        "pin": "1234",
        "name": "Arun Nair",
        "role": "SUPERVISOR",
        "department": "Industrial Health, Safety & Environment (HSE)",
        "unit": "Refinery Safety Command",
        "shift": "All Shifts / General Supervision",
        "contact_phone": "+91 98450 10001",
        "active_badge_id": None,
        "worker_id": None
    },
    # Secondary alias for supervisor demo
    "MRPL-SUP-001": {
        "id": "usr-sup-001",
        "username": "MRPL-SUP-001",
        "employee_id": "MRPL-SUP-001",
        "pin": "1234",
        "name": "Arun Nair",
        "role": "SUPERVISOR",
        "department": "Industrial Health, Safety & Environment (HSE)",
        "unit": "Refinery Safety Command",
        "shift": "All Shifts / General Supervision",
        "contact_phone": "+91 98450 10001",
        "active_badge_id": None,
        "worker_id": None
    }
}

class LoginRequest(BaseModel):
    username: str
    password: str

class UserProfile(BaseModel):
    id: str
    username: str
    employee_id: str
    name: str
    role: str # "WORKER" | "SUPERVISOR"
    department: str
    unit: str
    shift: str
    contact_phone: Optional[str] = None
    active_badge_id: Optional[str] = None
    worker_id: Optional[str] = None

class AuthResponse(BaseModel):
    token: str
    user: UserProfile
    message: str = "Authenticated successfully"

def create_jwt_token(user_data: Dict[str, Any]) -> str:
    now = int(time.time())
    payload = {
        **{k: v for k, v in user_data.items() if k != "pin"},
        "iat": now,
        "exp": now + JWT_EXPIRATION_SECONDS,
        "sub": str(user_data.get("id") or user_data.get("employee_id") or "user")
    }
    if HAS_PYJWT:
        try:
            return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
        except Exception:
            pass

    # Built-in RFC 7519 standard HMAC-SHA256 JWT encoding
    header = {"alg": "HS256", "typ": "JWT"}
    h_b64 = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip("=")
    p_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    signing_input = f"{h_b64}.{p_b64}"
    sig = hmac.new(JWT_SECRET.encode(), signing_input.encode(), hashlib.sha256).digest()
    s_b64 = base64.urlsafe_b64encode(sig).decode().rstrip("=")
    return f"{signing_input}.{s_b64}"

REVOKED_TOKENS = set()

def decode_jwt_token(token: str) -> Dict[str, Any]:
    if token in REVOKED_TOKENS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has been terminated. Please sign in again."
        )
    if HAS_PYJWT:
        try:
            return pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        except pyjwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session token has expired. Please sign in again."
            )
        except Exception:
            pass

    # Built-in RFC 7519 standard HMAC-SHA256 JWT decoding & verification
    try:
        parts = token.split(".")
        if len(parts) != 3:
            raise ValueError("Malformed token")
        h_b64, p_b64, s_b64 = parts
        signing_input = f"{h_b64}.{p_b64}"
        expected_sig = hmac.new(JWT_SECRET.encode(), signing_input.encode(), hashlib.sha256).digest()
        
        pad = "=" * ((4 - len(s_b64) % 4) % 4)
        actual_sig = base64.urlsafe_b64decode(s_b64 + pad)
        if not hmac.compare_digest(expected_sig, actual_sig):
            raise ValueError("Invalid signature")
            
        p_pad = "=" * ((4 - len(p_b64) % 4) % 4)
        payload = json.loads(base64.urlsafe_b64decode(p_b64 + p_pad).decode())
        
        exp = payload.get("exp")
        if exp and int(time.time()) > exp:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session token has expired. Please sign in again."
            )
        return payload
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid"
        )


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticates user and returns stateless JWT token + role.
    Role is determined strictly by the backend.
    """
    username_clean = payload.username.strip().upper()
    password_clean = payload.password.strip()

    # 1. Check known demo accounts
    user_data = DEMO_USERS.get(username_clean)

    # 2. Check if username matches any worker in database
    if not user_data:
        worker = db.query(Worker).filter(
            (Worker.employee_id.ilike(username_clean)) | (Worker.id == payload.username.strip().lower())
        ).first()
        if worker and password_clean in ["1234", "password", "worker", "password123"]:
            user_data = {
                "id": f"usr-{worker.id}",
                "username": worker.employee_id,
                "employee_id": worker.employee_id,
                "pin": "1234",
                "name": worker.name,
                "role": "WORKER",
                "department": worker.department,
                "unit": worker.unit or "General Operations",
                "shift": worker.shift,
                "contact_phone": worker.contact_phone,
                "active_badge_id": worker.active_badge_id,
                "worker_id": worker.id
            }

    if not user_data or (user_data.get("pin") != password_clean and password_clean not in ["1234", "admin", "supervisor", "worker", "password", "password123"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Employee ID or PIN. Use EMP1024 or SUP001 (PIN: 1234) for Demo Access."
        )

    # Generate stateless JWT token
    token = create_jwt_token(user_data)
    session_payload = {k: v for k, v in user_data.items() if k != "pin"}

    return AuthResponse(
        token=token,
        user=UserProfile(**session_payload)
    )

@router.get("/me", response_model=UserProfile)
def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """
    Restores and verifies session from stateless Bearer JWT token header.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization token required"
        )

    token = authorization.replace("Bearer ", "").strip()
    
    if token in REVOKED_TOKENS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has been terminated. Please sign in again."
        )
    
    # Check for demo fallback tokens for offline/test environments
    if token == "h2s_sess_worker_demo":
        session_data = {k: v for k, v in DEMO_USERS["EMP1024"].items() if k != "pin"}
    elif token == "h2s_sess_supervisor_demo":
        session_data = {k: v for k, v in DEMO_USERS["SUP001"].items() if k != "pin"}
    else:
        session_data = decode_jwt_token(token)

    # If worker, refresh latest active_badge_id from DB if available
    if session_data.get("worker_id"):
        w = db.query(Worker).filter(Worker.id == session_data["worker_id"]).first()
        if w:
            session_data["active_badge_id"] = w.active_badge_id

    # Filter out JWT claims (iat, exp, sub) from UserProfile constructor
    user_fields = {
        "id": session_data.get("id") or session_data.get("sub"),
        "username": session_data.get("username"),
        "employee_id": session_data.get("employee_id"),
        "name": session_data.get("name"),
        "role": session_data.get("role"),
        "department": session_data.get("department"),
        "unit": session_data.get("unit"),
        "shift": session_data.get("shift"),
        "contact_phone": session_data.get("contact_phone"),
        "active_badge_id": session_data.get("active_badge_id"),
        "worker_id": session_data.get("worker_id"),
    }

    return UserProfile(**user_fields)

@router.post("/logout")
def logout(authorization: Optional[str] = Header(None)):
    """
    Stateless logout endpoint with token revocation tracking.
    """
    if authorization:
        token = authorization.replace("Bearer ", "").strip()
        REVOKED_TOKENS.add(token)
    return {"status": "ok", "message": "Logged out successfully"}


