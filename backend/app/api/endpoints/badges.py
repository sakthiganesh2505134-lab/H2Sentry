"""
Badge Management and QR Identity Lookup Endpoints
Resolves physical badge identity (QR / DataMatrix) to worker, shift, and validity.
"""

from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.database.database import get_db
from backend.app.database.models import Badge, Worker, Reading
from backend.app.schemas.schemas import (
    BadgeResponse,
    BadgeCreate,
    BadgeUpdate,
    BadgeLookupResponse,
    BadgeVerifyRequest
)

router = APIRouter()

def utc_now():
    return datetime.now(timezone.utc).replace(tzinfo=None)

@router.get("", response_model=List[BadgeResponse])
def get_badges(db: Session = Depends(get_db)):
    """
    Returns all registered badges.
    """
    badges = db.query(Badge).all()
    return [b.to_dict() for b in badges]

@router.post("/verify", response_model=BadgeLookupResponse)
def verify_badge_post(payload: BadgeVerifyRequest, db: Session = Depends(get_db)):
    """
    Authoritative backend validation endpoint for QR code badge verification.
    """
    return lookup_badge(payload.badge_id, db)

@router.get("/lookup/{badge_id}", response_model=BadgeLookupResponse)
def lookup_badge(badge_id: str, db: Session = Depends(get_db)):
    """
    Resolves Badge ID from physical QR scan to worker profile, department, shift, validity, and last reading.
    """
    cleaned_id = badge_id.strip()
    badge = db.query(Badge).filter(Badge.id == cleaned_id).first()
    
    cutoff_30d = utc_now() - timedelta(days=30)

    if not badge:
        # Check if any worker is already assigned this as active_badge_id
        worker = db.query(Worker).filter(Worker.active_badge_id == cleaned_id).first()
        if worker:
            worker_readings_30d = db.query(Reading).filter(
                Reading.worker_id == worker.id,
                Reading.timestamp >= cutoff_30d
            ).all()
            cum_30d = sum(r.estimated_dose for r in worker_readings_30d) if worker_readings_30d else 0.0

            last_r = db.query(Reading).filter(Reading.worker_id == worker.id).order_by(Reading.timestamp.desc()).first()
            return BadgeLookupResponse(
                badge_id=cleaned_id,
                valid=True,
                status="VALID",
                worker_id=worker.id,
                worker_name=worker.name,
                employee_id=worker.employee_id,
                department=worker.department,
                unit=worker.unit,
                shift=worker.shift,
                issued_at=worker.created_at.strftime("%d %b %Y") if worker.created_at else "08 Sep 2026",
                last_reading_dose=last_r.estimated_dose if last_r else 742.0,
                last_reading_unit="ppm·min",
                last_reading_timestamp=last_r.timestamp.strftime("%d %b %Y • %H:%M") if (last_r and last_r.timestamp) else "08 Sep 2026 • 16:42",
                measurement_period="Current shift",
                cumulative_30d_dose=round(cum_30d, 1),
                cumulative_30d_unit="ppm·min",
                calibration_version="CAL-v0.1-demo",
                message="Badge matched to active worker profile."
            )
        
        return BadgeLookupResponse(
            badge_id=cleaned_id,
            valid=False,
            status="UNREGISTERED",
            message=f"Badge {cleaned_id} is not registered in the system. Supervisor setup required."
        )

    # If badge exists, check expiry status
    now = utc_now()
    status = badge.status
    if badge.expires_at:
        if badge.expires_at < now:
            status = "EXPIRED"
        elif badge.expires_at < (now + timedelta(days=15)):
            status = "EXPIRING_SOON"
        else:
            status = "VALID"

    worker = badge.worker
    if not worker and badge.worker_id:
        worker = db.query(Worker).filter(Worker.id == badge.worker_id).first()

    last_r = None
    cum_30d = 0.0
    if worker:
        worker_readings_30d = db.query(Reading).filter(
            Reading.worker_id == worker.id,
            Reading.timestamp >= cutoff_30d
        ).all()
        cum_30d = sum(r.estimated_dose for r in worker_readings_30d) if worker_readings_30d else 0.0
        last_r = db.query(Reading).filter(Reading.worker_id == worker.id).order_by(Reading.timestamp.desc()).first()
    if not last_r:
        last_r = db.query(Reading).filter(Reading.badge_id == badge.id).order_by(Reading.timestamp.desc()).first()
        if not cum_30d:
            badge_readings_30d = db.query(Reading).filter(
                Reading.badge_id == badge.id,
                Reading.timestamp >= cutoff_30d
            ).all()
            cum_30d = sum(r.estimated_dose for r in badge_readings_30d) if badge_readings_30d else 0.0

    issued_str = badge.manufactured_at.strftime("%d %b %Y") if badge.manufactured_at else "08 Sep 2026"
    last_dose = last_r.estimated_dose if last_r else 742.0
    last_ts_str = last_r.timestamp.strftime("%d %b %Y • %H:%M") if (last_r and last_r.timestamp) else "08 Sep 2026 • 16:42"

    return BadgeLookupResponse(
        badge_id=badge.id,
        valid=(status != "EXPIRED" and status != "DECOMMISSIONED"),
        status=status,
        worker_id=worker.id if worker else None,
        worker_name=worker.name if worker else None,
        employee_id=worker.employee_id if worker else None,
        department=worker.department if worker else None,
        unit=worker.unit if worker else None,
        shift=worker.shift if worker else None,
        issued_at=issued_str,
        expires_at=badge.expires_at.isoformat() if badge.expires_at else None,
        last_reading_dose=last_dose,
        last_reading_unit="ppm·min",
        last_reading_timestamp=last_ts_str,
        measurement_period="Current shift",
        cumulative_30d_dose=round(cum_30d, 1),
        cumulative_30d_unit="ppm·min",
        calibration_version=badge.calibration_version or "CAL-v0.1-demo",
        message="Badge identified successfully."
    )

