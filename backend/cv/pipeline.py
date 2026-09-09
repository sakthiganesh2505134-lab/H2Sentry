"""
H2Sentry Master Computer Vision & Exposure Analysis Pipeline
Integrates:
1. Image Quality Validation
2. Geometric Region Detection (Badge, Reference, Strip, Expiry)
3. Reference Color Scale Calibration
4. Color Extraction (RGB, HSV, CIE L*a*b*, ΔE, Uniformity)
5. Expiry Reagent Evaluation
6. Quantitative Cumulative Dose Estimation
7. Confidence Scoring Engine
"""

import cv2
import numpy as np
import base64
import os
import time
from typing import Dict, Any, Optional, Union

from backend.cv.validation import evaluate_image_quality
from backend.cv.detector import detect_badge_regions
from backend.cv.calibrator import calibrate_reference_scale
from backend.cv.color_extractor import extract_strip_color_features, evaluate_expiry_indicator
from backend.cv.exposure_engine import estimate_cumulative_dose
from backend.cv.confidence import calculate_confidence_score

def image_to_base64(img: np.ndarray, quality: int = 85) -> str:
    """Encodes OpenCV BGR image to base64 JPEG string."""
    if img is None or img.size == 0:
        return ""
    success, buffer = cv2.imencode('.jpg', img, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
    if not success:
        return ""
    return f"data:image/jpeg;base64,{base64.b64encode(buffer).decode('utf-8')}"

def run_dosimeter_analysis_pipeline(
    image_input: Union[np.ndarray, bytes, str],
    temperature_c: float = 25.0,
    humidity_pct: float = 50.0,
    strip_age_days: float = 14.0,
    badge_id_hint: Optional[str] = None
) -> Dict[str, Any]:
    """
    Main entry point for processing a dosimeter badge photograph.
    """
    t_start = time.perf_counter()
    all_warnings = []
    
    # 1. Load / Decode Image
    if isinstance(image_input, str):
        if not os.path.exists(image_input):
            return {"success": False, "error": f"Image file not found: {image_input}"}
        img = cv2.imread(image_input)
    elif isinstance(image_input, bytes):
        nparr = np.frombuffer(image_input, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    elif isinstance(image_input, np.ndarray):
        img = image_input.copy()
    else:
        return {"success": False, "error": "Unsupported image input format."}

    if img is None or img.size == 0:
        return {"success": False, "error": "Image could not be decoded."}

    # 2. Stage 1: Image Quality Assessment
    quality_result = evaluate_image_quality(img)
    if quality_result.get("warnings"):
        all_warnings.extend(quality_result["warnings"])
    if not quality_result.get("valid", True):
        issue_str = ", ".join(quality_result.get("issues", ["Poor lighting or blur."]))
        return {
            "success": False,
            "error": f"STRIP IMAGE NOT READABLE: {issue_str}",
            "image_quality": quality_result
        }

    # 3. Stage 2: Region Detection
    detection_result = detect_badge_regions(img)
    if not detection_result.success:
        return {
            "success": False,
            "error": "REACTION STRIP NOT DETECTED: Failed to detect dosimeter reaction zone.",
            "image_quality": quality_result
        }

    # 4. Stage 3: Color Calibration (Digital Model / Physical Reference if Present)
    ref_crop = detection_result.cropped_regions.get("reference")
    calibrator = calibrate_reference_scale(ref_crop)
    if calibrator.warnings:
        all_warnings.extend(calibrator.warnings)

    # 5. Stage 4: Color Feature Extraction
    strip_crop = detection_result.cropped_regions.get("reaction_strip")
    color_features = extract_strip_color_features(strip_crop, calibrator)
    if not color_features.get("success", False):
        return {
            "success": False,
            "error": "REACTION STRIP NOT DETECTED: Chemical reaction strip not detected or unreadable. Please align the strip inside the framing guide.",
            "image_quality": quality_result,
            "detections": detection_result.to_dict()
        }

    # 6. Stage 5: Expiry Indicator Analysis
    expiry_crop = detection_result.cropped_regions.get("expiry")
    expiry_result = evaluate_expiry_indicator(expiry_crop, calibrator)
    expiry_status = expiry_result.get("status", "UNKNOWN")

    # 7. Stage 6: Cumulative Dose Estimation
    exposure_result = estimate_cumulative_dose(
        color_features=color_features,
        temperature_c=temperature_c,
        humidity_pct=humidity_pct,
        strip_age_days=strip_age_days
    )
    if exposure_result.get("warnings"):
        all_warnings.extend(exposure_result["warnings"])

    # 8. Stage 7: Confidence Calculation
    has_physical_ref = (ref_crop is not None and getattr(calibrator, "calibration_mode", "") == "PHYSICAL_REFERENCE_SCALE")
    confidence_result = calculate_confidence_score(
        image_quality=quality_result,
        detection_confidences=detection_result.confidences,
        calibration_quality=calibrator.calibration_quality,
        uniformity_score=color_features.get("uniformity_score", 0.8),
        expiry_status=expiry_status,
        has_physical_reference=has_physical_ref
    )
    if confidence_result.get("warnings"):
        all_warnings.extend(confidence_result["warnings"])

    if confidence_result.get("confidence", 1.0) < 0.20:
        return {
            "success": False,
            "error": "READING COULD NOT BE CONFIRMED: Confidence score below minimum validation threshold.",
            "image_quality": quality_result,
            "detections": detection_result.to_dict(),
            "confidence": confidence_result
        }

    # 9. Pipeline Duration
    duration_ms = round((time.perf_counter() - t_start) * 1000.0, 1)

    # 10. Generate Annotated Visual Overlays
    annotated_b64 = image_to_base64(detection_result.annotated_image)
    ref_b64 = image_to_base64(ref_crop)
    strip_b64 = image_to_base64(strip_crop)
    expiry_b64 = image_to_base64(expiry_crop)

    return {
        "success": True,
        "processing_time_ms": duration_ms,
        "image_quality": quality_result,
        "detections": detection_result.to_dict(),
        "color_calibration": calibrator.to_dict(),
        "color_features": color_features,
        "expiry": expiry_result,
        "exposure": exposure_result,
        "confidence": confidence_result,
        "annotated_image_base64": annotated_b64,
        "cropped_regions_base64": {
            "reference": ref_b64,
            "reaction_strip": strip_b64,
            "expiry": expiry_b64
        },
        "warnings": list(dict.fromkeys(all_warnings)) # deduplicate
    }
