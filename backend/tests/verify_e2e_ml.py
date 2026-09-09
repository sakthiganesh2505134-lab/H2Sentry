"""
End-to-End Verification for H2Sentry ML Integration & Analysis Pipeline
"""

import os
import sys
import cv2
from fastapi.testclient import TestClient

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.app.main import app

def run_verification():
    client = TestClient(app)

    print("=== 1. Testing Clean Baseline Badge (0 ppm·min) ===")
    res0 = client.post("/api/cv/analyze", data={"demo_preset_id": "badge_baseline_0ppm"})
    assert res0.status_code == 200, res0.text
    d0 = res0.json()
    print(f"  Estimated Dose: {d0['exposure']['estimated_dose']} ppm·min")
    print(f"  Status: {d0['exposure']['status']}")
    print(f"  Estimator: {d0['exposure']['estimator_used']}")
    print(f"  Confidence: {d0['confidence']['confidence_pct']}%")
    assert d0["exposure"]["estimated_dose"] == 0.0

    print("\n=== 2. Testing Moderate Badge (742 ppm·min) ===")
    res_mod = client.post("/api/cv/analyze", data={"demo_preset_id": "badge_moderate_742ppm"})
    assert res_mod.status_code == 200, res_mod.text
    d_mod = res_mod.json()
    print(f"  Estimated Dose: {d_mod['exposure']['estimated_dose']} ppm·min")
    print(f"  Status: {d_mod['exposure']['status']}")
    print(f"  Estimator: {d_mod['exposure']['estimator_used']}")
    print(f"  Confidence: {d_mod['confidence']['confidence_pct']}%")
    assert 680 <= d_mod["exposure"]["estimated_dose"] <= 800

    print("\n=== 3. Testing High Badge (1850 ppm·min) ===")
    res_high = client.post("/api/cv/analyze", data={"demo_preset_id": "badge_high_1850ppm"})
    assert res_high.status_code == 200, res_high.text
    d_high = res_high.json()
    print(f"  Estimated Dose: {d_high['exposure']['estimated_dose']} ppm·min")
    print(f"  Status: {d_high['exposure']['status']}")
    print(f"  Estimator: {d_high['exposure']['estimator_used']}")
    print(f"  Confidence: {d_high['confidence']['confidence_pct']}%")
    assert d_high["exposure"]["estimated_dose"] >= 1650

    print("\n=== 4. Testing Upload of Newly Generated Synthetic Dataset Test Image ===")
    test_img_path = os.path.join(PROJECT_ROOT, "data", "calibration", "synthetic_wristband_dataset", "test", "img_test_0001_var01.png")
    assert os.path.exists(test_img_path), f"Test image not found: {test_img_path}"
    with open(test_img_path, "rb") as f:
        file_bytes = f.read()
    files = {"file": ("img_test_0001_var01.png", file_bytes, "image/png")}
    res_custom = client.post("/api/cv/analyze", files=files)
    assert res_custom.status_code == 200, res_custom.text
    d_custom = res_custom.json()
    print(f"  Estimated Dose: {d_custom['exposure']['estimated_dose']} ppm·min")
    print(f"  Status: {d_custom['exposure']['status']}")
    print(f"  Estimator: {d_custom['exposure']['estimator_used']}")
    print(f"  Confidence: {d_custom['confidence']['confidence_pct']}%")

    print("\n=== 5. Testing Rejection Engine on Blurry Badge ===")
    res_blur = client.post("/api/cv/analyze", data={"demo_preset_id": "badge_blurry"})
    print(f"  HTTP Status: {res_blur.status_code}, Detail: {res_blur.json().get('detail')}")
    assert res_blur.status_code == 422

    print("\n=== 6. Testing Rejection Engine on Missing Reference Scale ===")
    res_noref = client.post("/api/cv/analyze", data={"demo_preset_id": "badge_missing_reference"})
    print(f"  HTTP Status: {res_noref.status_code}, Detail: {res_noref.json().get('detail')}")
    assert res_noref.status_code == 422

    print("\n=== 7. Testing Rejection Engine on Missing Reaction Strip ===")
    res_nostrip = client.post("/api/cv/analyze", data={"demo_preset_id": "badge_missing_strip"})
    print(f"  HTTP Status: {res_nostrip.status_code}, Detail: {res_nostrip.json().get('detail')}")
    assert res_nostrip.status_code == 422

    print("\n========================================================")
    print("ALL END-TO-END VERIFICATION CHECKS PASSED SUCCESSFULLY!")
    print("========================================================")

if __name__ == "__main__":
    run_verification()
