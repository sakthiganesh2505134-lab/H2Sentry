"""
Worker Management and Exposure Dossier Endpoints
"""

from datetime import datetime, timedelta, timezone
from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.database.database import get_db
from backend.app.database.models import Worker, Badge, Reading
from backend.app.schemas.schemas import (
    WorkerResponse,
    WorkerDetailResponse,
    WorkerSummaryResponse,
    DailyExposureItem,
    WorkerCreate,
    WorkerUpdate,
    ReadingResponse
)

router = APIRouter()

def utc_now():
    return datetime.now(timezone.utc).replace(tzinfo=None)

@router.get("", response_model=List[WorkerResponse])
def get_workers(department: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Worker)
    if department:
        query = query.filter(Worker.department.ilike(f"%{department}%"))
    workers = query.all()
    
    now = utc_now()
    cutoff_7d = now - timedelta(days=7)
    cutoff_15d = now - timedelta(days=15)
    cutoff_30d = now - timedelta(days=30)

    result = []
    for w in workers:
        # Get latest reading
        latest_r = db.query(Reading).filter(Reading.worker_id == w.id).order_by(desc(Reading.timestamp)).first()
        
        # Get active badge status
        badge_status = "VALID"
        if w.active_badge_id:
            b = db.query(Badge).filter(Badge.id == w.active_badge_id).first()
            if b:
                badge_status = b.status
                
        # All readings for this worker
        all_readings = db.query(Reading).filter(Reading.worker_id == w.id).all()
        cum_dose = sum(r.estimated_dose for r in all_readings) if all_readings else 0.0
        
        # Windowed cumulative sums
        cum_7d = sum(r.estimated_dose for r in all_readings if r.timestamp and r.timestamp >= cutoff_7d) if all_readings else 0.0
        cum_15d = sum(r.estimated_dose for r in all_readings if r.timestamp and r.timestamp >= cutoff_15d) if all_readings else 0.0
        cum_30d = sum(r.estimated_dose for r in all_readings if r.timestamp and r.timestamp >= cutoff_30d) if all_readings else 0.0

        w_dict = w.to_dict()
        w_dict["badge_status"] = badge_status
        w_dict["latest_reading"] = latest_r.to_dict() if latest_r else None
        w_dict["cumulative_shift_dose"] = round(cum_dose, 1)
        w_dict["cumulative_30d_dose"] = round(cum_30d, 1)
        w_dict["cumulative_15d_dose"] = round(cum_15d, 1)
        w_dict["cumulative_7d_dose"] = round(cum_7d, 1)
        result.append(WorkerResponse(**w_dict))
        
    return result

@router.post("", response_model=WorkerResponse)
def create_worker(payload: WorkerCreate, db: Session = Depends(get_db)):
    """
    Creates a new worker record.
    """
    # Check if employee_id already exists
    existing = db.query(Worker).filter(Worker.employee_id == payload.employee_id).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Worker with Employee ID '{payload.employee_id}' already exists.")

    worker_id = f"w-{uuid.uuid4().hex[:6]}"
    new_worker = Worker(
        id=worker_id,
        employee_id=payload.employee_id.strip(),
        name=payload.name.strip(),
        department=payload.department.strip(),
        unit=payload.unit.strip() if payload.unit else "General Operations",
        shift=payload.shift.strip(),
        contact_phone=payload.contact_phone.strip() if payload.contact_phone else None
    )
    db.add(new_worker)
    db.commit()
    db.refresh(new_worker)

    w_dict = new_worker.to_dict()
    w_dict["badge_status"] = "VALID"
    w_dict["latest_reading"] = None
    w_dict["cumulative_shift_dose"] = 0.0
    w_dict["cumulative_30d_dose"] = 0.0
    w_dict["cumulative_15d_dose"] = 0.0
    w_dict["cumulative_7d_dose"] = 0.0
    return WorkerResponse(**w_dict)

