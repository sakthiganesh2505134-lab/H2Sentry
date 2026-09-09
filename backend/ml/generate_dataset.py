"""
H2Sentry Synthetic Calibration Dataset Generator
=================================================
DISCLAIMER:
This dataset is synthetic software-test data and is NOT laboratory H2S calibration data.
It is generated for software testing, pipeline validation, and regression model development
within the H2Sentry prototype system.

Derivation:
- Uses the diffusion-reaction kinetic decay formula from `backend/cv/badge_generator.py`
  and the environmental compensation kinetics from `backend/cv/exposure_engine.py`.
- Computes standard CIE 1976 L*a*b*, ΔE, and HSV color representations matching
  `backend/cv/color_extractor.py`.
- Applies realistic software-simulated sensor, substrate, and environmental variations.

Data Leakage Prevention:
- Each row represents an independently sampled continuous dose point across the spectrum [0, 2000] ppm·min
  paired with independent environmental parameters (T, RH, Age) and independent optical sensor noise.
- No repeated copies of identical discrete anchor points are cloned, preventing train/test data leakage.
"""

import os
import sys
import argparse
import numpy as np
import pandas as pd
import cv2
from typing import Tuple, Dict, Any

# Ensure project root is in Python path for backend imports
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.cv.color_extractor import rgb_to_cielab, compute_delta_e_cielab, UNEXPOSED_BASELINE_LAB

DEFAULT_OUTPUT_PATH = os.path.join(PROJECT_ROOT, "data", "calibration", "synthetic_calibration_dataset.csv")

def dose_to_calibrated_rgb(
    dose_ppm_min: float,
    temperature_c: float = 25.0,
    humidity_pct: float = 50.0,
    strip_age_days: float = 14.0,
    noise_sigma: float = 1.2,
    rng: np.random.Generator = None
) -> Tuple[float, float, float]:
    """
    Computes simulated calibrated RGB color for a given cumulative H2S dose and ambient condition.
    Derived directly from `backend/cv/badge_generator.py` and `backend/cv/exposure_engine.py`.
    """
    if rng is None:
        rng = np.random.default_rng()

    # 1. Environmental Reaction Kinetics Multipliers (from exposure_engine.py)
    alpha_temp = 0.008  # +0.8% per °C relative to 25°C
    beta_rh = 0.003     # +0.3% per %RH relative to 50%
    temp_factor = 1.0 + alpha_temp * (temperature_c - 25.0)
    rh_factor = 1.0 + beta_rh * (humidity_pct - 50.0)
    age_factor = max(0.85, 1.0 - max(0.0, (strip_age_days - 30.0) * 0.002))
    
    env_multiplier = max(0.50, temp_factor * rh_factor * age_factor)
    
    # Apparent kinetic dose experienced by the chemical sensing matrix
    apparent_dose = max(0.0, dose_ppm_min * env_multiplier)
    
    # 2. Diffusion-reaction exponential decay (k = 850.0)
    k_rate = 850.0
    decay = np.exp(-apparent_dose / k_rate)
    
    # Unexposed blank substrate reflectance baseline
    r0, g0, b0 = 245.0, 240.0, 222.0
    # Fully saturated lead sulfide (PbS) precipitate limits
    r_inf, g_inf, b_inf = 35.0, 25.0, 18.0
    
    # Chromatic progression (darkening curve)
    r_clean = r_inf + (r0 - r_inf) * decay
    g_clean = g_inf + (g0 - g_inf) * (decay ** 1.15)
    b_clean = b_inf + (b0 - b_inf) * (decay ** 1.35)
    
    # 3. Add software-simulated sensor and substrate variation noise
    if noise_sigma > 0.0:
        r_noisy = r_clean + rng.normal(0.0, noise_sigma)
        g_noisy = g_clean + rng.normal(0.0, noise_sigma * 0.95)
        b_noisy = b_clean + rng.normal(0.0, noise_sigma * 0.90)
    else:
        r_noisy, g_noisy, b_noisy = r_clean, g_clean, b_clean
        
    # Clamp to valid 8-bit reflectance range
    r_clamped = float(np.clip(r_noisy, 10.0, 255.0))
    g_clamped = float(np.clip(g_noisy, 10.0, 255.0))
    b_clamped = float(np.clip(b_noisy, 10.0, 255.0))
    
    return (r_clamped, g_clamped, b_clamped)

