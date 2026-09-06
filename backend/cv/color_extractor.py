"""
H2Sentry Color Extraction & Feature Generation Engine
Extracts region-level optical features from:
1. H2S Reaction Chemical Exposure Strip (Robust Interior Statistical Sampling)
2. Shelf-Life Expiry Indicator

Features:
- Robust Interior Sampling (excludes border adhesive, glare hotspots, deep shadows)
- Calibrated Mean & Median RGB (Trimmed distributions)
- HSV Color Space (Hue, Saturation, Value)
- CIE 1976 L*a*b* Perceptual Color Space (D65 White Point)
- Delta-E (ΔE*ab) Color Distance from Unexposed Baseline
- Spatial Uniformity & Signal-to-Noise Metric
- Expiry Reagent State Classification
"""

import cv2
import numpy as np
from typing import Dict, Any, Tuple, List, Optional
from backend.cv.calibrator import ReferenceCalibrationResult

# Standard unexposed baseline blank substrate color in CIE Lab space
UNEXPOSED_BASELINE_LAB = np.array([96.0, 0.5, 9.0]) # Light cream substrate
UNEXPOSED_BASELINE_RGB = np.array([245.0, 240.0, 222.0])

def rgb_to_cielab(r: float, g: float, b: float) -> Tuple[float, float, float]:
    """
    Converts sRGB [0-255] color to standard CIE L*a*b* using D65 reference white.
    """
    # 1. Normalize sRGB to [0, 1] & apply inverse gamma companding
    rgb = np.array([r, g, b]) / 255.0
    mask = rgb > 0.04045
    rgb[mask] = ((rgb[mask] + 0.055) / 1.055) ** 2.4
    rgb[~mask] = rgb[~mask] / 12.92
    
    # 2. Linear sRGB to CIE XYZ matrix (D65 illuminant)
    M_srgb_xyz = np.array([
        [0.4124564, 0.3575761, 0.1804375],
        [0.2126729, 0.7151522, 0.0721750],
        [0.0193339, 0.1191920, 0.9503041]
    ])
    xyz = M_srgb_xyz @ rgb
    
    # 3. Reference D65 White Point
    xn, yn, zn = 0.95047, 1.00000, 1.08883
    x_r, y_r, z_r = xyz[0] / xn, xyz[1] / yn, xyz[2] / zn
    
    # 4. XYZ to Lab transfer function
    def f(t):
        return t ** (1.0 / 3.0) if t > 0.008856 else (7.787 * t) + (16.0 / 116.0)
    
    fx, fy, fz = f(x_r), f(y_r), f(z_r)
    
    L = max(0.0, min(100.0, (116.0 * fy) - 16.0))
    a = (500.0 * (fx - fy))
    b = (200.0 * (fy - fz))
    
    return (round(float(L), 2), round(float(a), 2), round(float(b), 2))

def compute_delta_e_cielab(lab1: Tuple[float, float, float], lab2: Tuple[float, float, float]) -> float:
    """
    Computes Euclidean CIE 1976 ΔE*ab color difference.
    ΔE = sqrt((ΔL*)^2 + (Δa*)^2 + (Δb*)^2)
    """
    dL = lab1[0] - lab2[0]
    da = lab1[1] - lab2[1]
    db = lab1[2] - lab2[2]
    return round(float(np.sqrt(dL**2 + da**2 + db**2)), 2)

def extract_strip_interior_stats(roi: np.ndarray) -> Tuple[float, float, float, float, float, float]:
    """
    Extracts trimmed-mean / median statistics from a rectangular interior strip ROI,
    filtering out top/bottom glare highlights (top 5% luminance) and extreme shadows (bottom 5%).
    Returns (raw_b, raw_g, raw_r, std_b, std_g, std_r).
    """
    if roi is None or roi.size == 0:
        return (0.0, 0.0, 0.0, 0.0, 0.0, 0.0)

    # Flatten pixels
    b_flat = roi[:, :, 0].astype(np.float32).flatten()
    g_flat = roi[:, :, 1].astype(np.float32).flatten()
    r_flat = roi[:, :, 2].astype(np.float32).flatten()
    
    lum = 0.299 * r_flat + 0.587 * g_flat + 0.114 * b_flat
    
    # Exclude glare (> 95th percentile luminance) and deep edge shadows (< 5th percentile)
    p5 = np.percentile(lum, 5)
    p95 = np.percentile(lum, 95)
    valid_mask = (lum >= p5) & (lum <= p95)
    
    if np.sum(valid_mask) > 10:
        b_clean = b_flat[valid_mask]
        g_clean = g_flat[valid_mask]
        r_clean = r_flat[valid_mask]
    else:
        b_clean, g_clean, r_clean = b_flat, g_flat, r_flat
        
    med_b = float(np.median(b_clean))
    med_g = float(np.median(g_clean))
    med_r = float(np.median(r_clean))
    
    std_b = float(np.std(b_clean))
    std_g = float(np.std(g_clean))
    std_r = float(np.std(r_clean))
    
    return (med_b, med_g, med_r, std_b, std_g, std_r)

