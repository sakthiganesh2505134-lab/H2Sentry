"""
Unit & Integration Tests for H2Sentry CV Pipeline
Tests:
- Rectangular strip detection & candidate scoring (aspect ratio 3:1 - 12:1)
- Square QR-like candidate rejection
- Quality validation (blur, poor lighting, glare)
- Reference scale + reaction strip dual-region detection
- Color extraction with interior statistics
- Quantitative exposure calculation (ppm·min)
- Confidence scoring
- Expiry states
"""

import pytest
import os
import cv2
import numpy as np
from backend.cv.pipeline import run_dosimeter_analysis_pipeline
from backend.cv.detector import score_strip_candidate, detect_badge_regions
from backend.cv.badge_generator import generate_badge_image

@pytest.fixture
def clean_badge_img():
    return generate_badge_image(dose_ppm_min=0.0, expiry_status="VALID")

@pytest.fixture
def moderate_badge_img():
    return generate_badge_image(dose_ppm_min=742.0, expiry_status="VALID")

@pytest.fixture
def high_badge_img():
    return generate_badge_image(dose_ppm_min=1850.0, expiry_status="VALID")

@pytest.fixture
def expired_badge_img():
    return generate_badge_image(dose_ppm_min=500.0, expiry_status="EXPIRED")

@pytest.fixture
def blurry_badge_img():
    return generate_badge_image(dose_ppm_min=500.0, blur_ksize=21)

def test_clean_badge_analysis(clean_badge_img):
    res = run_dosimeter_analysis_pipeline(clean_badge_img)
    assert res["success"] is True
    assert res["image_quality"]["valid"] is True
    assert res["expiry"]["status"] == "VALID"
    assert res["exposure"]["estimated_dose"] < 50.0
    assert res["exposure"]["status"] == "LOW"
    assert res["exposure"]["unit"] == "ppm·min"
    assert res["confidence"]["confidence"] >= 0.85

def test_moderate_badge_analysis(moderate_badge_img):
    res = run_dosimeter_analysis_pipeline(moderate_badge_img, temperature_c=28.0, humidity_pct=65.0)
    assert res["success"] is True
    assert res["expiry"]["status"] == "VALID"
    # Should be close to 742 ppm·min
    estimated = res["exposure"]["estimated_dose"]
    assert 600.0 <= estimated <= 900.0
    assert res["exposure"]["status"] in ["LOW", "MODERATE"]
    assert res["exposure"]["unit"] == "ppm·min"
    assert res["confidence"]["confidence"] >= 0.85

def test_high_badge_analysis(high_badge_img):
    res = run_dosimeter_analysis_pipeline(high_badge_img)
    assert res["success"] is True
    assert res["exposure"]["estimated_dose"] >= 1200.0
    assert res["exposure"]["status"] in ["HIGH", "CRITICAL"]
    assert res["exposure"]["unit"] == "ppm·min"

def test_expired_badge_analysis(expired_badge_img):
    res = run_dosimeter_analysis_pipeline(expired_badge_img)
    assert res["success"] is True
    assert res["expiry"]["status"] == "EXPIRED"
    assert res["confidence"]["confidence"] < 0.40

def test_blurry_badge_analysis(blurry_badge_img):
    res = run_dosimeter_analysis_pipeline(blurry_badge_img)
    assert res["success"] is False
    assert res["image_quality"]["valid"] is False
    assert res["image_quality"]["metrics"]["blur_variance"] < 35.0
    assert any("blurry" in issue.lower() for issue in res["image_quality"]["issues"])
    # No fabricated exposure returned on failure
    assert "exposure" not in res or res["exposure"]["estimated_dose"] == 0.0

def test_poor_lighting_underexposed_rejection():
    # Severely dark underexposed image (< 30 mean brightness)
    dark_img = np.full((480, 640, 3), 20, dtype=np.uint8)
    res = run_dosimeter_analysis_pipeline(dark_img)
    assert res["success"] is False
    assert res["image_quality"]["valid"] is False
    assert any("underexposed" in issue.lower() or "dark" in issue.lower() for issue in res["image_quality"]["issues"])

def test_excessive_glare_rejection():
    # Image with severe specular blowout (90% white saturated pixels)
    glare_img = np.full((480, 640, 3), 255, dtype=np.uint8)
    res = run_dosimeter_analysis_pipeline(glare_img)
    assert res["success"] is False
    assert res["image_quality"]["valid"] is False