def compute_color_features(
    cal_r: float,
    cal_g: float,
    cal_b: float
) -> Dict[str, float]:
    """
    Computes CIE Lab, ΔE, and HSV color features from calibrated RGB channels.
    Matches the transformations in `backend/cv/color_extractor.py`.
    """
    # 1. CIE 1976 L*a*b*
    L_star, a_star, b_star = rgb_to_cielab(cal_r, cal_g, cal_b)
    
    # 2. Delta-E from unexposed baseline
    delta_e = compute_delta_e_cielab((L_star, a_star, b_star), tuple(UNEXPOSED_BASELINE_LAB))
    
    # 3. HSV Representation
    rgb_mat = np.uint8([[[int(round(cal_r)), int(round(cal_g)), int(round(cal_b))]]])
    hsv_mat = cv2.cvtColor(rgb_mat, cv2.COLOR_RGB2HSV)[0][0]
    hue = float(hsv_mat[0] * 2.0)              # 0 - 360 degrees
    sat = float(hsv_mat[1] / 255.0 * 100.0)   # 0 - 100 %
    val = float(hsv_mat[2] / 255.0 * 100.0)   # 0 - 100 %
    
    return {
        "L_star": round(L_star, 2),
        "a_star": round(a_star, 2),
        "b_star": round(b_star, 2),
        "delta_e": round(delta_e, 2),
        "hue": round(hue, 1),
        "sat": round(sat, 1),
        "val": round(val, 1)
    }

def generate_synthetic_calibration_dataset(
    num_samples: int = 2500,
    random_seed: int = 42,
    output_path: str = DEFAULT_OUTPUT_PATH
) -> pd.DataFrame:
    """
    Generates a reproducible synthetic calibration dataset for H2Sentry ML regression training.
    Ensures independent continuous sampling to prevent train/test data leakage.
    """
    rng = np.random.default_rng(seed=random_seed)
    
    rows = []
    
    # Continuous stratified allocation across the 0 to 2000 ppm·min spectrum:
    # - 8% Baseline unexposed (0.0 ppm·min with independent environmental & optical noise)
    # - 22% Trace & Low range (0.5 to 250.0 ppm·min continuous uniform)
    # - 35% Moderate industrial range (250.0 to 1000.0 ppm·min continuous uniform)
    # - 35% High / Critical saturation range (1000.0 to 2000.0 ppm·min continuous uniform)
    n_zero = int(num_samples * 0.08)
    n_low = int(num_samples * 0.22)
    n_mod = int(num_samples * 0.35)
    n_high = num_samples - (n_zero + n_low + n_mod)
    
    doses_zero = np.zeros(n_zero, dtype=np.float64)
    doses_low = rng.uniform(0.5, 250.0, size=n_low)
    doses_mod = rng.uniform(250.0, 1000.0, size=n_mod)
    doses_high = rng.uniform(1000.0, 2000.0, size=n_high)
    
    all_doses = np.concatenate([doses_zero, doses_low, doses_mod, doses_high])
    rng.shuffle(all_doses)
    
    for dose in all_doses:
        # Realistic workplace environmental distributions (independent random variables per sample)
        temperature_c = float(rng.normal(28.0, 5.5))          # 15°C to 45°C
        temperature_c = float(np.clip(temperature_c, 15.0, 45.0))
        
        humidity_pct = float(rng.normal(55.0, 12.0))          # 20% to 85% RH
        humidity_pct = float(np.clip(humidity_pct, 20.0, 85.0))
        
        strip_age_days = float(rng.uniform(1.0, 60.0))        # 1 to 60 days
        
        # Sensor & substrate noise (independent perturbation per sample)
        noise_sigma = float(rng.uniform(0.8, 1.6))
        
        # Compute calibrated RGB
        cal_r, cal_g, cal_b = dose_to_calibrated_rgb(
            dose_ppm_min=dose,
            temperature_c=temperature_c,
            humidity_pct=humidity_pct,
            strip_age_days=strip_age_days,
            noise_sigma=noise_sigma,
            rng=rng
        )
        
        # Derived color spaces
        color_feats = compute_color_features(cal_r, cal_g, cal_b)
        
        row = {
            "cal_r": round(cal_r, 2),
            "cal_g": round(cal_g, 2),
            "cal_b": round(cal_b, 2),
            "L_star": color_feats["L_star"],
            "a_star": color_feats["a_star"],
            "b_star": color_feats["b_star"],
            "hue": color_feats["hue"],
            "sat": color_feats["sat"],
            "val": color_feats["val"],
            "delta_e": color_feats["delta_e"],
            "temperature_c": round(temperature_c, 1),
            "humidity_pct": round(humidity_pct, 1),
            "strip_age_days": round(strip_age_days, 1),
            "dose_ppm_min": round(float(dose), 1) # Target column
        }
        rows.append(row)
        
    df = pd.DataFrame(rows)
    
    # Validation checks: ensure no NaN, Inf, or duplicate rows
    nan_count = df.isna().sum().sum()
    inf_count = np.isinf(df.select_dtypes(include=[np.number]).to_numpy()).sum()
    dup_count = df.duplicated().sum()
    
    if nan_count > 0 or inf_count > 0:
        raise ValueError(f"Dataset validation failed: Found {nan_count} NaNs and {inf_count} infinite values.")
    if dup_count > 0:
        df = df.drop_duplicates().reset_index(drop=True)
        
    # Ensure destination directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    
    return df

