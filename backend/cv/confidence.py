"""
H2Sentry Confidence Engine
Calculates a multi-factor confidence rating [0.0 - 1.0] for the quantitative reading.

Components:
1. Image Quality (Sharpness, illumination, resolution) - 25%
2. Reference Scale Detection Confidence - 20%
3. Reaction Strip Detection Confidence - 20%
4. Optical Reference Calibration Fit Quality - 15%
5. Chemical Reaction Uniformity - 10%
6. Expiry Status Validity - 10% (Severe penalty if badge is expired)
"""

from typing import Dict, Any, List

def calculate_confidence_score(
    image_quality: Dict[str, Any],
    detection_confidences: Dict[str, float],
    calibration_quality: float,
    uniformity_score: float,
    expiry_status: str
) -> Dict[str, Any]:
    """
    Computes weighted confidence score and detailed factor breakdown.
    """
    factors: Dict[str, Any] = {}
    warnings: List[str] = []
    
    # 1. Image Quality Factor [0.0 - 1.0]
    img_q = float(image_quality.get("score", 0.0))
    factors["image_quality"] = {
        "score": round(img_q, 3),
        "weight": 0.25,
        "description": "Image sharpness, dynamic range, and illumination stability."
    }
    
    # 2. Reference Scale Detection Factor
    ref_det = float(detection_confidences.get("reference", 0.0))
    factors["reference_detection"] = {
        "score": round(ref_det, 3),
        "weight": 0.20,
        "description": "Geometric and optical identification of the 6-patch reference target."
    }
    
    # 3. Reaction Strip Detection Factor
    strip_det = float(detection_confidences.get("reaction_strip", 0.0))
    factors["reaction_strip_detection"] = {
        "score": round(strip_det, 3),
        "weight": 0.20,
        "description": "Segmentation and boundary isolation of the active chemical membrane."
    }
    
    # 4. Calibration Fit Quality Factor
    cal_q = max(0.0, min(1.0, float(calibration_quality)))
    factors["color_calibration"] = {
        "score": round(cal_q, 3),
        "weight": 0.15,
        "description": "Least-squares lighting transformation matrix accuracy."
    }
    
    # 5. Chemical Uniformity Factor
    unif_q = max(0.0, min(1.0, float(uniformity_score)))
    factors["spatial_uniformity"] = {
        "score": round(unif_q, 3),
        "weight": 0.10,
        "description": "Homogeneity of reagent color across the central sensing aperture."
    }
    
    # 6. Expiry Factor
    if expiry_status == "VALID":
        exp_factor = 1.0
    elif expiry_status == "EXPIRING_SOON":
        exp_factor = 0.80
        warnings.append("Dosimeter approaching expiration. Confidence slightly reduced.")
    elif expiry_status == "EXPIRED":
        exp_factor = 0.20 # Severe confidence penalty
        warnings.append("CRITICAL: Badge chemistry is expired. Quantitative exposure reading is untrustworthy.")
    else:
        exp_factor = 0.50
        
    factors["badge_validity"] = {
        "score": round(exp_factor, 3),
        "weight": 0.10,
        "description": "Chemical shelf-life indicator integrity."
    }

    # Base weighted sum
    raw_confidence = (
        img_q * 0.25 +
        ref_det * 0.20 +
        strip_det * 0.20 +
        cal_q * 0.15 +
        unif_q * 0.10 +
        exp_factor * 0.10
    )

    # If badge is expired or image is invalid, cap confidence
    if expiry_status == "EXPIRED":
        raw_confidence = min(0.35, raw_confidence)
    if not image_quality.get("valid", True):
        raw_confidence = min(0.40, raw_confidence)
        
    confidence = round(max(0.05, min(0.99, raw_confidence)), 3)
    confidence_pct = round(confidence * 100.0, 1)

    # Qualitative rating
    if confidence >= 0.88:
        rating = "EXCELLENT"
        rating_color = "emerald"
    elif confidence >= 0.72:
        rating = "GOOD"
        rating_color = "cyan"
    elif confidence >= 0.55:
        rating = "MODERATE"
        rating_color = "amber"
    else:
        rating = "LOW"
        rating_color = "rose"

    return {
        "confidence": confidence,
        "confidence_pct": confidence_pct,
        "rating": rating,
        "rating_color": rating_color,
        "factors": factors,
        "warnings": warnings
    }