@router.get("/{worker_id}/summary", response_model=WorkerSummaryResponse)
def get_worker_summary(worker_id: str, days: int = Query(30, ge=1, le=365), db: Session = Depends(get_db)):
    """
    Returns aggregated cumulative exposure summary for a worker over the specified period.
    """
    worker = db.query(Worker).filter(Worker.id == worker_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail=f"Worker {worker_id} not found.")

    now = utc_now()
    cutoff = now - timedelta(days=days)

    readings = db.query(Reading).filter(
        Reading.worker_id == worker_id,
        Reading.timestamp >= cutoff
    ).order_by(desc(Reading.timestamp)).all()

    cum_dose = sum(r.estimated_dose for r in readings) if readings else 0.0
    latest_r = readings[0] if readings else None
    first_r = readings[-1] if readings else None

    # Daily aggregation
    daily_map = {}
    for r in reversed(readings):
        d_str = r.timestamp.strftime("%Y-%m-%d")
        d_lbl = r.timestamp.strftime("%d %b")
        if d_str not in daily_map:
            daily_map[d_str] = {"date": d_str, "day_label": d_lbl, "exposure_ppm_min": 0.0, "readings_count": 0}
        daily_map[d_str]["exposure_ppm_min"] += r.estimated_dose
        daily_map[d_str]["readings_count"] += 1

    daily_list = [
        DailyExposureItem(
            date=v["date"],
            day_label=v["day_label"],
            exposure_ppm_min=round(v["exposure_ppm_min"], 1),
            readings_count=v["readings_count"]
        )
        for v in daily_map.values()
    ]

    return WorkerSummaryResponse(
        worker_id=worker.id,
        employee_id=worker.employee_id,
        worker_name=worker.name,
        department=worker.department,
        unit=worker.unit,
        period_days=days,
        cumulative_exposure_ppm_min=round(cum_dose, 1),
        reading_count=len(readings),
        last_reading_ppm_min=round(latest_r.estimated_dose, 1) if latest_r else None,
        last_reading_timestamp=latest_r.timestamp.isoformat() if latest_r and latest_r.timestamp else None,
        first_reading_timestamp=first_r.timestamp.isoformat() if first_r and first_r.timestamp else None,
        daily_exposure=daily_list,
        dose_unit="ppm·min",
        scientific_disclosure="Sum of recorded passive exposure estimates during the selected period."
    )

@router.get("/{worker_id}", response_model=WorkerDetailResponse)
def get_worker_detail(worker_id: str, days: int = Query(30, ge=1, le=365), db: Session = Depends(get_db)):
    worker = db.query(Worker).filter(Worker.id == worker_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail=f"Worker {worker_id} not found.")
        
    readings = db.query(Reading).filter(Reading.worker_id == worker_id).order_by(desc(Reading.timestamp)).all()
    
    badge_info = None
    badge_status = "VALID"
    if worker.active_badge_id:
        b = db.query(Badge).filter(Badge.id == worker.active_badge_id).first()
        if b:
            badge_info = b.to_dict()
            badge_status = b.status

    latest_r = readings[0] if readings else None
    
    now = utc_now()
    cutoff_7d = now - timedelta(days=7)
    cutoff_15d = now - timedelta(days=15)
    cutoff_30d = now - timedelta(days=30)
    cutoff_period = now - timedelta(days=days)

    total_dose = sum(r.estimated_dose for r in readings) if readings else 0.0
    cum_7d = sum(r.estimated_dose for r in readings if r.timestamp and r.timestamp >= cutoff_7d) if readings else 0.0
    cum_15d = sum(r.estimated_dose for r in readings if r.timestamp and r.timestamp >= cutoff_15d) if readings else 0.0
    cum_30d = sum(r.estimated_dose for r in readings if r.timestamp and r.timestamp >= cutoff_30d) if readings else 0.0

    period_readings = [r for r in readings if r.timestamp and r.timestamp >= cutoff_period]
    period_dose = sum(r.estimated_dose for r in period_readings) if period_readings else 0.0
    first_r_in_period = period_readings[-1] if period_readings else None

    w_dict = worker.to_dict()
    w_dict["badge_status"] = badge_status
    w_dict["latest_reading"] = latest_r.to_dict() if latest_r else None
    w_dict["cumulative_shift_dose"] = round(total_dose, 1)
    w_dict["cumulative_30d_dose"] = round(cum_30d, 1)
    w_dict["cumulative_15d_dose"] = round(cum_15d, 1)
    w_dict["cumulative_7d_dose"] = round(cum_7d, 1)

    # Format trend timeline
    trend = []
    for r in reversed(readings):
        trend.append({
            "timestamp": r.timestamp.strftime("%b %d, %H:%M") if r.timestamp else "",
            "dose": r.estimated_dose,
            "status": r.status,
            "twa_ppm": r.equivalent_8h_twa_ppm
        })

    # Group period readings by day for daily exposure intelligence
    daily_map = {}
    for r in reversed(period_readings):
        d_str = r.timestamp.strftime("%Y-%m-%d")
        d_lbl = r.timestamp.strftime("%d %b")
        if d_str not in daily_map:
            daily_map[d_str] = {"date": d_str, "day_label": d_lbl, "exposure_ppm_min": 0.0, "readings_count": 0}
        daily_map[d_str]["exposure_ppm_min"] += r.estimated_dose
        daily_map[d_str]["readings_count"] += 1

    daily_list = [
        DailyExposureItem(
            date=v["date"],
            day_label=v["day_label"],
            exposure_ppm_min=round(v["exposure_ppm_min"], 1),
            readings_count=v["readings_count"]
        )
        for v in daily_map.values()
    ]

    return WorkerDetailResponse(
        worker=WorkerResponse(**w_dict),
        badge=badge_info,
        readings_history=[r.to_dict() for r in readings],
        total_cumulative_dose=round(total_dose, 1),
        period_days=days,
        period_cumulative_dose=round(period_dose, 1),
        first_reading_timestamp=first_r_in_period.timestamp.isoformat() if first_r_in_period and first_r_in_period.timestamp else None,
        daily_exposure=daily_list,
        lifetime_scans_count=len(readings),
        exposure_trend=trend
    )