def extract_strip_color_features(
    strip_crop: np.ndarray,
    calibrator: ReferenceCalibrationResult
) -> Dict[str, Any]:
    """
    Extracts calibrated statistical color features from the interior of the reaction strip ROI.
    Avoids borders and edges that may contain printing, adhesive, or background contamination.
    """
    if strip_crop is None or strip_crop.size == 0:
        return {
            "success": False,
            "error": "Reaction strip crop is empty"
        }

    sh, sw = strip_crop.shape[:2]
    aspect = sw / max(1, sh)
    
    # 1. Interior Region Sampling (trim top/bottom borders by 20% to eliminate adhesive/substrate bleed)
    y_min = int(sh * 0.20)
    y_max = int(sh * 0.80)
    
    if aspect > 2.5:
        # Elongated horizontal strip: evaluate multiple segments to isolate the active chemical exposure zone
        num_slices = 5
        slice_w = sw // num_slices
        slices = []
        for i in range(num_slices):
            # Avoid horizontal outer edges on leftmost / rightmost slices
            x_left = i * slice_w
            x_right = (i + 1) * slice_w
            if i == 0:
                x_left = int(x_left + slice_w * 0.15)
            if i == num_slices - 1:
                x_right = int(x_right - slice_w * 0.15)

            s_roi = strip_crop[y_min:y_max, x_left:x_right]
            if s_roi.size > 0:
                med_b, med_g, med_r, std_b, std_g, std_r = extract_strip_interior_stats(s_roi)
                darkness = med_r + med_g + med_b
                slices.append((darkness, s_roi, med_b, med_g, med_r, std_b, std_g, std_r))
        
        if slices:
            # Select the segment representing the active reacted zone (lowest luminance / highest chemical darkening)
            best_slice = min(slices, key=lambda s: s[0])
            raw_b_med = best_slice[2]
            raw_g_med = best_slice[3]
            raw_r_med = best_slice[4]
            raw_b_std = best_slice[5]
            raw_g_std = best_slice[6]
            raw_r_std = best_slice[7]
        else:
            roi = strip_crop[y_min:y_max, int(sw * 0.20):int(sw * 0.80)]
            raw_b_med, raw_g_med, raw_r_med, raw_b_std, raw_g_std, raw_r_std = extract_strip_interior_stats(roi)
    else:
        # Central interior 60% window
        cx_start, cx_end = int(sw * 0.20), int(sw * 0.80)
        roi = strip_crop[y_min:y_max, cx_start:cx_end]
        raw_b_med, raw_g_med, raw_r_med, raw_b_std, raw_g_std, raw_r_std = extract_strip_interior_stats(roi)
    
    # 2. Lighting-Calibrated RGB (using reference matrix)
    cal_r, cal_g, cal_b = calibrator.calibrate_color_rgb((raw_b_med, raw_g_med, raw_r_med))
    
    # 3. HSV Representation
    cal_rgb_mat = np.uint8([[[int(cal_r), int(cal_g), int(cal_b)]]])
    hsv_mat = cv2.cvtColor(cal_rgb_mat, cv2.COLOR_RGB2HSV)[0][0]
    hue = float(hsv_mat[0] * 2.0) # 0-360 degrees
    sat = round(float(hsv_mat[1] / 255.0 * 100.0), 1) # 0-100%
    val = round(float(hsv_mat[2] / 255.0 * 100.0), 1) # 0-100%
    
    # 4. CIE L*a*b* Perceptual Representation
    L_star, a_star, b_star = rgb_to_cielab(cal_r, cal_g, cal_b)
    
    # 5. Delta-E Color Distance from unexposed virgin substrate
    delta_e = compute_delta_e_cielab((L_star, a_star, b_star), tuple(UNEXPOSED_BASELINE_LAB))
    
    # 6. Spatial Uniformity Score (0.0 to 1.0)
    mean_std = (raw_r_std + raw_g_std + raw_b_std) / 3.0
    uniformity = max(0.1, min(1.0, 1.0 - (mean_std / 35.0)))

    # 7. Chemical Membrane Presence Validation
    has_chemical_membrane = (b_star >= 2.5 or (cal_r >= cal_b + 8.0) or L_star < 85.0) and mean_std < 55.0
    if not has_chemical_membrane:
        return {
            "success": False,
            "error": "Chemical reaction strip not detected or unreadable."
        }
    
    return {
        "success": True,
        "raw_rgb": {
            "r": round(raw_r_med, 1),
            "g": round(raw_g_med, 1),
            "b": round(raw_b_med, 1)
        },
        "calibrated_rgb": {
            "r": round(cal_r, 1),
            "g": round(cal_g, 1),
            "b": round(cal_b, 1)
        },
        "cumulative_scale_reference": calibrator.cumulative_scale_swatches,
        "hsv": {
            "hue_deg": round(hue, 1),
            "saturation_pct": sat,
            "value_pct": val
        },
        "cielab": {
            "L_star": L_star,
            "a_star": a_star,
            "b_star": b_star
        },
        "delta_e_baseline": delta_e,
        "uniformity_score": round(uniformity, 3),
        "noise_std": round(mean_std, 2)
    }

