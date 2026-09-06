"""
H2Sentry Database Seeder
Seeds realistic industrial demonstration data for MRPL refinery operations:
- 12 Workers across critical refinery units
- Active and historical dosimeter badges
- Exposure dosimetry reading history across shifts
- Controlled gas-chamber calibration benchmark dataset
"""

import json
from datetime import datetime, timedelta, timezone
from backend.app.database.database import engine, Base, SessionLocal
from backend.app.database.models import Worker, Badge, Reading, CalibrationSample

def seed_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    # 1. Seed Industrial Workers (Demo Scenario)
    workers_data = [
        {
            "id": "w-01",
            "employee_id": "MRPL-EMP-4091",
            "name": "Rajesh Kumar",
            "department": "Sulfur Recovery Unit (SRU-1)",
            "unit": "SRU-1",
            "shift": "Shift A (Morning 06:00 - 14:00)",
            "contact_phone": "+91 98450 12041",
            "active_badge_id": "MRPL-H2S-8821"
        },
        {
            "id": "w-02",
            "employee_id": "MRPL-EMP-4104",
            "name": "Ananya Sharma",
            "department": "Amine Treating & Gas Sweetening",
            "unit": "Amine-2",
            "shift": "Shift A (Morning 06:00 - 14:00)",
            "contact_phone": "+91 98450 12042",
            "active_badge_id": "MRPL-H2S-8822"
        },
        {
            "id": "w-03",
            "employee_id": "MRPL-EMP-3920",
            "name": "Vikram Patil",
            "department": "Crude Distillation Unit (CDU-2)",
            "unit": "CDU-2",
            "shift": "Shift B (Afternoon 14:00 - 22:00)",
            "contact_phone": "+91 98450 12043",
            "active_badge_id": "MRPL-H2S-8823"
        },
        {
            "id": "w-04",
            "employee_id": "MRPL-EMP-4512",
            "name": "Suresh Hegde",
            "department": "Delayed Coker Unit (DCU)",
            "unit": "DCU",
            "shift": "Shift C (Night 22:00 - 06:00)",
            "contact_phone": "+91 98450 12044",
            "active_badge_id": "MRPL-H2S-9302"
        },
        {
            "id": "w-05",
            "employee_id": "MRPL-EMP-3881",
            "name": "Pooja Nayak",
            "department": "Effluent Treatment Plant (ETP)",
            "unit": "ETP-1",
            "shift": "Shift A (Morning 06:00 - 14:00)",
            "contact_phone": "+91 98450 12045",
            "active_badge_id": "MRPL-H2S-8825"
        },
        {
            "id": "w-06",
            "employee_id": "MRPL-EMP-4219",
            "name": "Karthik Shenoy",
            "department": "Tank Farm & Flare Systems",
            "unit": "Flare Area",
            "shift": "Shift B (Afternoon 14:00 - 22:00)",
            "contact_phone": "+91 98450 12046",
            "active_badge_id": "MRPL-H2S-8826"
        },
        {
            "id": "w-07",
            "employee_id": "MRPL-EMP-4302",
            "name": "Mohammed Farooq",
            "department": "Hydrocracker Unit (HCU)",
            "unit": "HCU",
            "shift": "Shift A (Morning 06:00 - 14:00)",
            "contact_phone": "+91 98450 12047",
            "active_badge_id": "MRPL-H2S-8827"
        },
        {
            "id": "w-08",
            "employee_id": "MRPL-EMP-3995",
            "name": "Deepa Rao",
            "department": "Sour Water Stripper (SWS-2)",
            "unit": "SWS-2",
            "shift": "Shift C (Night 22:00 - 06:00)",
            "contact_phone": "+91 98450 12048",
            "active_badge_id": "MRPL-H2S-8828"
        },
        {
            "id": "w-09",
            "employee_id": "MRPL-EMP-4601",
            "name": "Ganesh Bhat",
            "department": "Sulfur Recovery Unit (SRU-2)",
            "unit": "SRU-2",
            "shift": "Shift B (Afternoon 14:00 - 22:00)",
            "contact_phone": "+91 98450 12049",
            "active_badge_id": "MRPL-H2S-8829"
        },
        {
            "id": "w-10",
            "employee_id": "MRPL-EMP-3740",
            "name": "Manoj Mendon",
            "department": "Bitumen Blowing Unit",
            "unit": "BBU",
            "shift": "Shift A (Morning 06:00 - 14:00)",
            "contact_phone": "+91 98450 12050",
            "active_badge_id": "MRPL-H2S-4019" # Expired badge assigned
        },
        {
            "id": "w-11",
            "employee_id": "MRPL-EMP-4780",
            "name": "Preeti Acharya",
            "department": "Quality Control & Sampling Lab",
            "unit": "QC Lab",
            "shift": "General Shift (09:00 - 17:30)",
            "contact_phone": "+91 98450 12051",
            "active_badge_id": "MRPL-H2S-8831"
        },
        {
            "id": "w-12",
            "employee_id": "MRPL-EMP-4822",
            "name": "Santosh D'Souza",
            "department": "Field Maintenance & Piping",
            "unit": "Maintenance",
            "shift": "Shift A (Morning 06:00 - 14:00)",
            "contact_phone": "+91 98450 12052",
            "active_badge_id": "MRPL-H2S-8832"
        }
    ]

    for w in workers_data:
        db.add(Worker(**w))
    db.commit()

    # 2. Seed Badges
    badges_data = [
        {
            "id": "H2S-BDG-2026-000381",
            "worker_id": "w-01",
            "batch_no": "BATCH-2026-Q3-A",
            "manufactured_at": now - timedelta(days=10),
            "expires_at": now + timedelta(days=80),
            "status": "VALID",
            "calibration_version": "CAL-v0.1-demo"
        },
        {
            "id": "H2S-BDG-000001",
            "worker_id": "w-01",
            "batch_no": "BATCH-2026-Q3-A",
            "manufactured_at": now - timedelta(days=10),
            "expires_at": now + timedelta(days=80),
            "status": "VALID",
            "calibration_version": "CAL-v0.1-demo"
        },
        {
            "id": "MRPL-H2S-8821",
            "worker_id": "w-01",
            "batch_no": "BATCH-2026-Q3-A",
            "manufactured_at": now - timedelta(days=20),
            "expires_at": now + timedelta(days=70),
            "status": "VALID",
            "calibration_version": "CAL-v0.1-demo"
        },
        {
            "id": "MRPL-H2S-8822",
            "worker_id": "w-02",
            "batch_no": "BATCH-2026-Q3-A",
            "manufactured_at": now - timedelta(days=20),
            "expires_at": now + timedelta(days=70),
            "status": "VALID",
            "calibration_version": "CAL-v0.1-demo"
        },
        {
            "id": "MRPL-H2S-8823",
            "worker_id": "w-03",
            "batch_no": "BATCH-2026-Q3-A",
            "manufactured_at": now - timedelta(days=15),
            "expires_at": now + timedelta(days=75),
            "status": "VALID",
            "calibration_version": "CAL-v0.1-demo"
        },
        {
            "id": "MRPL-H2S-9302",
            "worker_id": "w-04",
            "batch_no": "BATCH-2026-Q3-B",
            "manufactured_at": now - timedelta(days=12),
            "expires_at": now + timedelta(days=78),
            "status": "VALID",
            "calibration_version": "CAL-v0.1-demo"
        },
        {
            "id": "MRPL-H2S-8825",
            "worker_id": "w-05",
            "batch_no": "BATCH-2026-Q3-A",
            "manufactured_at": now - timedelta(days=25),
            "expires_at": now + timedelta(days=65),
            "status": "VALID",
            "calibration_version": "CAL-v0.1-demo"
        },
        {
            "id": "MRPL-H2S-8826",
            "worker_id": "w-06",
            "batch_no": "BATCH-2026-Q3-A",
            "manufactured_at": now - timedelta(days=85),
            "expires_at": now + timedelta(days=5),
            "status": "EXPIRING_SOON",
            "calibration_version": "CAL-v0.1-demo"
        },
        {
            "id": "MRPL-H2S-8827",
            "worker_id": "w-07",
            "batch_no": "BATCH-2026-Q3-B",
            "manufactured_at": now - timedelta(days=10),
            "expires_at": now + timedelta(days=80),
            "status": "VALID",
            "calibration_version": "CAL-v0.1-demo"
        },
        {
            "id": "MRPL-H2S-8828",
            "worker_id": "w-08",
            "batch_no": "BATCH-2026-Q3-B",
            "manufactured_at": now - timedelta(days=10),
            "expires_at": now + timedelta(days=80),
            "status": "VALID",
            "calibration_version": "CAL-v0.1-demo"
        },
        {
            "id": "MRPL-H2S-8829",
            "worker_id": "w-09",
            "batch_no": "BATCH-2026-Q3-A",
            "manufactured_at": now - timedelta(days=18),
            "expires_at": now + timedelta(days=72),
            "status": "VALID",
            "calibration_version": "CAL-v0.1-demo"
        },
        {
            "id": "MRPL-H2S-4019", # Expired badge
            "worker_id": "w-10",
            "batch_no": "BATCH-2026-Q1-OLD",
            "manufactured_at": now - timedelta(days=120),
            "expires_at": now - timedelta(days=15),
            "status": "EXPIRED",
            "calibration_version": "CAL-v0.1-demo"
        },
        {
            "id": "MRPL-H2S-8831",
            "worker_id": "w-11",
            "batch_no": "BATCH-2026-Q3-B",
            "manufactured_at": now - timedelta(days=8),
            "expires_at": now + timedelta(days=82),
            "status": "VALID",
            "calibration_version": "CAL-v0.1-demo"
        },
        {
            "id": "MRPL-H2S-8832",
            "worker_id": "w-12",
            "batch_no": "BATCH-2026-Q3-B",
            "manufactured_at": now - timedelta(days=8),
            "expires_at": now + timedelta(days=82),
            "status": "VALID",
            "calibration_version": "CAL-v0.1-demo"
        }
    ]

    for b in badges_data:
        db.add(Badge(**b))
    db.commit()

    # 3. Seed Exposure Readings History (Marked data_status="SIMULATED")
    readings_seed = [
        {
            "id": "scan-1001",
            "worker_id": "w-01",
            "badge_id": "MRPL-H2S-8821",
            "timestamp": now - timedelta(hours=1, minutes=15),
            "shift": "Shift A",
            "temperature_c": 29.0,
            "humidity_pct": 68.0,
            "strip_age_days": 20.0,
            "estimated_dose": 742.0,
            "equivalent_8h_twa_ppm": 1.55,
            "confidence": 0.94,
            "status": "MODERATE",
            "expiry_status": "VALID",
            "image_quality_score": 0.95,
            "image_quality_valid": True,
            "data_status": "SIMULATED",
            "calibration_version": "CAL-v0.1-demo",
            "source": "CAMERA",
            "warnings_json": json.dumps([]),
            "color_features_json": json.dumps({"cielab": {"L_star": 58.2, "a_star": 14.5, "b_star": 28.1}, "delta_e_baseline": 44.8})
        },
        {
            "id": "scan-1002",
            "worker_id": "w-02",
            "badge_id": "MRPL-H2S-8822",
            "timestamp": now - timedelta(hours=2, minutes=40),
            "shift": "Shift A",
            "temperature_c": 28.5,
            "humidity_pct": 65.0,
            "strip_age_days": 20.0,
            "estimated_dose": 185.0,
            "equivalent_8h_twa_ppm": 0.39,
            "confidence": 0.96,
            "status": "LOW",
            "expiry_status": "VALID",
            "image_quality_score": 0.97,
            "image_quality_valid": True,
            "data_status": "SIMULATED",
            "calibration_version": "CAL-v0.1-demo",
            "source": "CAMERA",
            "warnings_json": json.dumps([]),
            "color_features_json": json.dumps({"cielab": {"L_star": 86.4, "a_star": 3.8, "b_star": 14.2}, "delta_e_baseline": 12.1})
        },
        {
            "id": "scan-1003",
            "worker_id": "w-04",
            "badge_id": "MRPL-H2S-9302",
            "timestamp": now - timedelta(hours=4, minutes=10),
            "shift": "Shift C",
            "temperature_c": 26.0,
            "humidity_pct": 72.0,
            "strip_age_days": 12.0,
            "estimated_dose": 1850.0,
            "equivalent_8h_twa_ppm": 3.85,
            "confidence": 0.91,
            "status": "HIGH",
            "expiry_status": "VALID",
            "image_quality_score": 0.93,
            "image_quality_valid": True,
            "data_status": "SIMULATED",
            "calibration_version": "CAL-v0.1-demo",
            "source": "UPLOAD",
            "warnings_json": json.dumps(["Cumulative exposure exceeds OSHA/MRPL Action Level threshold."]),
            "color_features_json": json.dumps({"cielab": {"L_star": 36.1, "a_star": 18.2, "b_star": 22.4}, "delta_e_baseline": 68.9})
        },
        {
            "id": "scan-1004",
            "worker_id": "w-03",
            "badge_id": "MRPL-H2S-8823",
            "timestamp": now - timedelta(days=1, hours=3),
            "shift": "Shift B",
            "temperature_c": 31.0,
            "humidity_pct": 62.0,
            "strip_age_days": 14.0,
            "estimated_dose": 420.0,
            "equivalent_8h_twa_ppm": 0.88,
            "confidence": 0.93,
            "status": "MODERATE",
            "expiry_status": "VALID",
            "image_quality_score": 0.94,
            "image_quality_valid": True,
            "data_status": "SIMULATED",
            "calibration_version": "CAL-v0.1-demo",
            "source": "CAMERA",
            "warnings_json": json.dumps([]),
            "color_features_json": json.dumps({"cielab": {"L_star": 72.5, "a_star": 8.1, "b_star": 20.4}, "delta_e_baseline": 27.8})
        },
        {
            "id": "scan-1005",
            "worker_id": "w-05",
            "badge_id": "MRPL-H2S-8825",
            "timestamp": now - timedelta(days=1, hours=6),
            "shift": "Shift A",
            "temperature_c": 29.0,
            "humidity_pct": 70.0,
            "strip_age_days": 24.0,
            "estimated_dose": 120.0,
            "equivalent_8h_twa_ppm": 0.25,
            "confidence": 0.95,
            "status": "LOW",
            "expiry_status": "VALID",
            "image_quality_score": 0.96,
            "image_quality_valid": True,
            "data_status": "SIMULATED",
            "calibration_version": "CAL-v0.1-demo",
            "source": "CAMERA",
            "warnings_json": json.dumps([]),
            "color_features_json": json.dumps({"cielab": {"L_star": 89.1, "a_star": 2.2, "b_star": 11.5}, "delta_e_baseline": 8.4})
        },
        {
            "id": "scan-1006",
            "worker_id": "w-10",
            "badge_id": "MRPL-H2S-4019",
            "timestamp": now - timedelta(days=1, hours=8),
            "shift": "Shift A",
            "temperature_c": 28.0,
            "humidity_pct": 60.0,
            "strip_age_days": 120.0,
            "estimated_dose": 510.0,
            "equivalent_8h_twa_ppm": 1.06,
            "confidence": 0.32,
            "status": "MODERATE",
            "expiry_status": "EXPIRED",
            "image_quality_score": 0.92,
            "image_quality_valid": True,
            "data_status": "SIMULATED",
            "calibration_version": "CAL-v0.1-demo",
            "source": "UPLOAD",
            "warnings_json": json.dumps(["CRITICAL: Badge chemistry is expired. Quantitative exposure reading is untrustworthy."]),
            "color_features_json": json.dumps({"cielab": {"L_star": 68.4, "a_star": 9.5, "b_star": 22.0}, "delta_e_baseline": 31.5})
        },
        {
            "id": "scan-1007",
            "worker_id": "w-07",
            "badge_id": "MRPL-H2S-8827",
            "timestamp": now - timedelta(days=2, hours=2),
            "shift": "Shift A",
            "temperature_c": 27.5,
            "humidity_pct": 55.0,
            "strip_age_days": 8.0,
            "estimated_dose": 45.0,
            "equivalent_8h_twa_ppm": 0.09,
            "confidence": 0.97,
            "status": "LOW",
            "expiry_status": "VALID",
            "image_quality_score": 0.98,
            "image_quality_valid": True,
            "data_status": "SIMULATED",
            "calibration_version": "CAL-v0.1-demo",
            "source": "CAMERA",
            "warnings_json": json.dumps([]),
            "color_features_json": json.dumps({"cielab": {"L_star": 94.2, "a_star": 0.8, "b_star": 9.6}, "delta_e_baseline": 2.1})
        },
        {
            "id": "scan-1008",
            "worker_id": "w-01",
            "badge_id": "MRPL-H2S-8821",
            "timestamp": now - timedelta(days=2, hours=9),
            "shift": "Shift A",
            "temperature_c": 28.0,
            "humidity_pct": 64.0,
            "strip_age_days": 18.0,
            "estimated_dose": 310.0,
            "equivalent_8h_twa_ppm": 0.65,
            "confidence": 0.95,
            "status": "MODERATE",
            "expiry_status": "VALID",
            "image_quality_score": 0.96,
            "image_quality_valid": True,
            "data_status": "SIMULATED",
            "calibration_version": "CAL-v0.1-demo",
            "source": "CAMERA",
            "warnings_json": json.dumps([]),
            "color_features_json": json.dumps({"cielab": {"L_star": 78.6, "a_star": 5.9, "b_star": 17.8}, "delta_e_baseline": 20.4})
        }
    ]

    for r in readings_seed:
        db.add(Reading(**r))
    db.commit()

    # 4. Seed Calibration Benchmarks (Simulated Controlled Gas Chamber Points)
    calib_points = [
        (0.5, 30, 25.0, 50.0, 15.0),
        (0.5, 120, 25.0, 50.0, 60.0),
        (1.0, 60, 25.0, 50.0, 60.0),
        (1.0, 150, 25.0, 50.0, 150.0),
        (1.5, 180, 26.0, 55.0, 270.0),
        (2.0, 240, 25.0, 50.0, 480.0),
        (2.5, 300, 27.0, 60.0, 750.0),
        (3.0, 240, 25.0, 50.0, 720.0),
        (4.0, 240, 28.0, 65.0, 960.0),
        (5.0, 240, 25.0, 50.0, 1200.0),
        (7.5, 200, 26.0, 52.0, 1500.0),
        (10.0, 180, 25.0, 50.0, 1800.0),
        (10.0, 240, 29.0, 70.0, 2400.0),
        (15.0, 180, 25.0, 50.0, 2700.0),
    ]

    for idx, (ppm, dur, temp, rh, known_dose) in enumerate(calib_points, 1):
        # Synthetic kinetic formula with small measurement noise
        decay = (1.0 - (known_dose / (known_dose + 850.0)))
        L_star = 24.0 + (96.0 - 24.0) * decay
        delta_e = 80.0 * (1.0 - decay)
        
        # Predicted dose with realistic experimental calibration variance (±2.5%)
        noise_factor = 1.0 + (0.018 * ((idx % 5) - 2.0))
        pred_dose = round(known_dose * noise_factor, 1)
        abs_err = round(abs(pred_dose - known_dose), 1)
        rel_err = round((abs_err / max(1.0, known_dose)) * 100.0, 2)

        sample = CalibrationSample(
            id=f"cal-{idx:03d}",
            sample_code=f"MRPL-CHAMBER-2026-{idx:03d}",
            chamber_run_id=f"RUN-2026-CH-{((idx-1)//4)+1:02d}",
            known_concentration_ppm=ppm,
            exposure_duration_min=dur,
            known_dose_ppm_min=known_dose,
            temperature_c=temp,
            humidity_pct=rh,
            strip_age_days=14.0,
            observed_delta_e=round(delta_e, 2),
            observed_L_star=round(L_star, 2),
            predicted_dose_ppm_min=pred_dose,
            absolute_error=abs_err,
            relative_error_pct=rel_err,
            data_status="SIMULATED",
            calibration_version="CAL-v0.1-demo"
        )
        db.add(sample)
    db.commit()
    db.close()
    print("H2Sentry Database successfully seeded with deterministic demo benchmarks.")

if __name__ == "__main__":
    seed_database()