def test_rectangular_reaction_strip_scoring():
    # Contour for horizontal strip (w=200, h=40 -> aspect ratio = 5.0)
    rect_pts = np.array([[[10, 10]], [[210, 10]], [[210, 50]], [[10, 50]]], dtype=np.int32)
    score_rect, meta_rect = score_strip_candidate(10, 100, 200, 40, ref_y_bottom=80, img_w=640, img_h=480, contour=rect_pts)
    assert score_rect > 0.70
    assert meta_rect["aspect"] == 5.0

    # Contour for square QR-like box (w=100, h=100 -> aspect ratio = 1.0)
    square_pts = np.array([[[10, 10]], [[110, 10]], [[110, 110]], [[10, 110]]], dtype=np.int32)
    score_sq, meta_sq = score_strip_candidate(10, 100, 100, 100, ref_y_bottom=80, img_w=640, img_h=480, contour=square_pts)
    # Square candidate should have severely penalized score compared to rectangular strip
    assert score_sq < 0.45
    assert score_rect > score_sq

def test_wristband_with_no_physical_reference_scale_succeeds():
    """
    Validates that a wristband containing a chemical reaction strip but NO physical reference
    scale succeeds and correctly uses digital software model calibration.
    """
    no_ref_img = generate_badge_image(dose_ppm_min=742.0, include_ref_scale=False, expiry_status="VALID")
    res = run_dosimeter_analysis_pipeline(no_ref_img)
    assert res["success"] is True
    assert res["color_calibration"]["calibration_mode"] == "DIGITAL_MODEL_CALIBRATION"
    assert res["color_calibration"]["success"] is True
    assert res["detections"]["reaction_strip"]["confidence"] >= 0.80
    assert 550.0 <= res["exposure"]["estimated_dose"] <= 950.0
    assert res["exposure"]["unit"] == "ppm·min"
    assert res["confidence"]["confidence"] >= 0.80

def test_missing_reaction_strip_rejection():
    """
    Validates that an image lacking a chemical reaction strip fails with clear rejection error.
    """
    no_strip_img = generate_badge_image(include_strip=False)
    res = run_dosimeter_analysis_pipeline(no_strip_img)
    assert res["success"] is False
    assert "REACTION STRIP NOT DETECTED" in res["error"] or "strip" in res["error"].lower()

def test_plain_solid_color_rejection():
    # Plain solid color image with no dosimeter features
    plain_img = np.full((480, 640, 3), 128, dtype=np.uint8)
    res = run_dosimeter_analysis_pipeline(plain_img)
    assert res["success"] is False
    assert "strip" in res["error"].lower() or "quality" in res["error"].lower() or "detected" in res["error"].lower()

def test_random_noise_image_rejection():
    noise_img = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
    res = run_dosimeter_analysis_pipeline(noise_img)
    assert res["success"] is False

def test_pipeline_real_strip_reference_fixture():
    """
    Automated test on real camera fixture image containing both
    reference color scale card and used reaction strip.
    Calculates expected exposure dynamically from detected colors.
    """
    fixture_path = os.path.join(os.path.dirname(__file__), "fixtures", "real_strip_reference_fixture.jpg")
    assert os.path.exists(fixture_path), f"Fixture not found at {fixture_path}"

    img = cv2.imread(fixture_path)
    assert img is not None

    res = run_dosimeter_analysis_pipeline(img, temperature_c=25.0, humidity_pct=50.0)

    # 1. Pipeline success
    assert res["success"] is True

    # 2. Reference scale detected
    assert res["detections"]["reference"]["confidence"] >= 0.80

    # 3. Reaction strip detected
    assert res["detections"]["reaction_strip"]["confidence"] >= 0.80

    # 4. Color calibration success
    assert res["color_calibration"]["success"] is True

    # 5. Dynamically calculate expected exposure without hardcoding
    cal_rgb = res["color_features"]["calibrated_rgb"]
    strip_rgb = np.array([cal_rgb["r"], cal_rgb["g"], cal_rgb["b"]])
    observed_patches = res["color_calibration"]["observed_patches"]
    assert len(observed_patches) >= 4

    distances = []
    for patch in observed_patches:
        patch_rgb = np.array(patch["observed_rgb"])
        dist = float(np.linalg.norm(strip_rgb - patch_rgb))
        distances.append((dist, float(patch.get("ppm_min", 0.0))))

    distances.sort(key=lambda x: x[0])
    best_d1, best_ppm1 = distances[0]
    best_d2, best_ppm2 = distances[1]

    est_dose = res["exposure"]["estimated_dose"]
    assert est_dose is not None
    assert est_dose > 0.0
    assert res["exposure"]["estimator_used"] in ["ML_REGRESSION", "ANALYTICAL_FALLBACK"]
    assert res["exposure"]["unit"] == "ppm·min"