def evaluate_expiry_indicator(
    expiry_crop: np.ndarray,
    calibrator: ReferenceCalibrationResult
) -> Dict[str, Any]:
    """
    Evaluates the chemical shelf-life expiry indicator dot.
    States:
    - VALID: Green reagent window (Active shelf-life)
    - EXPIRING_SOON: Amber/Yellow reagent window (Approaching end-of-life)
    - EXPIRED: Red/Magenta reagent window (Inactive / Invalidated chemistry)
    - UNKNOWN: Insufficient optical contrast
    """
    if expiry_crop is None or expiry_crop.size == 0:
        return {
            "status": "UNKNOWN",
            "confidence": 0.0,
            "description": "Expiry region could not be evaluated.",
            "color_rgb": [0, 0, 0]
        }

    eh, ew = expiry_crop.shape[:2]
    # Sample central 40% window (the indicator circle)
    cy_start, cy_end = int(eh * 0.30), int(eh * 0.70)
    cx_start, cx_end = int(ew * 0.30), int(ew * 0.70)
    roi = expiry_crop[cy_start:cy_end, cx_start:cx_end]
    
    raw_b, raw_g, raw_r, _, _, _ = extract_strip_interior_stats(roi)
    cal_r, cal_g, cal_b = calibrator.calibrate_color_rgb((raw_b, raw_g, raw_r))
    
    # Calculate dominant chromatic properties
    if cal_g > (cal_r + 30.0) and cal_g > (cal_b + 30.0):
        status = "VALID"
        confidence = 0.96
        desc = "Dosimeter chemical shelf-life is VALID and active."
    elif cal_r > (cal_g + 45.0) and cal_r > (cal_b + 45.0):
        status = "EXPIRED"
        confidence = 0.98
        desc = "Dosimeter chemical shelf-life has EXPIRED. Replace badge before taking quantitative reading."
    elif cal_r > 160.0 and cal_g > 110.0 and cal_b < 90.0:
        status = "EXPIRING_SOON"
        confidence = 0.88
        desc = "Dosimeter is EXPIRING SOON. Schedule badge replacement."
    else:
        if cal_g >= cal_r:
            status = "VALID"
            confidence = 0.85
            desc = "Dosimeter chemical shelf-life is nominally VALID."
        else:
            status = "EXPIRED"
            confidence = 0.90
            desc = "Dosimeter chemical shelf-life appears EXPIRED."

    return {
        "status": status,
        "confidence": confidence,
        "description": desc,
        "calibrated_rgb": [round(cal_r, 1), round(cal_g, 1), round(cal_b, 1)]
    }