@router.get("/{badge_id}", response_model=BadgeResponse)
def get_badge_by_id(badge_id: str, db: Session = Depends(get_db)):
    badge = db.query(Badge).filter(Badge.id == badge_id).first()
    if not badge:
        raise HTTPException(status_code=404, detail=f"Badge {badge_id} not found.")
    return badge.to_dict()

@router.post("", response_model=BadgeResponse)
def create_or_assign_badge(payload: BadgeCreate, db: Session = Depends(get_db)):
    """
    Registers a new badge or assigns it to a worker.
    """
    badge_id = payload.badge_id.strip()
    existing = db.query(Badge).filter(Badge.id == badge_id).first()
    
    expires_at = payload.expires_at
    if isinstance(expires_at, str):
        try:
            expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00')).replace(tzinfo=None)
        except Exception:
            expires_at = utc_now() + timedelta(days=90)
    elif not expires_at:
        expires_at = utc_now() + timedelta(days=90)

    manufactured_at = payload.manufactured_at
    if isinstance(manufactured_at, str):
        try:
            manufactured_at = datetime.fromisoformat(manufactured_at.replace('Z', '+00:00')).replace(tzinfo=None)
        except Exception:
            manufactured_at = utc_now()
    elif not manufactured_at:
        manufactured_at = utc_now()

    if existing:
        if payload.worker_id:
            existing.worker_id = payload.worker_id
            # Also update worker's active_badge_id
            worker = db.query(Worker).filter(Worker.id == payload.worker_id).first()
            if worker:
                worker.active_badge_id = badge_id
        if payload.status:
            existing.status = payload.status
        existing.expires_at = expires_at
        existing.calibration_version = payload.calibration_version or "CAL-v0.1-demo"
        db.commit()
        db.refresh(existing)
        return existing.to_dict()

    new_badge = Badge(
        id=badge_id,
        worker_id=payload.worker_id,
        batch_no=payload.batch_no or "BATCH-2026-Q3-A",
        manufactured_at=manufactured_at,
        expires_at=expires_at,
        status=payload.status or "VALID",
        calibration_version=payload.calibration_version or "CAL-v0.1-demo"
    )
    db.add(new_badge)
    
    if payload.worker_id:
        worker = db.query(Worker).filter(Worker.id == payload.worker_id).first()
        if worker:
            worker.active_badge_id = badge_id

    db.commit()
    db.refresh(new_badge)
    return new_badge.to_dict()

@router.put("/{badge_id}", response_model=BadgeResponse)
def update_badge(badge_id: str, payload: BadgeUpdate, db: Session = Depends(get_db)):
    badge = db.query(Badge).filter(Badge.id == badge_id).first()
    if not badge:
        raise HTTPException(status_code=404, detail=f"Badge {badge_id} not found.")
        
    if payload.worker_id is not None:
        badge.worker_id = payload.worker_id
        worker = db.query(Worker).filter(Worker.id == payload.worker_id).first()
        if worker:
            worker.active_badge_id = badge_id
    if payload.status:
        badge.status = payload.status
    if payload.expires_at:
        if isinstance(payload.expires_at, str):
            badge.expires_at = datetime.fromisoformat(payload.expires_at.replace('Z', '+00:00')).replace(tzinfo=None)
        else:
            badge.expires_at = payload.expires_at

    db.commit()
    db.refresh(badge)
    return badge.to_dict()
