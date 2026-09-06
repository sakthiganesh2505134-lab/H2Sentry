"""
H2Sentry SQLAlchemy ORM Models
Defines: Worker, Badge, Reading, CalibrationSample
"""

import json
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, Boolean, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from backend.app.database.database import Base

def utc_now():
    return datetime.now(timezone.utc).replace(tzinfo=None)

class Worker(Base):
    __tablename__ = "workers"

    id = Column(String(64), primary_key=True, index=True)
    employee_id = Column(String(32), unique=True, index=True, nullable=False)
    name = Column(String(128), nullable=False)
    department = Column(String(128), nullable=False) # e.g. Sulfur Recovery Unit (SRU-1)
    unit = Column(String(64), nullable=True, default="General Operations")
    shift = Column(String(64), nullable=False)       # e.g. Shift A (Morning)
    contact_phone = Column(String(32), nullable=True)
    active_badge_id = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=utc_now)

    badges = relationship("Badge", back_populates="worker", cascade="all, delete-orphan")
    readings = relationship("Reading", back_populates="worker", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "employee_id": self.employee_id,
            "name": self.name,
            "department": self.department,
            "unit": self.unit or "General Operations",
            "shift": self.shift,
            "contact_phone": self.contact_phone,
            "active_badge_id": self.active_badge_id,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class Badge(Base):
    __tablename__ = "badges"

    id = Column(String(64), primary_key=True, index=True) # Badge ID (e.g. H2S-BDG-000001 or MRPL-H2S-8821)
    worker_id = Column(String(64), ForeignKey("workers.id"), nullable=True)
    batch_no = Column(String(64), nullable=False, default="BATCH-2026-Q3-A")
    manufactured_at = Column(DateTime, nullable=False, default=utc_now)
    expires_at = Column(DateTime, nullable=False)
    status = Column(String(32), default="VALID") # VALID, EXPIRING_SOON, EXPIRED, DECOMMISSIONED
    calibration_version = Column(String(64), default="CAL-v0.1-demo")
    created_at = Column(DateTime, default=utc_now)

    worker = relationship("Worker", back_populates="badges")
    readings = relationship("Reading", back_populates="badge")

    def to_dict(self):
        return {
            "id": self.id,
            "badge_id": self.id,
            "worker_id": self.worker_id,
            "worker_name": self.worker.name if self.worker else None,
            "batch_no": self.batch_no,
            "manufactured_at": self.manufactured_at.isoformat() if self.manufactured_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "status": self.status,
            "calibration_version": self.calibration_version,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class Reading(Base):
    __tablename__ = "readings"

    id = Column(String(64), primary_key=True, index=True)
    worker_id = Column(String(64), ForeignKey("workers.id"), nullable=True)
    badge_id = Column(String(64), ForeignKey("badges.id"), nullable=True)
    timestamp = Column(DateTime, default=utc_now, index=True)
    shift = Column(String(64), nullable=False)
    
    temperature_c = Column(Float, default=25.0)
    humidity_pct = Column(Float, default=50.0)
    strip_age_days = Column(Float, default=14.0)
    
    estimated_dose = Column(Float, nullable=False) # ppm·min
    equivalent_8h_twa_ppm = Column(Float, nullable=False)
    dose_unit = Column(String(16), default="ppm·min")
    
    confidence = Column(Float, nullable=False) # 0.0 - 1.0
    status = Column(String(32), nullable=False) # LOW, MODERATE, HIGH, CRITICAL
    expiry_status = Column(String(32), default="VALID") # VALID, EXPIRING_SOON, EXPIRED
    
    image_quality_score = Column(Float, default=1.0)
    image_quality_valid = Column(Boolean, default=True)
    
    color_features_json = Column(Text, nullable=True)
    detections_json = Column(Text, nullable=True)
    warnings_json = Column(Text, nullable=True)
    
    calibration_version = Column(String(64), default="CAL-v0.1-demo")
    model_version = Column(String(64), default="prototype-estimator-v1")
    data_status = Column(String(32), default="SIMULATED") # DEMO, SIMULATED, EXPERIMENTAL, VALIDATED
    source = Column(String(32), default="UPLOAD") # CAMERA, UPLOAD, DEMO_PRESET
    image_path = Column(String(256), nullable=True)
    annotated_image_path = Column(String(256), nullable=True)

    worker = relationship("Worker", back_populates="readings")
    badge = relationship("Badge", back_populates="readings")

    def to_dict(self):
        return {
            "id": self.id,
            "worker_id": self.worker_id,
            "worker_name": self.worker.name if self.worker else "Unassigned / Guest",
            "worker_employee_id": self.worker.employee_id if self.worker else None,
            "department": self.worker.department if self.worker else "General Operations",
            "unit": self.worker.unit if self.worker and self.worker.unit else "General Operations",
            "badge_id": self.badge_id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "shift": self.shift,
            "temperature_c": self.temperature_c,
            "humidity_pct": self.humidity_pct,
            "strip_age_days": self.strip_age_days,
            "estimated_dose": self.estimated_dose,
            "equivalent_8h_twa_ppm": self.equivalent_8h_twa_ppm,
            "dose_unit": self.dose_unit,
            "confidence": self.confidence,
            "confidence_pct": round(self.confidence * 100.0, 1),
            "status": self.status,
            "expiry_status": self.expiry_status,
            "image_quality_score": self.image_quality_score,
            "image_quality_valid": self.image_quality_valid,
            "color_features": json.loads(self.color_features_json) if self.color_features_json else {},
            "detections": json.loads(self.detections_json) if self.detections_json else {},
            "warnings": json.loads(self.warnings_json) if self.warnings_json else [],
            "calibration_version": self.calibration_version,
            "model_version": self.model_version,
            "data_status": self.data_status or "SIMULATED",
            "source": self.source,
            "image_path": self.image_path,
            "annotated_image_path": self.annotated_image_path
        }

class CalibrationSample(Base):
    __tablename__ = "calibration_samples"

    id = Column(String(64), primary_key=True, index=True)
    sample_code = Column(String(64), unique=True, index=True)
    chamber_run_id = Column(String(64), nullable=False)
    
    known_concentration_ppm = Column(Float, nullable=False)
    exposure_duration_min = Column(Float, nullable=False)
    known_dose_ppm_min = Column(Float, nullable=False)
    
    temperature_c = Column(Float, default=25.0)
    humidity_pct = Column(Float, default=50.0)
    strip_age_days = Column(Float, default=14.0)
    
    observed_delta_e = Column(Float, nullable=False)
    observed_L_star = Column(Float, nullable=False)
    predicted_dose_ppm_min = Column(Float, nullable=False)
    
    absolute_error = Column(Float, nullable=False)
    relative_error_pct = Column(Float, nullable=False)
    data_status = Column(String(32), default="SIMULATED") # DEMO, SIMULATED, EXPERIMENTAL, VALIDATED
    calibration_version = Column(String(64), default="CAL-v0.1-demo")
    created_at = Column(DateTime, default=utc_now)

    def to_dict(self):
        return {
            "id": self.id,
            "sample_code": self.sample_code,
            "chamber_run_id": self.chamber_run_id,
            "known_concentration_ppm": self.known_concentration_ppm,
            "exposure_duration_min": self.exposure_duration_min,
            "known_dose_ppm_min": self.known_dose_ppm_min,
            "temperature_c": self.temperature_c,
            "humidity_pct": self.humidity_pct,
            "strip_age_days": self.strip_age_days,
            "observed_delta_e": self.observed_delta_e,
            "observed_L_star": self.observed_L_star,
            "predicted_dose_ppm_min": self.predicted_dose_ppm_min,
            "absolute_error": round(self.absolute_error, 2),
            "relative_error_pct": round(self.relative_error_pct, 2),
            "data_status": self.data_status or "SIMULATED",
            "calibration_version": self.calibration_version,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
