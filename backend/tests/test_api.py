"""
Integration Tests for H2Sentry FastAPI REST API
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database.seed import seed_database

@pytest.fixture(autouse=True, scope="module")
def setup_test_db():
    seed_database()

client = TestClient(app)

def test_api_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "HEALTHY"
    assert "opencv_version" in data

def test_demo_badges_list():
    res = client.get("/api/cv/demo-badges")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 5
    assert any("742" in item["title"] or "Moderate" in item["title"] for item in data)

def test_cv_analyze_json_demo_preset():
    res = client.post("/api/cv/analyze-json", json={
        "demo_preset_id": "badge_moderate_742ppm",
        "temperature_c": 28.0,
        "humidity_pct": 65.0
    })
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["exposure"]["estimated_dose"] > 500.0
    assert data["expiry"]["status"] == "VALID"
    assert data["confidence"]["confidence"] > 0.80

def test_get_dashboard_stats():
    res = client.get("/api/readings/stats/dashboard")
    assert res.status_code == 200
    data = res.json()
    assert data["active_workers_count"] >= 10
    assert data["valid_badges_count"] >= 5
    assert len(data["recent_readings"]) > 0

def test_get_workers_list():
    res = client.get("/api/workers")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 10
    assert "employee_id" in data[0]

def test_get_worker_detail():
    res = client.get("/api/workers/w-01")
    assert res.status_code == 200
    data = res.json()
    assert data["worker"]["name"] == "Rajesh Kumar"
    assert len(data["readings_history"]) > 0

def test_calibration_summary():
    res = client.get("/api/calibration/summary")
    assert res.status_code == 200
    data = res.json()
    assert data["sample_count"] > 0
    assert data["r_squared"] > 0.90
    assert "mae" in data
    assert "rmse" in data

def test_save_new_reading():
    res = client.post("/api/readings", json={
        "worker_id": "w-01",
        "badge_id": "MRPL-H2S-8821",
        "shift": "Shift A",
        "temperature_c": 29.0,
        "humidity_pct": 65.0,
        "strip_age_days": 15.0,
        "estimated_dose": 742.0,
        "equivalent_8h_twa_ppm": 1.55,
        "dose_unit": "ppm·min",
        "confidence": 0.94,
        "status": "MODERATE",
        "expiry_status": "VALID",
        "image_quality_score": 0.95,
        "image_quality_valid": True,
        "data_status": "SIMULATED",
        "source": "DEMO_PRESET"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["estimated_dose"] == 742.0
    assert data["worker_id"] == "w-01"
    assert data["data_status"] == "SIMULATED"

def test_badge_lookup():
    res = client.get("/api/badges/lookup/H2S-BDG-2026-000381")
    assert res.status_code == 200
    data = res.json()
    assert data["badge_id"] == "H2S-BDG-2026-000381"
    assert data["valid"] is True
    assert data["worker_name"] == "Rajesh Kumar"

def test_badge_verify_post_valid():
    res = client.post("/api/badges/verify", json={"badge_id": "H2S-BDG-2026-000381"})
    assert res.status_code == 200
    data = res.json()
    assert data["valid"] is True
    assert data["status"] == "VALID"

def test_badge_verify_random_qr_rejected():
    # Random URL
    res1 = client.post("/api/badges/verify", json={"badge_id": "https://google.com"})
    assert res1.status_code == 200
    assert res1.json()["valid"] is False
    assert res1.json()["status"] == "UNREGISTERED"

    # Random text / UPI payment string
    res2 = client.post("/api/badges/verify", json={"badge_id": "upi://pay?pa=test@okaxis"})
    assert res2.status_code == 200
    assert res2.json()["valid"] is False
    assert res2.json()["status"] == "UNREGISTERED"

def test_badge_lookup_expired():
    res = client.get("/api/badges/lookup/MRPL-H2S-4019")
    assert res.status_code == 200
    data = res.json()
    assert data["valid"] is False
    assert data["status"] == "EXPIRED"

def test_badge_lookup_unregistered():
    res = client.get("/api/badges/lookup/UNKNOWN-BADGE-999")
    assert res.status_code == 200
    data = res.json()
    assert data["valid"] is False
    assert data["status"] == "UNREGISTERED"

def test_worker_crud_and_badge_assignment():
    # 1. Create worker
    res = client.post("/api/workers", json={
        "name": "Arun Kumar",
        "employee_id": "MRPL-W-001",
        "department": "Operations",
        "unit": "CDU-1",
        "shift": "Shift A"
    })
    assert res.status_code == 200
    worker_data = res.json()
    worker_id = worker_data["id"]
    assert worker_data["name"] == "Arun Kumar"
    assert worker_data["employee_id"] == "MRPL-W-001"

    # 2. Assign Badge
    res_b = client.post("/api/badges", json={
        "badge_id": "H2S-BDG-000001",
        "worker_id": worker_id,
        "batch_no": "BATCH-2026-Q3-A",
        "status": "VALID"
    })
    assert res_b.status_code == 200
    badge_data = res_b.json()
    assert badge_data["id"] == "H2S-BDG-000001"
    assert badge_data["worker_id"] == worker_id

    # 3. Lookup Badge resolves to new worker
    res_l = client.get("/api/badges/lookup/H2S-BDG-000001")
    assert res_l.status_code == 200
    lookup_data = res_l.json()
    assert lookup_data["worker_id"] == worker_id
    assert lookup_data["worker_name"] == "Arun Kumar"
    assert lookup_data["employee_id"] == "MRPL-W-001"
    assert lookup_data["valid"] is True

def test_demo_reset_and_clean_acceptance():
    # Reset to 0 workers
    res = client.post("/api/demo/reset")
    assert res.status_code == 200
    data = res.json()
    assert data["counts"]["workers"] == 0
    assert data["counts"]["readings"] == 0

    # Verify workers list is empty
    res_w = client.get("/api/workers")
    assert res_w.status_code == 200
    assert len(res_w.json()) == 0

    # Re-seed for demo mode
    res_s = client.post("/api/demo/seed")
    assert res_s.status_code == 200
    assert res_s.json()["counts"]["workers"] >= 10

def test_cv_analyze_missing_reference_scale_rejected():
    res = client.post("/api/cv/analyze-json", json={
        "demo_preset_id": "badge_missing_reference",
        "temperature_c": 25.0,
        "humidity_pct": 50.0
    })
    assert res.status_code == 422
    data = res.json()
    assert "reference" in data["detail"].lower()

def test_cv_analyze_missing_strip_rejected():
    res = client.post("/api/cv/analyze-json", json={
        "demo_preset_id": "badge_missing_strip",
        "temperature_c": 25.0,
        "humidity_pct": 50.0
    })
    assert res.status_code == 422
    data = res.json()
    assert "strip" in data["detail"].lower() or "chemical" in data["detail"].lower()

def test_cv_analyze_multipart_file_upload():
    import cv2
    from backend.cv.badge_generator import generate_badge_image
    img = generate_badge_image(dose_ppm_min=742.0)
    _, buffer = cv2.imencode(".jpg", img)
    
    files = {"file": ("badge.jpg", buffer.tobytes(), "image/jpeg")}
    data = {"temperature_c": "28.0", "humidity_pct": "60.0", "badge_id_hint": "H2S-BDG-2026-000381"}
    
    res = client.post("/api/cv/analyze", files=files, data=data)
    assert res.status_code == 200
    res_data = res.json()
    assert res_data["success"] is True
    assert res_data["exposure"]["estimated_dose"] > 500.0
    assert res_data["color_calibration"]["success"] is True

def test_cv_analyze_real_fixture_image():
    """
    Automated test for /api/cv/analyze using the physical test fixture image
    (reference color scale and reaction strip in the same frame).
    Calculates the expected exposure dynamically from the detected strip and reference colors.
    """
    import os
    import numpy as np

    fixture_path = os.path.join(os.path.dirname(__file__), "fixtures", "real_strip_reference_fixture.jpg")
    assert os.path.exists(fixture_path), f"Fixture image not found at {fixture_path}"

    with open(fixture_path, "rb") as f:
        file_bytes = f.read()

    files = {"file": ("real_strip_reference_fixture.jpg", file_bytes, "image/jpeg")}
    data = {"temperature_c": "25.0", "humidity_pct": "50.0"}

    res = client.post("/api/cv/analyze", files=files, data=data)
    assert res.status_code == 200
    res_data = res.json()

    # 1. Pipeline success
    assert res_data["success"] is True

    # 2. Reference scale detected
    assert res_data["detections"]["reference"]["confidence"] >= 0.80

    # 3. Reaction strip detected
    assert res_data["detections"]["reaction_strip"]["confidence"] >= 0.80

    # 4. Color calibration success
    assert res_data["color_calibration"]["success"] is True

    # 5. Calculate expected exposure dynamically from detected strip and reference colors (no hardcoding)
    cal_rgb = res_data["color_features"]["calibrated_rgb"]
    strip_rgb = np.array([cal_rgb["r"], cal_rgb["g"], cal_rgb["b"]])
    observed_patches = res_data["color_calibration"]["observed_patches"]
    assert len(observed_patches) >= 4

    distances = []
    for patch in observed_patches:
        patch_rgb = np.array(patch["observed_rgb"])
        dist = float(np.linalg.norm(strip_rgb - patch_rgb))
        distances.append((dist, float(patch.get("ppm_min", 0.0))))

    distances.sort(key=lambda x: x[0])
    best_d1, best_ppm1 = distances[0]
    best_d2, best_ppm2 = distances[1]

    w1 = 1.0 / max(0.1, best_d1)
    w2 = 1.0 / max(0.1, best_d2)
    expected_calculated_dose = round(float((w1 * best_ppm1 + w2 * best_ppm2) / (w1 + w2)), 1)

    api_dose = res_data["exposure"]["estimated_dose"]
    assert api_dose is not None
    assert api_dose > 0.0
    assert abs(api_dose - expected_calculated_dose) <= 0.5


