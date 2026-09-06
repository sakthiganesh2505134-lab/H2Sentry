"""
Worker Management and Exposure Dossier Endpoints
"""

from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.database.database import get_db
from backend.app.database.models import Worker, Badge, Reading
from backend.app.schemas.schemas import (
    WorkerResponse,
    WorkerDetailResponse,
    WorkerCreate,
    WorkerUpdate,
    ReadingResponse
)

router = APIRouter()

@router.get("", response_model=List[WorkerResponse])
def get_workers(department: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Worker)
    if department:
        query = query.filter(Worker.department.ilike(f"%{department}%"))
    workers = query.all()
    
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
                
        # Cumulative shift dose
        all_readings = db.query(Reading).filter(Reading.worker_id == w.id).all()
        cum_dose = sum(r.estimated_dose for r in all_readings) if all_readings else 0.0

        w_dict = w.to_dict()
        w_dict["badge_status"] = badge_status
        w_dict["latest_reading"] = latest_r.to_dict() if latest_r else None
        w_dict["cumulative_shift_dose"] = round(cum_dose, 1)
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
    return WorkerResponse(**w_dict)

@router.get("/{worker_id}", response_model=WorkerDetailResponse)
def get_worker_detail(worker_id: str, db: Session = Depends(get_db)):
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
    w_dict = worker.to_dict()
    w_dict["badge_status"] = badge_status
    w_dict["latest_reading"] = latest_r.to_dict() if latest_r else None
    
    total_dose = sum(r.estimated_dose for r in readings) if readings else 0.0

    # Format trend timeline
    trend = []
    for r in reversed(readings):
        trend.append({
            "timestamp": r.timestamp.strftime("%b %d, %H:%M") if r.timestamp else "",
            "dose": r.estimated_dose,
            "status": r.status,
            "twa_ppm": r.equivalent_8h_twa_ppm
        })

    return WorkerDetailResponse(
        worker=WorkerResponse(**w_dict),
        badge=badge_info,
        readings_history=[r.to_dict() for r in readings],
        total_cumulative_dose=round(total_dose, 1),
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
