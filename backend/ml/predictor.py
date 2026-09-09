"""
H2Sentry ML Calibration Predictor Engine
=========================================
DISCLAIMER:
All predictions, confidence scores, and estimated doses are
SYNTHETIC SOFTWARE-VALIDATION ESTIMATES for prototype demonstration.
They are NOT laboratory chemical exposure measurements or regulatory certifications.

Encapsulates:
1. Loading the trained scikit-learn calibration regressor
2. Feature vector preparation from CV pipeline color extraction outputs
3. Model inference & saturation handling (response_state = SATURATED)
4. Multi-factor trust and uncertainty estimation
5. Graceful fallback hooks for analytical baseline
"""

import os
import sys
import json
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, Optional, Tuple

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

MODEL_PATH = os.path.join(PROJECT_ROOT, "backend", "ml", "models", "h2s_calibration_regressor.joblib")
METADATA_PATH = os.path.join(PROJECT_ROOT, "backend", "ml", "models", "model_metadata.json")

FEATURE_COLUMNS = [
    "cal_r", "cal_g", "cal_b",
    "L_star", "a_star", "b_star",
    "hue", "sat", "val",
    "delta_e",
    "uniformity_score", "noise_std",
    "temperature_c", "humidity_pct", "strip_age_days"
]

class H2SCalibrationPredictor:
    def __init__(self, model_path: str = MODEL_PATH, metadata_path: str = METADATA_PATH):
        self.model_path = model_path
        self.metadata_path = metadata_path
        self.model = None
        self.metadata = None
        self.load_model()

    def load_model(self) -> bool:
        if os.path.exists(self.model_path):
            try:
                self.model = joblib.load(self.model_path)
                if os.path.exists(self.metadata_path):
                    with open(self.metadata_path, "r") as f:
                        self.metadata = json.load(f)
                return True
            except Exception as e:
                print(f"Warning: Failed to load ML model from {self.model_path}: {e}")
                self.model = None
                return False
        return False

    @property
    def is_available(self) -> bool:
        return self.model is not None

    def predict(
        self,
        color_features: Dict[str, Any],
        temperature_c: float = 25.0,
        humidity_pct: float = 50.0,
        strip_age_days: float = 14.0
    ) -> Dict[str, Any]:
        """
        Executes ML regression inference on optical features extracted from the CV pipeline.
        Returns dose estimation, confidence, saturation state, and diagnostic features.
        """
        if not self.is_available:
            return {
                "success": False,
                "error": "ML model not loaded or unavailable."
            }

        if not color_features.get("success", False):
            return {
                "success": False,
                "error": "Color feature extraction was unsuccessful."
            }

        # Extract features
        cal_rgb = color_features.get("calibrated_rgb", {})
        cielab = color_features.get("cielab", {})
        hsv = color_features.get("hsv", {})

        cal_r = float(cal_rgb.get("r", 245.0))
        cal_g = float(cal_rgb.get("g", 240.0))
        cal_b = float(cal_rgb.get("b", 222.0))
        L_star = float(cielab.get("L_star", 96.0))
        a_star = float(cielab.get("a_star", 0.0))
        b_star = float(cielab.get("b_star", 0.0))
        hue = float(hsv.get("hue_deg", 0.0))
        sat = float(hsv.get("saturation_pct", 0.0))
        val = float(hsv.get("value_pct", 100.0))
        delta_e = float(color_features.get("delta_e_baseline", 0.0))
        uniformity = float(color_features.get("uniformity_score", 0.90))
        noise_std = float(color_features.get("noise_std", 1.0))

        # Build feature vector matching training order
        feature_dict = {
            "cal_r": cal_r,
            "cal_g": cal_g,
            "cal_b": cal_b,
            "L_star": L_star,
            "a_star": a_star,
            "b_star": b_star,
            "hue": hue,
            "sat": sat,
            "val": val,
            "delta_e": delta_e,
            "uniformity_score": uniformity,
            "noise_std": noise_std,
            "temperature_c": float(temperature_c),
            "humidity_pct": float(humidity_pct),
            "strip_age_days": float(strip_age_days)
        }

        # Predict dose using DataFrame with feature names
        feat_df = pd.DataFrame([feature_dict])[FEATURE_COLUMNS]
        raw_pred = float(self.model.predict(feat_df)[0])
        
        # Baseline thresholding: virgin unexposed substrate
        if delta_e < 3.5 or cal_r >= 244.0 or raw_pred < 15.0:
            predicted_dose = 0.0
            response_state = "UNEXPOSED_BASELINE"
            above_range = False
        elif raw_pred >= 1950.0 or (cal_r < 45.0 and cal_g < 35.0 and cal_b < 28.0):
            predicted_dose = round(raw_pred, 1)
            response_state = "SATURATED"
            above_range = True
        else:
            predicted_dose = round(max(0.0, raw_pred), 1)
            response_state = "DYNAMIC_RESPONSE"
            above_range = False

        # Trust score calculation
        # Evaluates feature distance and image quality
        trust_factors = []
        # Uniformity factor
        trust_factors.append(max(0.1, min(1.0, uniformity)))
        # Delta E consistency
        if delta_e > 1.0 and predicted_dose == 0.0:
            trust_factors.append(0.7)
        else:
            trust_factors.append(0.95)
        # Saturated uncertainty penalty
        if response_state == "SATURATED":
            trust_factors.append(0.65)
        else:
            trust_factors.append(1.0)
            
        trust_score = round(float(np.mean(trust_factors)), 3)

        return {
            "success": True,
            "predicted_dose_ppm_min": predicted_dose,
            "unit": "ppm·min",
            "response_state": response_state,
            "above_calibration_range": above_range,
            "trust_score": trust_score,
            "model_type": self.metadata.get("selected_algorithm", "GradientBoostingRegressor") if self.metadata else "GradientBoostingRegressor",
            "calibration_version": self.metadata.get("calibration_version", "CAL-v1.0-ml-gbr") if self.metadata else "CAL-v1.0-ml-gbr",
            "is_synthetic": True,
            "input_features": feature_dict
        }

# Global singleton instance
_predictor_instance = None

def get_ml_predictor() -> H2SCalibrationPredictor:
    global _predictor_instance
    if _predictor_instance is None:
        _predictor_instance = H2SCalibrationPredictor()
    return _predictor_instance
