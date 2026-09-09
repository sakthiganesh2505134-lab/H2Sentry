"""
H2Sentry Exposure Estimation Engine
Translates calibrated colorimetric features into quantitative cumulative H2S dose (ppm·min).

Features:
- Primary Estimator: Machine Learning Calibration Regressor (GradientBoostingRegressor on OpenCV features)
- Fallback Estimator: Deterministic diffusion-reaction kinetics model (Dose = f(ΔE, L*, Calibrated RGB))
- Explicit environmental compensation layer (Temperature & Relative Humidity kinetics)
- Safety threshold categorization (LOW, MODERATE, HIGH, CRITICAL)
- Saturation detection & Out-of-range flag handling
- Transparent prototype calibration metadata & scientific disclosure
"""

import numpy as np
from typing import Dict, Any, List, Optional

from backend.ml.predictor import get_ml_predictor

CALIBRATION_MODEL_VERSION = "CAL-v1.0-ml-gbr"
CALIBRATION_DISCLOSURE = (
    "CAL-v1.0 prototype calibration. Quantitative cumulative dose is calculated using "
    "a trained GradientBoosting ML calibration model with analytical kinetic fallback. "
    "All values are synthetic software-validation data. Industrial regulatory deployment requires "
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
    and environmental parameters. Uses ML regressor as primary estimator with analytical fallback.
    """
    warnings: List[str] = []
    
    if not color_features.get("success", False):
        return {
            "estimated_dose": 0.0,
            "unit": "ppm·min",
            "status": "UNKNOWN",
            "status_code": "UNKNOWN",
            "status_description": "Color feature extraction failed.",
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
    
    estimator_used = "ANALYTICAL_FALLBACK"
    ml_details = None
    above_range = False
    response_state = "DYNAMIC_RESPONSE"

    # 1. Primary Estimator: Trained ML Model
    ml_predictor = get_ml_predictor()
    if ml_predictor.is_available:
        try:
            ml_res = ml_predictor.predict(
                color_features=color_features,
                temperature_c=temperature_c,
                humidity_pct=humidity_pct,
                strip_age_days=strip_age_days
            )
            if ml_res.get("success", False):
                estimated_dose = float(ml_res["predicted_dose_ppm_min"])
                estimator_used = "ML_REGRESSION"
                ml_details = ml_res
                above_range = ml_res.get("above_calibration_range", False)
                response_state = ml_res.get("response_state", "DYNAMIC_RESPONSE")
        except Exception as ml_err:
            warnings.append(f"ML estimation fallback triggered: {str(ml_err)}")

    # 2. Fallback Estimator: Analytical Kinetics / Piecewise Reference Interpolation
    if estimator_used == "ANALYTICAL_FALLBACK":
        cum_swatches = color_features.get("cumulative_scale_reference")
        if cum_swatches and len(cum_swatches) >= 4:
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
            r0, r_inf = 245.0, 35.0
            k_rate = 850.0
            rem_ratio = max(0.01, min(1.0, (r_cal - r_inf) / (r0 - r_inf)))
            raw_dose_r = -k_rate * np.log(rem_ratio)
            
            L0, L_inf = 96.0, 24.0
            L_ratio = max(0.01, min(1.0, (L_star - L_inf) / (L0 - L_inf)))
            raw_dose_L = -k_rate * np.log(L_ratio)
            
            blended_raw_dose = float(0.70 * raw_dose_r + 0.30 * raw_dose_L)
            if delta_e < 4.0 or blended_raw_dose < 20.0 or r_cal >= 244.0:
                blended_raw_dose = 0.0

        # Environmental compensation
        alpha_temp = 0.008
        beta_rh = 0.003
        temp_factor = 1.0 + alpha_temp * (temperature_c - 25.0)
        rh_factor = 1.0 + beta_rh * (humidity_pct - 50.0)
        age_factor = max(0.85, 1.0 - max(0.0, (strip_age_days - 30.0) * 0.002))
        env_compensation_factor = max(0.5, temp_factor * rh_factor * age_factor)
        
        estimated_dose = blended_raw_dose / env_compensation_factor
        estimated_dose = round(float(max(0.0, estimated_dose)), 1)
        if estimated_dose >= 2000.0:
            above_range = True
            response_state = "SATURATED"

    # Equivalent 8-hour Time-Weighted Average (TWA) concentration in ppm
    equiv_twa_ppm = round(estimated_dose / 480.0, 2)
    
    # 3. Safety Threshold Categorization
    if estimated_dose < 300.0:
        status = "LOW"
        status_code = "LOW"
        status_desc = "Occupational reference: Normal. Cumulative exposure is within nominal baseline shift reference."
    elif estimated_dose < 1000.0:
        status = "MODERATE"
        status_code = "MODERATE"
        status_desc = "Attention required. Elevated cumulative exposure. Review shift tasks and monitor ventilation in work area."
    elif estimated_dose < 2400.0:
        status = "HIGH"
        status_code = "HIGH"
        status_desc = "Requires supervisor review. Cumulative exposure exceeds OSHA/MRPL Action Level threshold."
        warnings.append("Cumulative exposure exceeds OSHA/MRPL Action Level threshold.")
    else:
        status = "CRITICAL"
        status_code = "CRITICAL"
        status_desc = "Emergency reference threshold reached. Urgent review and occupational health assessment recommended."
        warnings.append("Emergency reference: Critical cumulative H2S threshold breached.")

    if above_range:
        warnings.append("Reaction strip is near/at chemical saturation limit. Higher doses may have reduced differentiation.")

    return {
        "estimated_dose": estimated_dose,
        "unit": "ppm·min",
        "status": status,
        "status_code": status_code,
        "status_description": status_desc,
        "equivalent_8h_twa_ppm": equiv_twa_ppm,
        "estimator_used": estimator_used,
        "response_state": response_state,
        "above_calibration_range": above_range,
        "ml_details": ml_details,
        "calibration_version": CALIBRATION_MODEL_VERSION,
        "warnings": warnings,
        "environmental_factors": {
            "temperature_c": temperature_c,
            "humidity_pct": humidity_pct,
            "strip_age_days": strip_age_days
        },
        "scientific_disclosure": CALIBRATION_DISCLOSURE
    }
