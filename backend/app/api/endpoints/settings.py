"""
Settings and Safety Threshold Configuration Endpoints
"""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

# Default In-Memory / Configurable State
SYSTEM_SETTINGS = {
    "organization_name": "Mangalore Refinery and Petrochemicals Limited (MRPL)",
    "plant_unit": "Mangalore Refinery Complex - Area IV (Sulfur Block)",
    "calibration_version": "prototype-kinetic-v1.2",
    "cv_engine_version": "OpenCV-4.x Native Matrix Calibrator",
    "thresholds": {
        "osha_8hr_pel_ppm": 20.0,
        "niosh_ceiling_ppm": 10.0,
        "acgih_tlv_twa_ppm": 1.0,
        "acgih_stel_ppm": 5.0,
        "dose_low_limit_ppm_min": 300.0,
        "dose_moderate_limit_ppm_min": 1000.0,
        "dose_high_limit_ppm_min": 2400.0
    },
    "environmental_defaults": {
        "default_temp_c": 28.0,
        "default_humidity_pct": 65.0,
        "default_strip_age_days": 14.0
    },
    "scientific_disclaimer": (
        "H2Sentry utilizes optical diffusion-reaction kinetics to compute cumulative occupational "
        "dosimetry. In compliance with industrial safety protocols, this software provides digital "
        "records and must be calibrated with certified gas-chamber test matrices."
    )
}

class SettingsUpdate(BaseModel):
    organization_name: str
    plant_unit: str
    thresholds: dict
    environmental_defaults: dict

@router.get("")
def get_settings():
    return SYSTEM_SETTINGS

@router.post("")
def update_settings(payload: SettingsUpdate):
    SYSTEM_SETTINGS["organization_name"] = payload.organization_name
    SYSTEM_SETTINGS["plant_unit"] = payload.plant_unit
    SYSTEM_SETTINGS["thresholds"].update(payload.thresholds)
    SYSTEM_SETTINGS["environmental_defaults"].update(payload.environmental_defaults)
    return {
        "success": True,
        "message": "Settings updated successfully.",
        "settings": SYSTEM_SETTINGS
    }
