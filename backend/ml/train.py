"""
H2Sentry ML Calibration Model Training & Evaluation Engine
===========================================================
DISCLAIMER:
All models, features, training targets, and metrics in this file are
SYNTHETIC SOFTWARE-VALIDATION METRICS for prototype demonstration.
They are NOT laboratory chemical exposure calibrations, safety certifications, or DGMS/OISD approvals.

Trains:
1. GradientBoostingRegressor (Primary Model)
2. RandomForestRegressor (Ensemble Baseline)
3. Ridge Regression (Linear Baseline)

Evaluates on validation split, selects best model, and runs final test on held-out test split.
Saves model to `backend/ml/models/h2s_calibration_regressor.joblib` and metadata to `model_metadata.json`.
Generates diagnostic plots in `data/calibration/plots/` and quality report in `dataset_quality_report.json`.
"""

import os
import sys
import json
import joblib
from datetime import datetime, timezone
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, root_mean_squared_error, r2_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

# Ensure project root is in sys.path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.cv.badge_generator import dose_to_strip_color
from backend.cv.color_extractor import rgb_to_cielab

RANDOM_SEED = 42
FEATURE_CSV_PATH = os.path.join(PROJECT_ROOT, "data", "calibration", "synthetic_feature_dataset.csv")
METADATA_CSV_PATH = os.path.join(PROJECT_ROOT, "data", "calibration", "synthetic_wristband_metadata.csv")
MODELS_DIR = os.path.join(PROJECT_ROOT, "backend", "ml", "models")
PLOTS_DIR = os.path.join(PROJECT_ROOT, "data", "calibration", "plots")
QUALITY_REPORT_PATH = os.path.join(PROJECT_ROOT, "data", "calibration", "dataset_quality_report.json")

FEATURE_COLUMNS = [
    "cal_r", "cal_g", "cal_b",
    "L_star", "a_star", "b_star",
    "hue", "sat", "val",
    "delta_e",
    "uniformity_score", "noise_std",
    "temperature_c", "humidity_pct", "strip_age_days"
]
TARGET_COLUMN = "dose_ppm_min"

ANCHOR_DOSES = [0.0, 48.0, 150.0, 240.0, 480.0, 742.0, 960.0, 1850.0, 1920.0]

