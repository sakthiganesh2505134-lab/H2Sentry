"""
Authentication and Session API Endpoints
SIH 2026 - H2Sentry Prototype Authentication Layer
"""

import uuid
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Header, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.database.database import get_db
from backend.app.database.models import Worker, Badge

router = APIRouter()

# In-memory session store for prototype authentication
# Format: token -> user_session_dict
ACTIVE_SESSIONS: Dict[str, Dict[str, Any]] = {}

# Demo user credentials registry (deterministic for judge demo)
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

@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticates user and returns session token + role.
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
        if worker and password_clean in ["1234", "password", "worker"]:
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

    if not user_data or (user_data.get("pin") != password_clean and password_clean not in ["1234", "admin", "supervisor", "worker"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Employee ID or PIN. Use EMP1024 or SUP001 (PIN: 1234) for Demo Access."
        )

    # Generate session token
    token = f"h2s_sess_{uuid.uuid4().hex}"
    
    # Store session
    session_payload = {k: v for k, v in user_data.items() if k != "pin"}
    ACTIVE_SESSIONS[token] = session_payload

    return AuthResponse(
        token=token,
        user=UserProfile(**session_payload)
    )

@router.get("/me", response_model=UserProfile)
def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """
    Restores and verifies session from Bearer token header.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization token required"
        )

    token = authorization.replace("Bearer ", "").strip()
    session_data = ACTIVE_SESSIONS.get(token)

    if not session_data:
        # Fallback check for standard demo tokens for offline/hot-reload persistence
        if token == "h2s_sess_worker_demo":
            session_data = {k: v for k, v in DEMO_USERS["EMP1024"].items() if k != "pin"}
            ACTIVE_SESSIONS[token] = session_data
        elif token == "h2s_sess_supervisor_demo":
            session_data = {k: v for k, v in DEMO_USERS["SUP001"].items() if k != "pin"}
            ACTIVE_SESSIONS[token] = session_data
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session expired or invalid"
            )

    # If worker, refresh latest active_badge_id from DB if available
    if session_data.get("worker_id"):
        w = db.query(Worker).filter(Worker.id == session_data["worker_id"]).first()
        if w:
            session_data["active_badge_id"] = w.active_badge_id

    return UserProfile(**session_data)

@router.post("/logout")
def logout(authorization: Optional[str] = Header(None)):
    """
    Invalidates active session token.
    """
    if authorization:
        token = authorization.replace("Bearer ", "").strip()
        ACTIVE_SESSIONS.pop(token, None)
    return {"status": "ok", "message": "Logged out successfully"}
