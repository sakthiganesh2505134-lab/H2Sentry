"""
Exposure Readings API Endpoints
"""

import os
import json
import uuid
import base64
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.database.database import get_db
from backend.app.database.models import Reading, Worker, Badge
from backend.app.schemas.schemas import ReadingResponse, ReadingCreate, DashboardStatsResponse

router = APIRouter()

UPLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), "data", "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

@router.get("", response_model=List[ReadingResponse])
def get_readings(
    worker_id: Optional[str] = None,
    status: Optional[str] = None,
    shift: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    query = db.query(Reading)
    if worker_id:
        query = query.filter(Reading.worker_id == worker_id)
    if status:
        query = query.filter(Reading.status == status)
    if shift:
        query = query.filter(Reading.shift.ilike(f"%{shift}%"))
        
    readings = query.order_by(desc(Reading.timestamp)).offset(offset).limit(limit).all()
    return [r.to_dict() for r in readings]

@router.get("/stats/dashboard", response_model=DashboardStatsResponse)
@router.get("/dashboard/stats", response_model=DashboardStatsResponse)
def get_dashboard_stats(db: Session = Depends(get_db)):
    workers_count = db.query(Worker).count()
    valid_badges = db.query(Badge).filter(Badge.status == "VALID").count()
    expiring_soon = db.query(Badge).filter(Badge.status == "EXPIRING_SOON").count()
    expired_badges = db.query(Badge).filter(Badge.status == "EXPIRED").count()
    
    # Readings in last 24h
    cutoff_today = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(hours=24)
    readings_today = db.query(Reading).filter(Reading.timestamp >= cutoff_today).all()
    
    review_required = db.query(Reading).filter(
        (Reading.status.in_(["HIGH", "CRITICAL"])) | (Reading.expiry_status == "EXPIRED")
    ).count()

    all_readings = db.query(Reading).all()
    avg_dose = 0.0
    max_dose = 0.0
    if all_readings:
        doses = [r.estimated_dose for r in all_readings]
        avg_dose = round(sum(doses) / len(doses), 1)
        max_dose = max(doses)

    # Status distribution
    dist = {"LOW": 0, "MODERATE": 0, "HIGH": 0, "CRITICAL": 0}
    for r in all_readings:
        if r.status in dist:
            dist[r.status] += 1

    recent = db.query(Reading).order_by(desc(Reading.timestamp)).limit(8).all()

    return DashboardStatsResponse(
        active_workers_count=workers_count,
        valid_badges_count=valid_badges,
        expiring_soon_count=expiring_soon,
        expired_badges_count=expired_badges,
        readings_today_count=len(readings_today) if readings_today else len(recent),
        review_required_count=review_required,
        average_shift_dose=avg_dose,
        max_dose_today=max_dose,
        recent_readings=[r.to_dict() for r in recent],
        exposure_distribution=dist
    )

@router.get("/{reading_id}", response_model=ReadingResponse)
def get_reading_by_id(reading_id: str, db: Session = Depends(get_db)):
    reading = db.query(Reading).filter(Reading.id == reading_id).first()
    if not reading:
        raise HTTPException(status_code=404, detail=f"Reading {reading_id} not found.")
    return reading.to_dict()

@router.post("", response_model=ReadingResponse)
def save_reading(payload: ReadingCreate, db: Session = Depends(get_db)):
    new_id = f"scan-{uuid.uuid4().hex[:8]}"
    
    # Save base64 image if provided
    img_path = None
    annotated_path = None
    if payload.image_base64:
        try:
            b64_data = payload.image_base64.split(",")[-1]
            img_filename = f"{new_id}_raw.jpg"
            img_path = os.path.join(UPLOADS_DIR, img_filename)
            with open(img_path, "wb") as f:
                f.write(base64.b64decode(b64_data))
        except Exception:
            pass
            
    if payload.annotated_image_base64:
        try:
            b64_data = payload.annotated_image_base64.split(",")[-1]
            ann_filename = f"{new_id}_annotated.jpg"
            annotated_path = os.path.join(UPLOADS_DIR, ann_filename)
            with open(annotated_path, "wb") as f:
                f.write(base64.b64decode(b64_data))
        except Exception:
            pass

    reading = Reading(
        id=new_id,
        worker_id=payload.worker_id,
        badge_id=payload.badge_id,
        timestamp=datetime.now(timezone.utc).replace(tzinfo=None),
        shift=payload.shift,
        temperature_c=payload.temperature_c,
        humidity_pct=payload.humidity_pct,
        strip_age_days=payload.strip_age_days,
        estimated_dose=payload.estimated_dose,
        equivalent_8h_twa_ppm=payload.equivalent_8h_twa_ppm,
        dose_unit=payload.dose_unit,
        confidence=payload.confidence,
        status=payload.status,
        expiry_status=payload.expiry_status,
        image_quality_score=payload.image_quality_score,
        image_quality_valid=payload.image_quality_valid,
        color_features_json=json.dumps(payload.color_features or {}),
        detections_json=json.dumps(payload.detections or {}),
        warnings_json=json.dumps(payload.warnings or []),
        source=payload.source,
        image_path=img_path,
        annotated_image_path=annotated_path
    )
    
    db.add(reading)
    db.commit()
    db.refresh(reading)
    return reading.to_dict()