def train_and_evaluate_models():
    os.makedirs(MODELS_DIR, exist_ok=True)
    os.makedirs(PLOTS_DIR, exist_ok=True)

    print(f"Loading dataset from: {FEATURE_CSV_PATH}")
    df = pd.read_csv(FEATURE_CSV_PATH)
    
    # 1. Dataset Partitioning (strictly using pre-assigned chemical_state_id splits)
    train_df = df[df["split"] == "train"].copy()
    val_df = df[df["split"] == "validation"].copy()
    test_df = df[df["split"] == "test"].copy()
    
    print(f"Dataset split counts: Train={len(train_df)}, Val={len(val_df)}, Test={len(test_df)}")

    X_train, y_train = train_df[FEATURE_COLUMNS], train_df[TARGET_COLUMN]
    X_val, y_val = val_df[FEATURE_COLUMNS], val_df[TARGET_COLUMN]
    X_test, y_test = test_df[FEATURE_COLUMNS], test_df[TARGET_COLUMN]

    # 2. Candidate Models
    candidate_models = {
        "GradientBoostingRegressor": Pipeline([
            ("scaler", StandardScaler()),
            ("regressor", GradientBoostingRegressor(
                n_estimators=200,
                learning_rate=0.08,
                max_depth=5,
                subsample=0.85,
                random_state=RANDOM_SEED
            ))
        ]),
        "RandomForestRegressor": Pipeline([
            ("scaler", StandardScaler()),
            ("regressor", RandomForestRegressor(
                n_estimators=200,
                max_depth=12,
                min_samples_split=4,
                n_jobs=-1,
                random_state=RANDOM_SEED
            ))
        ]),
        "Ridge": Pipeline([
            ("scaler", StandardScaler()),
            ("regressor", Ridge(alpha=1.0, random_state=RANDOM_SEED))
        ])
    }

    results = {}
    print("\n========================================================")
    print("TRAINING CANDIDATE MODELS (SYNTHETIC SOFTWARE VALIDATION)")
    print("========================================================")

    for name, pipeline in candidate_models.items():
        print(f"\nTraining {name}...")
        pipeline.fit(X_train, y_train)
        
        # Validation Evaluation
        y_val_pred = pipeline.predict(X_val)
        val_mae = float(mean_absolute_error(y_val, y_val_pred))
        val_rmse = float(root_mean_squared_error(y_val, y_val_pred))
        val_r2 = float(r2_score(y_val, y_val_pred))
        
        # Train Evaluation
        y_train_pred = pipeline.predict(X_train)
        train_mae = float(mean_absolute_error(y_train, y_train_pred))
        train_rmse = float(root_mean_squared_error(y_train, y_train_pred))
        train_r2 = float(r2_score(y_train, y_train_pred))

        results[name] = {
            "pipeline": pipeline,
            "train_mae": round(train_mae, 2),
            "train_rmse": round(train_rmse, 2),
            "train_r2": round(train_r2, 4),
            "val_mae": round(val_mae, 2),
            "val_rmse": round(val_rmse, 2),
            "val_r2": round(val_r2, 4)
        }
        print(f"  Validation MAE:  {val_mae:.2f} ppm·min")
        print(f"  Validation RMSE: {val_rmse:.2f} ppm·min")
        print(f"  Validation R²:   {val_r2:.4f}")

    # 3. Model Selection based on Validation MAE/R²
    best_model_name = min(results.keys(), key=lambda k: results[k]["val_mae"])
    best_pipeline = results[best_model_name]["pipeline"]
    print(f"\nSelected Best Model: {best_model_name} (Lowest Validation MAE: {results[best_model_name]['val_mae']:.2f})")

    # 4. Final Evaluation on Held-out Test Set (Evaluated strictly ONCE)
    y_test_pred = best_pipeline.predict(X_test)
    test_mae = float(mean_absolute_error(y_test, y_test_pred))
    test_rmse = float(root_mean_squared_error(y_test, y_test_pred))
    test_r2 = float(r2_score(y_test, y_test_pred))

    print("\n========================================================")
    print("HELD-OUT TEST SET EVALUATION (SYNTHETIC SOFTWARE VALIDATION)")
    print("========================================================")
    print(f"Model: {best_model_name}")
    print(f"Test MAE:  {test_mae:.2f} ppm·min")
    print(f"Test RMSE: {test_rmse:.2f} ppm·min")
    print(f"Test R²:   {test_r2:.4f}")
    print("========================================================\n")

    # 5. Save Final Model Artifact
    model_save_path = os.path.join(MODELS_DIR, "h2s_calibration_regressor.joblib")
    joblib.dump(best_pipeline, model_save_path)
    print(f"Saved trained ML model artifact -> {model_save_path}")

    # 6. Save Model Metadata JSON
    metadata = {
        "model_name": "H2Sentry Synthetic Colorimetric Exposure Calibration Regressor",
        "selected_algorithm": best_model_name,
        "feature_list": FEATURE_COLUMNS,
        "target_variable": TARGET_COLUMN,
        "target_unit": "ppm·min",
        "dataset_version": "v1.0-synthetic-6000",
        "dataset_size_total": len(df),
        "train_samples": len(train_df),
        "validation_samples": len(val_df),
        "test_samples": len(test_df),
        "random_seed": RANDOM_SEED,
        "training_date": datetime.now(timezone.utc).isoformat(),
        "synthetic_disclaimer": "ALL METRICS ARE SYNTHETIC SOFTWARE-VALIDATION RESULTS. NOT LABORATORY H2S CALIBRATION.",
        "calibration_version": "CAL-v1.0-ml-gbr",
        "validation_metrics": {
            "mae_ppm_min": results[best_model_name]["val_mae"],
            "rmse_ppm_min": results[best_model_name]["val_rmse"],
            "r2_score": results[best_model_name]["val_r2"]
        },
        "test_metrics": {
            "mae_ppm_min": round(test_mae, 2),
            "rmse_ppm_min": round(test_rmse, 2),
            "r2_score": round(test_r2, 4)
        },
        "candidate_models_comparison": {
            k: {
                "train_mae": v["train_mae"],
                "train_rmse": v["train_rmse"],
                "train_r2": v["train_r2"],
                "val_mae": v["val_mae"],
                "val_rmse": v["val_rmse"],
                "val_r2": v["val_r2"]
            } for k, v in results.items()
        }
    }

    metadata_path = os.path.join(MODELS_DIR, "model_metadata.json")
    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved model metadata -> {metadata_path}")

    # 7. Generate Diagnostic Plots
    print("\n--- Generating Diagnostic Plots ---")
    
    # Plot 1: Dose vs Calibrated RGB
    plt.figure(figsize=(9, 6), dpi=150)
    plt.scatter(df["dose_ppm_min"], df["cal_r"], color="#d9534f", alpha=0.35, s=12, label="Calibrated R (Red)")
    plt.scatter(df["dose_ppm_min"], df["cal_g"], color="#5cb85c", alpha=0.35, s=12, label="Calibrated G (Green)")
    plt.scatter(df["dose_ppm_min"], df["cal_b"], color="#0275d8", alpha=0.35, s=12, label="Calibrated B (Blue)")
    plt.title("H2Sentry: Simulated Exposure Dose vs Calibrated RGB Channels\n[SYNTHETIC SOFTWARE VALIDATION]", fontsize=12, fontweight="bold")
    plt.xlabel("Simulated Cumulative Dose (ppm·min)", fontsize=10)
    plt.ylabel("Calibrated Channel Intensity [0-255]", fontsize=10)
    plt.grid(True, linestyle="--", alpha=0.5)
    plt.legend(loc="upper right", frameon=True)
    plt.tight_layout()
    plt.savefig(os.path.join(PLOTS_DIR, "dose_vs_rgb.png"))
    plt.close()

    # Plot 2: Dose vs CIE L*a*b*
    plt.figure(figsize=(9, 6), dpi=150)
    plt.scatter(df["dose_ppm_min"], df["L_star"], color="#333333", alpha=0.4, s=12, label="L* (Perceptual Luminance)")
    plt.scatter(df["dose_ppm_min"], df["a_star"], color="#d9534f", alpha=0.4, s=12, label="a* (Green-Red Axis)")
    plt.scatter(df["dose_ppm_min"], df["b_star"], color="#f0ad4e", alpha=0.4, s=12, label="b* (Blue-Yellow Axis)")
    plt.title("H2Sentry: Simulated Exposure Dose vs CIE 1976 L*a*b* Space\n[SYNTHETIC SOFTWARE VALIDATION]", fontsize=12, fontweight="bold")
    plt.xlabel("Simulated Cumulative Dose (ppm·min)", fontsize=10)
    plt.ylabel("CIE Lab Value", fontsize=10)
    plt.grid(True, linestyle="--", alpha=0.5)
    plt.legend(loc="upper right", frameon=True)
    plt.tight_layout()
    plt.savefig(os.path.join(PLOTS_DIR, "dose_vs_cielab.png"))
    plt.close()

    # Plot 3: True vs Predicted Dose (Test Set)
    plt.figure(figsize=(7, 7), dpi=150)
    plt.scatter(y_test, y_test_pred, color="#0275d8", alpha=0.5, s=16, edgecolors="none", label="Test Predictions")
    max_val = max(y_test.max(), y_test_pred.max()) + 50
    plt.plot([0, max_val], [0, max_val], color="#d9534f", linestyle="--", linewidth=2, label="Ideal 1:1 Identity Line")
    plt.title(f"H2Sentry: True vs Predicted Dose on Held-Out Test Set\n({best_model_name}) | R² = {test_r2:.4f}, MAE = {test_mae:.2f}\n[SYNTHETIC SOFTWARE VALIDATION]", fontsize=11, fontweight="bold")
    plt.xlabel("Ground-Truth Simulated Dose (ppm·min)", fontsize=10)
    plt.ylabel("ML Predicted Cumulative Dose (ppm·min)", fontsize=10)
    plt.xlim(-20, max_val)
    plt.ylim(-20, max_val)
    plt.grid(True, linestyle="--", alpha=0.5)
    plt.legend(loc="upper left", frameon=True)
    plt.tight_layout()
    plt.savefig(os.path.join(PLOTS_DIR, "true_vs_predicted.png"))
    plt.close()

    # Plot 4: Residual Plot (Test Set)
    residuals = y_test - y_test_pred
    plt.figure(figsize=(9, 5), dpi=150)
    plt.scatter(y_test_pred, residuals, color="#5bc0de", alpha=0.5, s=14, edgecolors="none")
    plt.axhline(0, color="#d9534f", linestyle="--", linewidth=1.5)
    plt.title("H2Sentry: Prediction Residuals vs Predicted Dose\n[SYNTHETIC SOFTWARE VALIDATION]", fontsize=12, fontweight="bold")
    plt.xlabel("Predicted Dose (ppm·min)", fontsize=10)
    plt.ylabel("Residual (True - Predicted) [ppm·min]", fontsize=10)
    plt.grid(True, linestyle="--", alpha=0.5)
    plt.tight_layout()
    plt.savefig(os.path.join(PLOTS_DIR, "residuals_plot.png"))
    plt.close()

    # Plot 5: Dose Distribution Across Splits
    plt.figure(figsize=(10, 5), dpi=150)
    plt.hist(train_df["dose_ppm_min"], bins=40, alpha=0.5, color="#0275d8", label=f"Train (N={len(train_df)})", density=True)
    plt.hist(val_df["dose_ppm_min"], bins=40, alpha=0.5, color="#5cb85c", label=f"Validation (N={len(val_df)})", density=True)
    plt.hist(test_df["dose_ppm_min"], bins=40, alpha=0.5, color="#f0ad4e", label=f"Test (N={len(test_df)})", density=True)
    plt.title("H2Sentry: Stratified Dose Distributions Across Splits\n[SYNTHETIC SOFTWARE VALIDATION]", fontsize=12, fontweight="bold")
    plt.xlabel("Dose (ppm·min)", fontsize=10)
    plt.ylabel("Density", fontsize=10)
    plt.grid(True, linestyle="--", alpha=0.5)
    plt.legend(loc="upper right", frameon=True)
    plt.tight_layout()
    plt.savefig(os.path.join(PLOTS_DIR, "split_distributions.png"))
    plt.close()

    print(f"Generated 5 diagnostic plots in -> {PLOTS_DIR}")

    # 8. Generate Dataset Quality Report
    print("\n--- Generating Dataset Quality Report ---")
    anchor_colors_report = {}
    for a in ANCHOR_DOSES:
        r, g, b = dose_to_strip_color(a)
        L, a_st, b_st = rgb_to_cielab(r, g, b)
        state = "SATURATED" if a >= 1800 else ("DYNAMIC_RESPONSE" if a > 0 else "UNEXPOSED_BASELINE")
        anchor_colors_report[f"{int(a)}_ppm_min"] = {
            "dose_ppm_min": a,
            "rgb": [r, g, b],
            "cielab": [L, a_st, b_st],
            "response_state": state,
            "above_calibration_range": bool(a > 2000.0)
        }

    # Leakage and Integrity Checks
    df_meta = pd.read_csv(METADATA_CSV_PATH) if os.path.exists(METADATA_CSV_PATH) else df
    train_states = set(df[df["split"] == "train"]["chemical_state_id"])
    val_states = set(df[df["split"] == "validation"]["chemical_state_id"])
    test_states = set(df[df["split"] == "test"]["chemical_state_id"])
    
    train_val_overlap = len(train_states.intersection(val_states))
    train_test_overlap = len(train_states.intersection(test_states))
    val_test_overlap = len(val_states.intersection(test_states))
    
    quality_report = {
        "report_title": "H2Sentry Master Synthetic Dataset & Model Quality Audit",
        "disclaimer": "ALL DATA AND METRICS ARE SYNTHETIC SOFTWARE-VALIDATION RESULTS. NOT LABORATORY H2S CALIBRATION.",
        "generation_timestamp": datetime.now(timezone.utc).isoformat(),
        "dataset_statistics": {
            "total_images": int(len(df)),
            "train_count": int(len(train_df)),
            "validation_count": int(len(val_df)),
            "test_count": int(len(test_df)),
            "independent_chemical_states_total": int(df["chemical_state_id"].nunique()),
            "independent_chemical_states_train": int(train_df["chemical_state_id"].nunique()),
            "independent_chemical_states_val": int(val_df["chemical_state_id"].nunique()),
            "independent_chemical_states_test": int(test_df["chemical_state_id"].nunique()),
            "dose_min_ppm_min": float(df["dose_ppm_min"].min()),
            "dose_max_ppm_min": float(df["dose_ppm_min"].max()),
            "dose_mean_ppm_min": round(float(df["dose_ppm_min"].mean()), 2),
            "dose_median_ppm_min": round(float(df["dose_ppm_min"].median()), 2)
        },
        "data_integrity_checks": {
            "nan_count_total": int(df.isna().sum().sum()),
            "infinite_count_total": int(np.isinf(df[FEATURE_COLUMNS].values).sum()),
            "exact_feature_duplicates": int(df[FEATURE_COLUMNS].duplicated().sum()),
            "chemical_state_leakage_train_val": train_val_overlap,
            "chemical_state_leakage_train_test": train_test_overlap,
            "chemical_state_leakage_val_test": val_test_overlap,
            "leakage_isolation_verified": bool(train_val_overlap == 0 and train_test_overlap == 0 and val_test_overlap == 0),
            "qr_code_excluded_from_features": True,
            "filename_excluded_from_features": True,
            "badge_id_excluded_from_features": True,
            "ground_truth_dose_excluded_from_features": True
        },
        "physical_strip_specifications": {
            "target_dimensions": "8 mm x 4 mm",
            "aspect_ratio": "2:1",
            "geometry": "Horizontal rounded-corner rectangle",
            "reaction_area_purity": "Pure colorimetric response, zero exterior text/QR/dose inside strip area",
            "printable_sheet_path": "data/calibration/physical_strips/printable_strip_sheet.png",
            "prototype_compatibility": "Fully compatible with 8x4mm wristband sensing aperture"
        },
        "anchor_colors_calibration_spectrum": anchor_colors_report,
        "saturation_characteristics": {
            "diffusion_rate_constant_k": 850.0,
            "unexposed_baseline_rgb": [245, 240, 222],
            "saturated_limit_rgb": [35, 25, 18],
            "saturation_dose_threshold_ppm_min": 2000.0,
            "saturation_flag_handling": "Above calibration range flag triggered for doses approaching saturation"
        },
        "model_performance_summary": {
            "selected_model": best_model_name,
            "test_mae_ppm_min": round(test_mae, 2),
            "test_rmse_ppm_min": round(test_rmse, 2),
            "test_r2_score": round(test_r2, 4),
            "validation_mae_ppm_min": results[best_model_name]["val_mae"],
            "validation_rmse_ppm_min": results[best_model_name]["val_rmse"],
            "validation_r2_score": results[best_model_name]["val_r2"]
        }
    }

    with open(QUALITY_REPORT_PATH, "w") as f:
        json.dump(quality_report, f, indent=2)
    print(f"Saved dataset quality report -> {QUALITY_REPORT_PATH}")
    print("\nTraining, evaluation, plots, and quality report completed successfully!")

if __name__ == "__main__":
    train_and_evaluate_models()
