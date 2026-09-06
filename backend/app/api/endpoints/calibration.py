"""
Calibration Laboratory API Endpoints
Provides statistical model fit metrics (MAE, RMSE, R²), sample entry,
and empirical chamber calibration benchmarking.
"""

import math
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.database.database import get_db
from backend.app.database.models import CalibrationSample
from backend.app.schemas.schemas import (
    CalibrationSampleResponse,
    CalibrationSampleCreate,
    CalibrationSummaryResponse
)
from backend.cv.exposure_engine import CALIBRATION_MODEL_VERSION, CALIBRATION_DISCLOSURE

router = APIRouter()

@router.get("/summary", response_model=CalibrationSummaryResponse)
def get_calibration_summary(db: Session = Depends(get_db)):
    samples = db.query(CalibrationSample).order_by(CalibrationSample.known_dose_ppm_min).all()
    count = len(samples)
    
    if count == 0:
        return CalibrationSummaryResponse(
            sample_count=0,
            mae=0.0,
            rmse=0.0,
            r_squared=0.0,
            mean_relative_error_pct=0.0,
            calibration_version=CALIBRATION_MODEL_VERSION,
            model_type="Diffusion-Reaction Exponential Kinetics",
            status="INSUFFICIENT_DATA",
            scientific_notice="Insufficient calibration samples in database. Add controlled chamber test points.",
            samples=[]
        )

    known_vals = [s.known_dose_ppm_min for s in samples]
    pred_vals = [s.predicted_dose_ppm_min for s in samples]
    abs_errors = [s.absolute_error for s in samples]
    rel_errors = [s.relative_error_pct for s in samples]

    mae = sum(abs_errors) / count
    mse = sum((p - k) ** 2 for p, k in zip(pred_vals, known_vals)) / count
    rmse = math.sqrt(mse)
    mean_rel_err = sum(rel_errors) / count

    # Calculate R-squared (Coefficient of Determination)
    mean_known = sum(known_vals) / count
    ss_tot = sum((k - mean_known) ** 2 for k in known_vals)
    ss_res = sum((k - p) ** 2 for p, k in zip(pred_vals, known_vals))
    r_squared = 1.0 - (ss_res / ss_tot) if ss_tot > 0 else 0.0
    r_squared = max(0.0, min(1.0, r_squared))

    return CalibrationSummaryResponse(
        sample_count=count,
        mae=round(mae, 2),
        rmse=round(rmse, 2),
        r_squared=round(r_squared, 4),
        mean_relative_error_pct=round(mean_rel_err, 2),
        calibration_version=CALIBRATION_MODEL_VERSION,
        model_type="Diffusion-Reaction Exponential Kinetics (Prototype)",
        status="SUFFICIENT_DATA" if count >= 5 else "PRELIMINARY_DATA",
        scientific_notice=CALIBRATION_DISCLOSURE,
        samples=[s.to_dict() for s in samples]
    )

@router.get("/samples", response_model=List[CalibrationSampleResponse])
def get_calibration_samples(db: Session = Depends(get_db)):
    samples = db.query(CalibrationSample).order_by(desc(CalibrationSample.created_at)).all()
    return [s.to_dict() for s in samples]

@router.post("/samples", response_model=CalibrationSampleResponse)
def add_calibration_sample(payload: CalibrationSampleCreate, db: Session = Depends(get_db)):
    # Calculate predicted dose based on kinetic formula
    # Non-linear optical darkening ratio D = (96.0 - L*) / 72.0
    darkening_ratio = max(0.0, min(0.98, (96.0 - payload.observed_L_star) / 72.0))
    k_rate = 850.0
    raw_dose = -k_rate * math.log(max(0.01, 1.0 - darkening_ratio)) if darkening_ratio > 0.01 else 0.0
    
    # Environmental compensation
    temp_factor = 1.0 + 0.008 * (payload.temperature_c - 25.0)
    rh_factor = 1.0 + 0.003 * (payload.humidity_pct - 50.0)
    age_factor = max(0.85, 1.0 - max(0.0, (payload.strip_age_days - 30.0) * 0.002))
    env_comp = max(0.5, temp_factor * rh_factor * age_factor)
    
    pred_dose = round(raw_dose / env_comp, 1)
    abs_err = round(abs(pred_dose - payload.known_dose_ppm_min), 1)
    rel_err = round((abs_err / max(1.0, payload.known_dose_ppm_min)) * 100.0, 2)

    sample_id = f"cal-{uuid.uuid4().hex[:6]}"
    sample = CalibrationSample(
        id=sample_id,
        sample_code=payload.sample_code,
        chamber_run_id=payload.chamber_run_id,
        known_concentration_ppm=payload.known_concentration_ppm,
        exposure_duration_min=payload.exposure_duration_min,
        known_dose_ppm_min=payload.known_dose_ppm_min,
        temperature_c=payload.temperature_c,
        humidity_pct=payload.humidity_pct,
        strip_age_days=payload.strip_age_days,
        observed_delta_e=payload.observed_delta_e,
        observed_L_star=payload.observed_L_star,
        predicted_dose_ppm_min=pred_dose,
        absolute_error=abs_err,
        relative_error_pct=rel_err
    )
    
    db.add(sample)
    db.commit()
    db.refresh(sample)
    return sample.to_dict()
