"""
H2Sentry Pydantic Validation Schemas
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

# -------------------------------------------------------------
# CV Schemas
# -------------------------------------------------------------
class ImageQualityMetrics(BaseModel):
    width: int
    height: int
    blur_variance: float
    mean_brightness: float
    contrast_std: float
    dark_clip_pct: float
    glare_clip_pct: Optional[float] = 0.0
    sharpness_score: float
    brightness_score: float
    contrast_score: float

class ImageQualityResult(BaseModel):
    valid: bool
    score: float
    issues: List[str] = []
    warnings: List[str] = []
    metrics: Optional[Dict[str, Any]] = None

class DetectionBox(BaseModel):
    bbox: List[int]
    confidence: float

class DetectionsResult(BaseModel):
    success: bool
    error_message: Optional[str] = None
    badge: Optional[DetectionBox] = None
    reference: Optional[DetectionBox] = None
    reaction_strip: Optional[DetectionBox] = None
    expiry: Optional[DetectionBox] = None

class ColorCalibrationResult(BaseModel):
    success: bool
    calibration_quality: float
    residual_error: float
    channel_gains: Dict[str, float]
    observed_patches: List[Dict[str, Any]] = []
    warnings: List[str] = []

class ExpiryResult(BaseModel):
    status: str # VALID, EXPIRING_SOON, EXPIRED, UNKNOWN
    confidence: float
    description: str
    calibrated_rgb: Optional[List[float]] = None

class ExposureResult(BaseModel):
    estimated_dose: float
    unit: str = "ppm·min"
    status: str # LOW, MODERATE, HIGH, CRITICAL
    status_code: str
    status_description: str
    equivalent_8h_twa_ppm: float
    raw_dose_uncompensated: Optional[float] = None
    calibration_version: str
    warnings: List[str] = []
    environmental_factors: Dict[str, Any]
    scientific_disclosure: str

class ConfidenceResult(BaseModel):
    confidence: float
    confidence_pct: float
    rating: str # EXCELLENT, GOOD, MODERATE, LOW
    rating_color: str
    factors: Dict[str, Any]
    warnings: List[str] = []

class CVAnalyzeResponse(BaseModel):
    success: bool
    processing_time_ms: float
    image_quality: ImageQualityResult
    detections: DetectionsResult
    color_calibration: ColorCalibrationResult
    color_features: Dict[str, Any]
    expiry: ExpiryResult
    exposure: ExposureResult
    confidence: ConfidenceResult
    annotated_image_base64: Optional[str] = None
    cropped_regions_base64: Optional[Dict[str, str]] = None
    warnings: List[str] = []
    badge_id_detected: Optional[str] = None

class DemoBadgeItem(BaseModel):
    id: str
    filename: str
    title: str
    description: str
    expected_dose: float
    expiry_status: str
    badge_id: str
    image_url: str

# -------------------------------------------------------------
# Reading Schemas
# -------------------------------------------------------------
class ReadingCreate(BaseModel):
    worker_id: Optional[str] = None
    badge_id: Optional[str] = None
    shift: str = "Shift A"
    temperature_c: float = 25.0
    humidity_pct: float = 50.0
    strip_age_days: float = 14.0
    estimated_dose: float
    equivalent_8h_twa_ppm: float
    dose_unit: str = "ppm·min"
    confidence: float
    status: str
    expiry_status: str
    image_quality_score: float
    image_quality_valid: bool
    color_features: Optional[Dict[str, Any]] = None
    detections: Optional[Dict[str, Any]] = None
    warnings: Optional[List[str]] = None
    source: str = "UPLOAD"
    data_status: Optional[str] = "SIMULATED"
    image_base64: Optional[str] = None
    annotated_image_base64: Optional[str] = None

class ReadingResponse(BaseModel):
    id: str
    worker_id: Optional[str] = None
    worker_name: Optional[str] = None
    worker_employee_id: Optional[str] = None
    department: Optional[str] = None
    unit: Optional[str] = None
    badge_id: Optional[str] = None
    timestamp: Optional[str] = None
    shift: str
    temperature_c: float
    humidity_pct: float
    strip_age_days: float
    estimated_dose: float
    equivalent_8h_twa_ppm: float
    dose_unit: str
    confidence: float
    confidence_pct: float
    status: str
    expiry_status: str
    image_quality_score: float
    image_quality_valid: bool
    color_features: Dict[str, Any]
    detections: Dict[str, Any]
    warnings: List[str]
    calibration_version: str
    model_version: str
    data_status: str = "SIMULATED"
    source: str
    image_path: Optional[str] = None
    annotated_image_path: Optional[str] = None

class DashboardStatsResponse(BaseModel):
    active_workers_count: int
    valid_badges_count: int
    expiring_soon_count: int
    expired_badges_count: int
    readings_today_count: int
    review_required_count: int # Readings with HIGH/CRITICAL or EXPIRED
    average_shift_dose: float
    max_dose_today: float
    recent_readings: List[ReadingResponse]
    exposure_distribution: Dict[str, int] # LOW, MODERATE, HIGH, CRITICAL

# -------------------------------------------------------------
# Badge Schemas
# -------------------------------------------------------------
class BadgeVerifyRequest(BaseModel):
    badge_id: str

class BadgeCreate(BaseModel):
    badge_id: str # e.g. H2S-BDG-000001
    worker_id: Optional[str] = None
    batch_no: Optional[str] = "BATCH-2026-Q3-A"
    manufactured_at: Optional[str] = None
    expires_at: Optional[str] = None
    status: Optional[str] = "VALID"
    calibration_version: Optional[str] = "CAL-v0.1-demo"

class BadgeUpdate(BaseModel):
    worker_id: Optional[str] = None
    status: Optional[str] = None
    expires_at: Optional[str] = None

class BadgeResponse(BaseModel):
    id: str
    badge_id: str
    worker_id: Optional[str] = None
    worker_name: Optional[str] = None
    batch_no: str
    manufactured_at: Optional[str] = None
    expires_at: Optional[str] = None
    status: str
    calibration_version: str
    created_at: Optional[str] = None

class BadgeLookupResponse(BaseModel):
    badge_id: str
    valid: bool
    status: str # VALID, EXPIRING_SOON, EXPIRED, UNREGISTERED
    worker_id: Optional[str] = None
    worker_name: Optional[str] = None
    employee_id: Optional[str] = None
    department: Optional[str] = None
    unit: Optional[str] = None
    shift: Optional[str] = None
    expires_at: Optional[str] = None
    calibration_version: str = "CAL-v0.1-demo"
    message: Optional[str] = None

# -------------------------------------------------------------
# Worker Schemas
# -------------------------------------------------------------
class WorkerCreate(BaseModel):
    name: str
    employee_id: str
    department: str
    unit: Optional[str] = "General Operations"
    shift: str = "Shift A"
    contact_phone: Optional[str] = None

class WorkerUpdate(BaseModel):
    name: Optional[str] = None
    employee_id: Optional[str] = None
    department: Optional[str] = None
    unit: Optional[str] = None
    shift: Optional[str] = None
    contact_phone: Optional[str] = None
    active_badge_id: Optional[str] = None

class WorkerResponse(BaseModel):
    id: str
    employee_id: str
    name: str
    department: str
    unit: Optional[str] = "General Operations"
    shift: str
    contact_phone: Optional[str] = None
    active_badge_id: Optional[str] = None
    badge_status: Optional[str] = "VALID"
    latest_reading: Optional[ReadingResponse] = None
    cumulative_shift_dose: Optional[float] = 0.0

class WorkerDetailResponse(BaseModel):
    worker: WorkerResponse
    badge: Optional[Dict[str, Any]] = None
    readings_history: List[ReadingResponse] = []
    total_cumulative_dose: float = 0.0
    lifetime_scans_count: int = 0
    exposure_trend: List[Dict[str, Any]] = []

# -------------------------------------------------------------
# Calibration Lab Schemas
# -------------------------------------------------------------
class CalibrationSampleCreate(BaseModel):
    sample_code: str
    chamber_run_id: str
    known_concentration_ppm: float
    exposure_duration_min: float
    known_dose_ppm_min: float
    temperature_c: float = 25.0
    humidity_pct: float = 50.0
    strip_age_days: float = 14.0
    observed_delta_e: float
    observed_L_star: float
    data_status: Optional[str] = "SIMULATED"

class CalibrationSampleResponse(BaseModel):
    id: str
    sample_code: str
    chamber_run_id: str
    known_concentration_ppm: float
    exposure_duration_min: float
    known_dose_ppm_min: float
    temperature_c: float
    humidity_pct: float
    strip_age_days: float
    observed_delta_e: float
    observed_L_star: float
    predicted_dose_ppm_min: float
    absolute_error: float
    relative_error_pct: float
    data_status: str = "SIMULATED"
    calibration_version: str = "CAL-v0.1-demo"
    created_at: Optional[str] = None

class CalibrationSummaryResponse(BaseModel):
    sample_count: int
    mae: float # Mean Absolute Error
    rmse: float # Root Mean Squared Error
    r_squared: float # Coefficient of determination
    mean_relative_error_pct: float
    calibration_version: str
    model_type: str
    status: str # SUFFICIENT_DATA, INSUFFICIENT_DATA
    scientific_notice: str
    samples: List[CalibrationSampleResponse] = []
