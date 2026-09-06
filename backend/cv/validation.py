"""
H2Sentry Image Quality Engine
Assesses:
- Resolution & aspect ratio
- Brightness / exposure levels (overexposed / underexposed)
- Contrast / dynamic range
- Sharpness / Blur (Laplacian variance)
- Glare / saturation hotspots
"""

import cv2
import numpy as np
from typing import Dict, Any, List

def evaluate_image_quality(img: np.ndarray) -> Dict[str, Any]:
    """
    Evaluates an input image and returns a quality score [0.0 - 1.0],
    validity flag, and specific actionable issue diagnostics.
    """
    issues: List[str] = []
    warnings: List[str] = []
    
    if img is None or img.size == 0:
        return {
            "valid": False,
            "score": 0.0,
            "issues": ["Image could not be loaded or is empty."],
            "warnings": [],
            "metrics": {}
        }
        
    h, w = img.shape[:2]
    
    # 1. Resolution Check
    min_width, min_height = 320, 240
    res_score = min(1.0, (w * h) / (640 * 480))
    if w < min_width or h < min_height:
        issues.append(f"Image resolution ({w}x{h}) is below minimum requirement ({min_width}x{min_height}).")

    # Convert to Grayscale & YCrCb
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # 2. Blur / Sharpness Check (Laplacian Variance)
    laplacian = cv2.Laplacian(gray, cv2.CV_64F)
    blur_variance = float(laplacian.var())
    # Normal in-focus threshold ~ 70+
    blur_threshold = 70.0
    if blur_variance < 35.0:
        issues.append("Image is excessively blurry. Please hold camera steady and tap to focus.")
        sharpness_score = max(0.1, blur_variance / blur_threshold)
    elif blur_variance < blur_threshold:
        warnings.append("Slight focus degradation detected. Dose estimation may have reduced precision.")
        sharpness_score = 0.6 + 0.4 * (blur_variance / blur_threshold)
    else:
        sharpness_score = 1.0

    # 3. Brightness & Exposure Check
    mean_brightness = float(np.mean(gray))
    std_brightness = float(np.std(gray))
    
    # Check clipping / severe blowout (254-255 saturated blowout)
    hist = cv2.calcHist([gray], [0], None, [256], [0, 256])
    total_pixels = w * h
    dark_clipped = float(np.sum(hist[:10]) / total_pixels)
    severe_glare_clipped = float(np.sum(hist[254:]) / total_pixels)
    
    if mean_brightness < 40.0 or dark_clipped > 0.55:
        issues.append("Image is severely underexposed (too dark). Increase ambient lighting.")
        brightness_score = max(0.1, mean_brightness / 40.0)
    elif severe_glare_clipped > 0.45:
        issues.append("Image has severe specular glare/washout. Avoid direct flash reflections.")
        brightness_score = 0.3
    elif mean_brightness < 70.0:
        warnings.append("Low ambient lighting detected. Optical reference scale correction active.")
        brightness_score = 0.85
    elif mean_brightness > 235.0:
        warnings.append("High ambient brightness detected.")
        brightness_score = 0.88
    else:
        brightness_score = 1.0

    # 4. Contrast Check
    if std_brightness < 15.0:
        issues.append("Image has extremely low contrast / dynamic range.")
        contrast_score = max(0.2, std_brightness / 15.0)
    elif std_brightness < 30.0:
        warnings.append("Moderate contrast detected.")
        contrast_score = 0.80
    else:
        contrast_score = 1.0

    # Composite Quality Score (Weighted Average)
    weights = [0.20, 0.35, 0.30, 0.15]
    scores = [res_score, sharpness_score, brightness_score, contrast_score]
    composite_score = float(np.dot(weights, scores))
    composite_score = round(max(0.05, min(1.0, composite_score)), 3)

    is_valid = len(issues) == 0 and composite_score >= 0.45

    return {
        "valid": is_valid,
        "score": composite_score,
        "issues": issues,
        "warnings": warnings,
        "metrics": {
            "width": w,
            "height": h,
            "blur_variance": round(blur_variance, 1),
            "mean_brightness": round(mean_brightness, 1),
            "contrast_std": round(std_brightness, 1),
            "dark_clip_pct": round(dark_clipped * 100.0, 1),
            "glare_clip_pct": round(severe_glare_clipped * 100.0, 1),
            "sharpness_score": round(sharpness_score, 2),
            "brightness_score": round(brightness_score, 2),
            "contrast_score": round(contrast_score, 2)
        }
    }
