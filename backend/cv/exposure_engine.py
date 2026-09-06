"""
H2Sentry Exposure Estimation Engine
Translates calibrated colorimetric features into quantitative cumulative H2S dose (ppm·min).

Features:
- Chemical diffusion-reaction kinetics model: Dose = f(ΔE, L*, Calibrated RGB)
- Explicit environmental compensation layer (Temperature & Relative Humidity kinetics)
- Safety threshold categorization (LOW, MODERATE, HIGH, CRITICAL)
- Transparent prototype calibration metadata & scientific disclosure
"""

import numpy as np
from typing import Dict, Any, List, Optional

CALIBRATION_MODEL_VERSION = "CAL-v0.1-demo"
CALIBRATION_DISCLOSURE = (
    "CAL-v0.1-demo prototype calibration. Quantitative cumulative dose is calculated using "
    "deterministic diffusion-reaction kinetics. Industrial regulatory deployment requires "
    "empirical gas-chamber multi-point laboratory calibration."
)

def estimate_cumulative_dose(
    color_features: Dict[str, Any],
    temperature_c: float = 25.0,
    humidity_pct: float = 50.0,
    strip_age_days: float = 14.0
) -> Dict[str, Any]:
    """
    Computes cumulative H2S exposure dose in ppm·min based on calibrated colorimetric features
    and environmental parameters.
    """
    warnings: List[str] = []
    
    if not color_features.get("success", False):
        return {
            "estimated_dose": 0.0,
            "unit": "ppm·min",
            "status": "UNKNOWN",
            "status_code": "UNKNOWN",
            "equivalent_8h_twa_ppm": 0.0,
            "calibration_version": CALIBRATION_MODEL_VERSION,
            "warnings": ["Color feature extraction failed."],
            "environmental_factors": {
                "temperature_c": temperature_c,
                "humidity_pct": humidity_pct,
                "compensation_factor": 1.0
            },
            "scientific_disclosure": CALIBRATION_DISCLOSURE
        }

    cielab = color_features.get("cielab", {})
    L_star = float(cielab.get("L_star", 96.0))
    cal_rgb = color_features.get("calibrated_rgb", {})
    r_cal = float(cal_rgb.get("r", 245.0))
    g_cal = float(cal_rgb.get("g", 240.0))
    b_cal = float(cal_rgb.get("b", 222.0))
    delta_e = float(color_features.get("delta_e_baseline", 0.0))
    
    cum_swatches = color_features.get("cumulative_scale_reference")
    if cum_swatches and len(cum_swatches) >= 4:
        # 1. Direct piecewise interpolation against detected physical reference color scale
        strip_rgb_arr = np.array([r_cal, g_cal, b_cal])
        distances = []
        for s in cum_swatches:
            s_rgb = np.array(s["observed_rgb"])
            d = float(np.linalg.norm(strip_rgb_arr - s_rgb))
            distances.append((d, float(s.get("ppm_min", 0.0))))
        
        distances.sort(key=lambda x: x[0])
        best_d1, best_ppm1 = distances[0]
        best_d2, best_ppm2 = distances[1]
        
        w1 = 1.0 / max(0.1, best_d1)
        w2 = 1.0 / max(0.1, best_d2)
        blended_raw_dose = float((w1 * best_ppm1 + w2 * best_ppm2) / (w1 + w2))
    else:
        # 1. Diffusion-Reaction Kinetic Model
        # Substrate limits: Unexposed (r0=245, g0=240, b0=222) -> Saturated (r_inf=35, g_inf=25, b_inf=18)
        r0, r_inf = 245.0, 35.0
        k_rate = 850.0 # Characteristic kinetic diffusion rate parameter
        
        # Kinetic channel inversion:
        rem_ratio = max(0.01, min(1.0, (r_cal - r_inf) / (r0 - r_inf)))
        raw_dose_r = -k_rate * np.log(rem_ratio)
        
        # Perceptual L* channel inversion:
        L0, L_inf = 96.0, 24.0
        L_ratio = max(0.01, min(1.0, (L_star - L_inf) / (L0 - L_inf)))
        raw_dose_L = -k_rate * np.log(L_ratio)
        
        # Blended primary raw dose
        blended_raw_dose = float(0.70 * raw_dose_r + 0.30 * raw_dose_L)
        if delta_e < 4.0 or blended_raw_dose < 20.0 or r_cal >= 244.0:
            blended_raw_dose = 0.0

    # 2. Environmental Compensation Layer
    # Standard baseline: 25°C, 50% RH, 14 days age
    alpha_temp = 0.008 # Arrhenius temperature sensitivity (+0.8% per °C)
    beta_rh = 0.003    # Porous matrix hydration sensitivity (+0.3% per %RH)
    
    temp_factor = 1.0 + alpha_temp * (temperature_c - 25.0)
    rh_factor = 1.0 + beta_rh * (humidity_pct - 50.0)
    
    # Strip age degradation factor (minor sensitivity drop after 30 days)
    age_factor = 1.0 - max(0.0, (strip_age_days - 30.0) * 0.002)
    age_factor = max(0.85, age_factor)
    
    env_compensation_factor = max(0.5, temp_factor * rh_factor * age_factor)
    
    # Compensated cumulative dose (ppm·min)
    estimated_dose = blended_raw_dose / env_compensation_factor
    estimated_dose = round(float(max(0.0, estimated_dose)), 1)
    
    # Equivalent 8-hour Time-Weighted Average (TWA) concentration in ppm
    # 8 hours = 480 minutes -> TWA = Dose / 480
    equiv_twa_ppm = round(estimated_dose / 480.0, 2)
    
    # 3. Safety Threshold Categorization
    if estimated_dose < 300.0:
        status = "LOW"
        status_code = "LOW"
        status_desc = "Safe occupational range. Cumulative exposure is well within normal shift limits."
    elif estimated_dose < 1000.0:
        status = "MODERATE"
        status_code = "MODERATE"
        status_desc = "Elevated exposure. Review shift tasks and monitor ventilation in work area."
    elif estimated_dose < 2400.0:
        status = "HIGH"
        status_code = "HIGH"
        status_desc = "Action Level Exceeded (OSHA/MRPL threshold). Industrial hygiene review required."
        warnings.append("Cumulative exposure exceeds OSHA/MRPL Action Level threshold.")
    else:
        status = "CRITICAL"
        status_code = "CRITICAL"
        status_desc = "CRITICAL EXPOSURE WARNING. Immediate medical evaluation and incident report mandatory."
        warnings.append("DANGER: Critical cumulative H2S threshold breached.")

    return {
        "estimated_dose": estimated_dose,
        "unit": "ppm·min",
        "status": status,
        "status_code": status_code,
        "status_description": status_desc,
        "equivalent_8h_twa_ppm": equiv_twa_ppm,
        "raw_dose_uncompensated": round(blended_raw_dose, 1),
        "calibration_version": CALIBRATION_MODEL_VERSION,
        "warnings": warnings,
        "environmental_factors": {
            "temperature_c": temperature_c,
            "humidity_pct": humidity_pct,
            "strip_age_days": strip_age_days,
            "compensation_factor": round(env_compensation_factor, 3),
            "temp_multiplier": round(temp_factor, 3),
            "humidity_multiplier": round(rh_factor, 3)
        },
        "scientific_disclosure": CALIBRATION_DISCLOSURE
    }