def print_dataset_summary(df: pd.DataFrame, output_path: str, random_seed: int):
    """Prints comprehensive technical dataset summary."""
    feature_cols = [c for c in df.columns if c != "dose_ppm_min"]
    target_col = "dose_ppm_min"
    
    nan_count = df.isna().sum().sum()
    inf_count = np.isinf(df.select_dtypes(include=[np.number]).to_numpy()).sum()
    dup_count = df.duplicated().sum()
    
    print("\n" + "=" * 78)
    print("H2SENTRY SYNTHETIC CALIBRATION DATASET GENERATION SUMMARY")
    print("=" * 78)
    print(f"Statement          : SYNTHETIC SOFTWARE-TEST DATA (NOT laboratory calibration data)")
    print(f"Output File        : {output_path}")
    print(f"Total Rows         : {len(df):,}")
    print(f"Random Seed        : {random_seed}")
    print(f"Target Column      : {target_col} (unit: ppm·min)")
    print(f"Feature Count      : {len(feature_cols)} features")
    print(f"Feature Names      : {', '.join(feature_cols)}")
    print("-" * 78)
    print("TARGET DOSE STATISTICS:")
    print(f"  Minimum Dose     : {df[target_col].min():.1f} ppm·min")
    print(f"  Maximum Dose     : {df[target_col].max():.1f} ppm·min")
    print(f"  Mean Dose        : {df[target_col].mean():.1f} ppm·min")
    print(f"  Median Dose      : {df[target_col].median():.1f} ppm·min")
    print(f"  Std Dev          : {df[target_col].std():.1f} ppm·min")
    print("-" * 78)
    print("DATA INTEGRITY CHECK:")
    print(f"  NaN Values Exist : {'YES (ERROR)' if nan_count > 0 else 'NO (0 NaNs - Clean)'}")
    print(f"  Inf Values Exist : {'YES (ERROR)' if inf_count > 0 else 'NO (0 Infs - Clean)'}")
    print(f"  Duplicate Rows   : {'YES (ERROR)' if dup_count > 0 else 'NO (0 Duplicates - Clean)'}")
    print("-" * 78)
    print("MAIN COLOR FEATURE STATISTICS:")
    stats_df = df[["cal_r", "cal_g", "cal_b", "L_star", "a_star", "b_star", "hue", "sat", "val", "delta_e"]].describe().T[["mean", "std", "min", "50%", "max"]]
    stats_df.columns = ["Mean", "Std", "Min", "Median", "Max"]
    print(stats_df.round(2).to_string())
    print("-" * 78)
    print("FIRST 5 SAMPLE ROWS:")
    print(df.head(5).to_string(index=False))
    print("=" * 78 + "\n")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate synthetic calibration dataset for H2Sentry ML regression.")
    parser.add_argument("--samples", type=int, default=2500, help="Number of samples to generate (default: 2500)")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility (default: 42)")
    parser.add_argument("--output", type=str, default=DEFAULT_OUTPUT_PATH, help="Output CSV filepath")
    
    args = parser.parse_args()
    
    df = generate_synthetic_calibration_dataset(
        num_samples=args.samples,
        random_seed=args.seed,
        output_path=args.output
    )
    print_dataset_summary(df, args.output, args.seed)
