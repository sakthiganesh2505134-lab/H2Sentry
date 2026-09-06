"""
End-to-End Integration Workflow Test for H2Sentry
Simulates full end-to-end user lifecycle:
1. Health check & system diagnostics
2. Demo badge listing
3. CV optical analysis of all 7 demo badge scenarios
4. Saving analysis results to workforce dossier
5. Verifying dashboard statistics update
6. Inspecting worker exposure trend history
7. Calibration laboratory statistical benchmark verification & sample addition
"""

import uuid
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_e2e_full_workflow():
    # 1. Health Diagnostic
    res_health = client.get("/api/health")
    assert res_health.status_code == 200
    health_data = res_health.json()
    assert health_data["status"] == "HEALTHY"
    assert "opencv_version" in health_data

    # 2. Get Synthetic Demo Badges
    res_badges = client.get("/api/cv/demo-badges")
    assert res_badges.status_code == 200
    badges = res_badges.json()
    assert len(badges) >= 7

    # 3. Analyze Baseline 0 ppm Badge
    res_0ppm = client.post("/api/cv/analyze-json", json={
        "demo_preset_id": "badge_baseline_0ppm",
        "temperature_c": 25.0,
        "humidity_pct": 50.0,
        "strip_age_days": 14.0
    })
    assert res_0ppm.status_code == 200
    data_0 = res_0ppm.json()
    assert data_0["success"] is True
    assert data_0["exposure"]["estimated_dose"] <= 50.0
    assert data_0["exposure"]["status"] == "LOW"
    assert data_0["expiry"]["status"] == "VALID"

    # 4. Analyze Moderate 742 ppm Badge under Tropical Conditions (29°C, 70% RH)
    res_742 = client.post("/api/cv/analyze-json", json={
        "demo_preset_id": "badge_moderate_742ppm",
        "temperature_c": 29.0,
        "humidity_pct": 70.0,
        "strip_age_days": 20.0
    })
    assert res_742.status_code == 200
    data_742 = res_742.json()
    assert data_742["success"] is True
    assert 600.0 <= data_742["exposure"]["estimated_dose"] <= 900.0
    assert data_742["confidence"]["confidence"] >= 0.85

    # 5. Analyze Expired Badge
    res_exp = client.post("/api/cv/analyze-json", json={
        "demo_preset_id": "badge_expired",
        "temperature_c": 25.0,
        "humidity_pct": 50.0
    })
    assert res_exp.status_code == 200
    data_exp = res_exp.json()
    assert data_exp["expiry"]["status"] == "EXPIRED"
    assert data_exp["confidence"]["confidence"] <= 0.40 # Heavy penalty for expired chemistry

    # 6. Analyze Poor Lighting / Warm Tint Badge (Validates Matrix Normalization)
    res_warm = client.post("/api/cv/analyze-json", json={
        "demo_preset_id": "badge_poor_lighting",
        "temperature_c": 25.0,
        "humidity_pct": 50.0
    })
    assert res_warm.status_code == 200
    data_warm = res_warm.json()
    assert data_warm["success"] is True
    assert data_warm["color_calibration"]["success"] is True

    # 7. Analyze Blurry Badge (Strict Rejection Engine)
    res_blur = client.post("/api/cv/analyze-json", json={
        "demo_preset_id": "badge_blurry",
        "temperature_c": 25.0,
        "humidity_pct": 50.0
    })
    assert res_blur.status_code == 422
    err_blur = res_blur.json()
    assert "blurry" in err_blur["detail"].lower() or "quality" in err_blur["detail"].lower()

    # 8. Save New Reading to Workforce Dossier
    res_save = client.post("/api/readings", json={
        "worker_id": "w-01",
        "badge_id": "MRPL-H2S-8821",
        "shift": "Shift A",
        "temperature_c": 29.0,
        "humidity_pct": 70.0,
        "strip_age_days": 20.0,
        "estimated_dose": data_742["exposure"]["estimated_dose"],
        "equivalent_8h_twa_ppm": data_742["exposure"]["equivalent_8h_twa_ppm"],
        "dose_unit": "ppm·min",
        "confidence": data_742["confidence"]["confidence"],
        "status": data_742["exposure"]["status"],
        "expiry_status": data_742["expiry"]["status"],
        "image_quality_score": data_742["image_quality"]["score"],
        "image_quality_valid": data_742["image_quality"]["valid"],
        "source": "DEMO_PRESET"
    })
    assert res_save.status_code == 200
    saved_reading = res_save.json()
    assert saved_reading["worker_id"] == "w-01"

    # 9. Verify Dashboard Statistics Update
    res_dash = client.get("/api/readings/stats/dashboard")
    assert res_dash.status_code == 200
    dash = res_dash.json()
    assert dash["active_workers_count"] >= 10
    assert len(dash["recent_readings"]) > 0

    # 10. Check Worker Detail History
    res_worker = client.get("/api/workers/w-01")
    assert res_worker.status_code == 200
    worker_dossier = res_worker.json()
    assert worker_dossier["worker"]["name"] == "Rajesh Kumar"
    assert len(worker_dossier["readings_history"]) >= 2

    # 11. Verify Calibration Lab Benchmarks
    res_cal = client.get("/api/calibration/summary")
    assert res_cal.status_code == 200
    cal_summary = res_cal.json()
    assert cal_summary["sample_count"] >= 10
    assert cal_summary["r_squared"] > 0.95
    assert "mae" in cal_summary
    assert "rmse" in cal_summary

    # 12. Add New Calibration Test Point with unique sample code
    unique_code = f"MRPL-CHAMBER-{uuid.uuid4().hex[:6].upper()}"
    res_add_cal = client.post("/api/calibration/samples", json={
        "sample_code": unique_code,
        "chamber_run_id": "RUN-2026-CH-09",
        "known_concentration_ppm": 2.5,
        "exposure_duration_min": 180.0,
        "known_dose_ppm_min": 450.0,
        "temperature_c": 25.0,
        "humidity_pct": 50.0,
        "strip_age_days": 14.0,
        "observed_delta_e": 28.5,
        "observed_L_star": 72.0
    })
    assert res_add_cal.status_code == 200
    new_sample = res_add_cal.json()
    assert new_sample["sample_code"] == unique_code
    assert new_sample["known_dose_ppm_min"] == 450.0
