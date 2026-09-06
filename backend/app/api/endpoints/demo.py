"""
H2Sentry Demo & Simulation Management Endpoints
Provides explicit endpoints to seed deterministic simulated demo records
or reset the database to a clean initial zero-worker state.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.database.database import get_db, engine, Base
from backend.app.database.seed import seed_database
from backend.app.database.models import Worker, Badge, Reading, CalibrationSample

router = APIRouter()

@router.post("/seed")
def seed_demo_mode(db: Session = Depends(get_db)):
    """
    Populates deterministic synthetic demonstration records.
    All records are strictly tagged with data_status='SIMULATED' or 'DEMO'.
    """
    seed_database()
    
    workers_count = db.query(Worker).count()
    badges_count = db.query(Badge).count()
    readings_count = db.query(Reading).count()
    cal_count = db.query(CalibrationSample).count()

    return {
        "success": True,
        "mode": "DEMO_MODE",
        "data_status": "SIMULATED",
        "message": "Deterministic simulated demonstration records loaded successfully.",
        "counts": {
            "workers": workers_count,
            "badges": badges_count,
            "readings": readings_count,
            "calibration_samples": cal_count
        }
    }

@router.post("/reset")
def reset_to_clean_state(db: Session = Depends(get_db)):
    """
    Purges all workers, badges, and readings for a fresh zero-worker state (Clean Mode).
    Retains only prototype calibration benchmarks for the exposure engine.
    """
    db.query(Reading).delete()
    db.query(Badge).delete()
    db.query(Worker).delete()
    db.commit()

    return {
        "success": True,
        "mode": "NORMAL_MODE",
        "message": "Database successfully reset to clean initial state. 0 workers, 0 badges, 0 readings.",
        "counts": {
            "workers": 0,
            "badges": 0,
            "readings": 0
        }
    }