@router.put("/{worker_id}", response_model=WorkerResponse)
def update_worker(worker_id: str, payload: WorkerUpdate, db: Session = Depends(get_db)):
    worker = db.query(Worker).filter(Worker.id == worker_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail=f"Worker {worker_id} not found.")

    if payload.name:
        worker.name = payload.name.strip()
    if payload.employee_id:
        worker.employee_id = payload.employee_id.strip()
    if payload.department:
        worker.department = payload.department.strip()
    if payload.unit:
        worker.unit = payload.unit.strip()
    if payload.shift:
        worker.shift = payload.shift.strip()
    if payload.contact_phone is not None:
        worker.contact_phone = payload.contact_phone
    if payload.active_badge_id is not None:
        worker.active_badge_id = payload.active_badge_id

    db.commit()
    db.refresh(worker)

    latest_r = db.query(Reading).filter(Reading.worker_id == worker.id).order_by(desc(Reading.timestamp)).first()
    badge_status = "VALID"
    if worker.active_badge_id:
        b = db.query(Badge).filter(Badge.id == worker.active_badge_id).first()
        if b:
            badge_status = b.status

    all_readings = db.query(Reading).filter(Reading.worker_id == worker.id).all()
    cum_dose = sum(r.estimated_dose for r in all_readings) if all_readings else 0.0

    w_dict = worker.to_dict()
    w_dict["badge_status"] = badge_status
    w_dict["latest_reading"] = latest_r.to_dict() if latest_r else None
    w_dict["cumulative_shift_dose"] = round(cum_dose, 1)
    return WorkerResponse(**w_dict)

@router.delete("/{worker_id}")
def delete_worker(worker_id: str, db: Session = Depends(get_db)):
    worker = db.query(Worker).filter(Worker.id == worker_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail=f"Worker {worker_id} not found.")

    db.delete(worker)
    db.commit()
    return {"success": True, "message": f"Worker {worker_id} deleted successfully."}

@router.get("/{worker_id}/readings", response_model=List[ReadingResponse])
def get_worker_readings(worker_id: str, db: Session = Depends(get_db)):
    worker = db.query(Worker).filter(Worker.id == worker_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail=f"Worker {worker_id} not found.")

    readings = db.query(Reading).filter(Reading.worker_id == worker_id).order_by(desc(Reading.timestamp)).all()
    return [r.to_dict() for r in readings]
