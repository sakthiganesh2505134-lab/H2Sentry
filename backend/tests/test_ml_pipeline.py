"""
H2Sentry ML Pipeline & Exposure Engine Integration Tests
"""

import os
import sys
import pytest
import numpy as np
import cv2

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.cv.badge_generator import dose_to_strip_color
from backend.cv.detector import detect_badge_regions
from backend.cv.calibrator import calibrate_reference_scale
from backend.cv.color_extractor import extract_strip_color_features, rgb_to_cielab
from backend.cv.exposure_engine import estimate_cumulative_dose
from backend.ml.predictor import H2SCalibrationPredictor, get_ml_predictor
from backend.cv.pipeline import run_dosimeter_analysis_pipeline

def test_dose_to_strip_color_monotonicity():
    """Validates that color channels darken monotonically with increasing synthetic dose."""
    doses = [0.0, 50.0, 150.0, 300.0, 742.0, 1200.0, 1850.0, 2500.0]
    prev_r, prev_g, prev_b = 255, 255, 255
    for d in doses:
        r, g, b = dose_to_strip_color(d)
        assert r <= prev_r, f"R channel increased at dose {d}"
        assert g <= prev_g, f"G channel increased at dose {d}"
        assert b <= prev_b, f"B channel increased at dose {d}"
        prev_r, prev_g, prev_b = r, g, b

def test_cielab_conversion():
    """Validates standard sRGB to CIE L*a*b* conversion."""
    # Pure white
    L, a, b = rgb_to_cielab(255, 255, 255)
    assert L > 99.0
    assert abs(a) < 2.0
    assert abs(b) < 2.0
    
    # Dark brown / near saturated
    L_sat, a_sat, b_sat = rgb_to_cielab(35, 25, 18)
    assert L_sat < 20.0

def test_exposure_engine_fallback_when_features_empty():
    """Validates graceful fallback when color features are invalid."""
    empty_feat = {"success": False}
    res = estimate_cumulative_dose(empty_feat)
    assert res["estimated_dose"] == 0.0
    assert res["status"] == "UNKNOWN"

def test_physical_strip_dimensions():
    """Validates physical strip image generation aspect ratio (2:1)."""
    from backend.ml.generate_synthetic_wristband_dataset import generate_physical_strip_image
    strip_img = generate_physical_strip_image(742.0, width=1600, height=800)
    assert strip_img.shape[1] / strip_img.shape[0] == 2.0
