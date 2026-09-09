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
    expiry_status: str,
    has_physical_reference: bool = False
) -> Dict[str, Any]:
    """
    Computes weighted confidence score and detailed factor breakdown.
    Supports standard digital model calibration (no physical scale penalty)
    and physical reference target calibration.
    """
    factors: Dict[str, Any] = {}
    warnings: List[str] = []
    
    # 1. Image Quality Factor [0.0 - 1.0]
    img_q = float(image_quality.get("score", 0.0))
    
    # 2. Reaction Strip Detection Factor
    strip_det = float(detection_confidences.get("reaction_strip", 0.0))
    
    # 3. Calibration Fit Quality Factor
    cal_q = max(0.0, min(1.0, float(calibration_quality)))
    
    # 4. Chemical Uniformity Factor
    unif_q = max(0.0, min(1.0, float(uniformity_score)))
    
    # 5. Expiry Factor
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

    if has_physical_reference:
        ref_det = float(detection_confidences.get("reference", 0.0))
        factors["image_quality"] = {
            "score": round(img_q, 3),
            "weight": 0.25,
            "description": "Image sharpness, dynamic range, and illumination stability."
        }
        factors["reference_detection"] = {
            "score": round(ref_det, 3),
            "weight": 0.20,
            "description": "Physical reference scale optical segmentation."
        }
        factors["reaction_strip_detection"] = {
            "score": round(strip_det, 3),
            "weight": 0.20,
            "description": "Segmentation and boundary isolation of the active chemical membrane."
        }
        factors["color_calibration"] = {
            "score": round(cal_q, 3),
            "weight": 0.15,
            "description": "Least-squares optical lighting matrix fit quality."
        }
        raw_confidence = (
            img_q * 0.25 +
            ref_det * 0.20 +
            strip_det * 0.20 +
            cal_q * 0.15 +
            unif_q * 0.10 +
            exp_factor * 0.10
        )
    else:
        # Standard H2Sentry Wristband (Digital Reference Scale & Software Calibration)
        factors["image_quality"] = {
            "score": round(img_q, 3),
            "weight": 0.30,
            "description": "Image sharpness, dynamic range, and illumination stability."
        }
        factors["reaction_strip_detection"] = {
            "score": round(strip_det, 3),
            "weight": 0.30,
            "description": "Segmentation and boundary isolation of the active chemical membrane."
        }
        factors["color_calibration"] = {
            "score": round(cal_q, 3),
            "weight": 0.20,
            "description": "Digital model baseline calibration & software normalization."
        }
        raw_confidence = (
            img_q * 0.30 +
            strip_det * 0.30 +
            cal_q * 0.20 +
            unif_q * 0.10 +
            exp_factor * 0.10
        )

    factors["spatial_uniformity"] = {
        "score": round(unif_q, 3),
        "weight": 0.10,
        "description": "Homogeneity of reagent color across the sensing aperture."
    }
    factors["badge_validity"] = {
        "score": round(exp_factor, 3),
        "weight": 0.10,
        "description": "Chemical shelf-life indicator integrity."
    }

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
