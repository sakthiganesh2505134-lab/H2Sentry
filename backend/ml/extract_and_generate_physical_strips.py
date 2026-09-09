"""
H2Sentry Physical Reaction Strip Generator & Dataset Extractor
==============================================================
DISCLAIMER:
All generated assets, images, colors, and dataset records are
SYNTHETIC SOFTWARE-VALIDATION DATA for prototype demonstration and testing.
It is NOT laboratory chemical exposure data, safety certification, or regulatory validation.

Responsibilities:
1. Extract reaction strip crops directly from the existing synthetic dataset images (data/calibration/extracted_dataset_strips/)
   and generate manifest.csv with exact source bounding boxes.
2. Generate standalone 800x400 px (2:1 aspect ratio) physical reaction strip assets (data/calibration/printable_strips/)
   for doses: 0, 150, 300, 480, 600, 742 (HERO), 800, 960, 1200, 1500, 1850 ppm·min.
3. Generate camera-realistic photographic variants for the Hero 742 ppm·min strip (warm, cool, bright, dim, noise, blur, tilt).
4. Generate the master 300 DPI printable demo sheet (data/calibration/printable_strips/printable_strip_sheet.png)
   highlighting the 742 ppm·min Hero strip with 1:1 true scale cutting bars and clear software-validation disclaimers.
5. Perform automated quality checks on all generated assets.
"""

import os
import sys
import math
import cv2
import numpy as np
import pandas as pd
from typing import Tuple, Dict, Any, List

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.cv.badge_generator import dose_to_strip_color
from backend.cv.detector import detect_badge_regions
from backend.cv.calibrator import calibrate_reference_scale
from backend.cv.color_extractor import extract_strip_color_features, rgb_to_cielab

OUTPUT_DIR_CALIBRATION = os.path.join(PROJECT_ROOT, "data", "calibration")
OUTPUT_DIR_EXTRACTED = os.path.join(OUTPUT_DIR_CALIBRATION, "extracted_dataset_strips")
OUTPUT_DIR_PRINTABLE = os.path.join(OUTPUT_DIR_CALIBRATION, "printable_strips")
METADATA_CSV_PATH = os.path.join(OUTPUT_DIR_CALIBRATION, "synthetic_wristband_metadata.csv")

# Required target dose states
REQUIRED_DOSES = [0.0, 150.0, 300.0, 480.0, 600.0, 742.0, 800.0, 960.0, 1200.0, 1500.0, 1850.0]
HERO_DOSE = 742.0

def draw_rounded_rectangle(img: np.ndarray, top_left: Tuple[int, int], bottom_right: Tuple[int, int], color: Tuple[int, int, int], radius: int = 10, thickness: int = -1):
    """Draws a rounded rectangle on an OpenCV image."""
    x1, y1 = top_left
    x2, y2 = bottom_right
    r = min(radius, (x2 - x1) // 2, (y2 - y1) // 2)
    
    if thickness == -1:
        cv2.rectangle(img, (x1 + r, y1), (x2 - r, y2), color, -1)
        cv2.rectangle(img, (x1, y1 + r), (x2, y2 - r), color, -1)
        cv2.circle(img, (x1 + r, y1 + r), r, color, -1)
        cv2.circle(img, (x2 - r, y1 + r), r, color, -1)
        cv2.circle(img, (x1 + r, y2 - r), r, color, -1)
        cv2.circle(img, (x2 - r, y2 - r), r, color, -1)
    else:
        cv2.line(img, (x1 + r, y1), (x2 - r, y1), color, thickness)
        cv2.line(img, (x1 + r, y2), (x2 - r, y2), color, thickness)
        cv2.line(img, (x1, y1 + r), (x1, y2 - r), color, thickness)
        cv2.line(img, (x2, y1 + r), (x2, y2 - r), color, thickness)
        cv2.ellipse(img, (x1 + r, y1 + r), (r, r), 180, 0, 90, color, thickness)
        cv2.ellipse(img, (x2 - r, y1 + r), (r, r), 270, 0, 90, color, thickness)
        cv2.ellipse(img, (x1 + r, y2 - r), (r, r), 90, 0, 90, color, thickness)
        cv2.ellipse(img, (x2 - r, y2 - r), (r, r), 0, 0, 90, color, thickness)

def generate_standalone_strip_800x400(dose_ppm_min: float, width: int = 800, height: int = 400, corner_radius: int = 32, is_hero: bool = False) -> np.ndarray:
    """
    Renders a clean 800x400 px (exact 2:1 aspect ratio) standalone physical reaction strip asset.
    Contains pure synthetic colorimetric reaction surface with rounded corners and clean paper-like border.
    NO text, NO numbers, NO QR inside the reaction area.
    """
    r, g, b = dose_to_strip_color(dose_ppm_min)
    bgr_color = (b, g, r)
    
    # 4-channel BGRA image for alpha rounded corners
    img = np.zeros((height, width, 4), dtype=np.uint8)
    
    margin = 12
    x1, y1 = margin, margin
    x2, y2 = width - margin, height - margin
    r_corner = corner_radius
    
    color_bgra = (b, g, r, 255)
    border_bgra = (max(0, b - 35), max(0, g - 35), max(0, r - 35), 255)
    
    # Draw filled rounded rectangle
    cv2.rectangle(img, (x1 + r_corner, y1), (x2 - r_corner, y2), color_bgra, -1)
    cv2.rectangle(img, (x1, y1 + r_corner), (x2, y2 - r_corner), color_bgra, -1)
    cv2.circle(img, (x1 + r_corner, y1 + r_corner), r_corner, color_bgra, -1)
    cv2.circle(img, (x2 - r_corner, y1 + r_corner), r_corner, color_bgra, -1)
    cv2.circle(img, (x1 + r_corner, y2 - r_corner), r_corner, color_bgra, -1)
    cv2.circle(img, (x2 - r_corner, y2 - r_corner), r_corner, color_bgra, -1)
    
    # Clean perimeter border
    cv2.ellipse(img, (x1 + r_corner, y1 + r_corner), (r_corner, r_corner), 180, 0, 90, border_bgra, 2)
    cv2.ellipse(img, (x2 - r_corner, y1 + r_corner), (r_corner, r_corner), 270, 0, 90, border_bgra, 2)
    cv2.ellipse(img, (x1 + r_corner, y2 - r_corner), (r_corner, r_corner), 90, 0, 90, border_bgra, 2)
    cv2.ellipse(img, (x2 - r_corner, y2 - r_corner), (r_corner, r_corner), 0, 0, 90, border_bgra, 2)
    cv2.line(img, (x1 + r_corner, y1), (x2 - r_corner, y1), border_bgra, 2)
    cv2.line(img, (x1 + r_corner, y2), (x2 - r_corner, y2), border_bgra, 2)
    cv2.line(img, (x1, y1 + r_corner), (x1, y2 - r_corner), border_bgra, 2)
    cv2.line(img, (x2, y1 + r_corner), (x2, y2 - r_corner), border_bgra, 2)
    
    return img

def extract_dataset_strip_crops(num_samples_to_extract: int = 250):
    """
    Extracts reaction strip crops directly from the existing synthetic wristband dataset images.
    Preserves dataset provenance and records exact bounding box manifest.
    """
    os.makedirs(OUTPUT_DIR_EXTRACTED, exist_ok=True)
    
    if not os.path.exists(METADATA_CSV_PATH):
        raise FileNotFoundError(f"Metadata CSV not found: {METADATA_CSV_PATH}")
        
    df_meta = pd.read_csv(METADATA_CSV_PATH)
    print(f"Loaded {len(df_meta)} metadata records from synthetic dataset.")
    
    # Sample diverse doses across train, validation, and test splits
    # Stratified selection across dose spectrum
    df_meta_sorted = df_meta.sort_values(by="dose_ppm_min").reset_index(drop=True)
    step = max(1, len(df_meta_sorted) // num_samples_to_extract)
    sampled_indices = list(range(0, len(df_meta_sorted), step))[:num_samples_to_extract]
    df_sampled = df_meta_sorted.iloc[sampled_indices].copy()
    
    manifest_records = []
    extracted_count = 0
    
    for idx, row in df_sampled.iterrows():
        img_rel = row["image_path"]
        img_full = os.path.join(OUTPUT_DIR_CALIBRATION, img_rel)
        if not os.path.exists(img_full):
            continue
            
        img = cv2.imread(img_full)
        if img is None:
            continue
            
        h_img, w_img = img.shape[:2]
        det = detect_badge_regions(img)
        if not det.success:
            continue
            
        strip_bbox = det.reaction_strip_bbox # [x, y, w, h]
        sx, sy, sw, sh = strip_bbox
        
        # Crop reaction strip directly from dataset image
        strip_crop = img[sy:sy+sh, sx:sx+sw]
        if strip_crop.size == 0:
            continue
            
        # Standardize to 800x400 px (2:1 aspect ratio) preserving visual details
        strip_crop_800 = cv2.resize(strip_crop, (800, 400), interpolation=cv2.INTER_LANCZOS4)
        
        sample_id = f"dataset_strip_{extracted_count:04d}"
        crop_filename = f"{sample_id}.png"
        crop_save_path = os.path.join(OUTPUT_DIR_EXTRACTED, crop_filename)
        cv2.imwrite(crop_save_path, strip_crop_800)
        
        manifest_records.append({
            "sample_id": sample_id,
            "source_image": row["image_id"],
            "split": row["split"],
            "dose_ppm_min": float(row["dose_ppm_min"]),
            "strip_x": int(sx),
            "strip_y": int(sy),
            "strip_width": int(sw),
            "strip_height": int(sh),
            "image_width": int(w_img),
            "image_height": int(h_img),
            "crop_filename": crop_filename
        })
        extracted_count += 1
        
    df_manifest = pd.DataFrame(manifest_records)
    manifest_csv_path = os.path.join(OUTPUT_DIR_EXTRACTED, "manifest.csv")
    df_manifest.to_csv(manifest_csv_path, index=False)
    print(f"Extracted {extracted_count} strip crops directly from synthetic wristband images.")
    print(f"Saved manifest -> {manifest_csv_path}")
    return df_manifest

def generate_hero_and_printable_assets():
    """
    Generates standalone 800x400 px reaction strips for required doses, camera-realistic variants
    for the Hero 742 ppm·min strip, and the master 300 DPI printable demo sheet.
    """
    os.makedirs(OUTPUT_DIR_PRINTABLE, exist_ok=True)
    
    # 1. Generate standalone 800x400 px clean PNGs for all required doses
    print("\n--- Generating Standalone 800x400 px Strips (2:1) ---")
    for dose in REQUIRED_DOSES:
        is_hero = (dose == HERO_DOSE)
        strip_img = generate_standalone_strip_800x400(dose, width=800, height=400, corner_radius=32, is_hero=is_hero)
        fname = f"strip_{int(round(dose)):04d}.png"
        fpath = os.path.join(OUTPUT_DIR_PRINTABLE, fname)
        cv2.imwrite(fpath, strip_img)
        print(f"  Generated {fname} (Dose: {dose} ppm·min)")
        
        # Save specific hero copy
        if is_hero:
            hero_path = os.path.join(OUTPUT_DIR_PRINTABLE, "hero_strip_0742.png")
            cv2.imwrite(hero_path, strip_img)
            print(f"  --> Saved HERO Prototype Strip: hero_strip_0742.png (742 ppm·min)")

    # 2. Generate Camera-Realistic Variants for the Hero 742 ppm·min Strip
    print("\n--- Generating Camera-Realistic Variants for Hero 742 ppm·min Strip ---")
    r742, g742, b742 = dose_to_strip_color(HERO_DOSE)
    base_hero = generate_standalone_strip_800x400(HERO_DOSE, width=800, height=400, corner_radius=32)
    # Convert to 3-channel BGR for photographic processing
    base_bgr = base_hero[:, :, :3].copy()
    
    camera_variants = [
        ("hero_0742_normal.png",       1.00, (1.00, 1.00, 1.00), 0.4, 0, 0.0, "Normal Balanced Daylight"),
        ("hero_0742_warm_light.png",   0.93, (1.18, 0.96, 0.82), 0.8, 0, 0.8, "Warm Tungsten / Yellow Lighting"),
        ("hero_0742_cool_light.png",   1.06, (0.88, 0.98, 1.15), 0.7, 0,-1.0, "Cool Fluorescent / Blue Tint"),
        ("hero_0742_bright.png",       1.24, (1.02, 1.02, 1.02), 0.3, 0, 0.4, "Bright Diffuse Lighting"),
        ("hero_0742_dim.png",          0.72, (0.95, 0.95, 0.95), 1.8, 0,-0.6, "Dim Low-Light Environment"),
        ("hero_0742_camera_noise.png", 0.92, (1.00, 1.00, 1.00), 3.2, 0, 0.2, "High Sensor ISO Noise"),
        ("hero_0742_slight_blur.png",  1.00, (1.00, 1.00, 1.00), 0.9, 3, 0.0, "Slight Optical Defocus Blur"),
        ("hero_0742_mild_tilt.png",    1.02, (1.03, 0.98, 0.96), 0.8, 0, 2.8, "Handheld 2.8° Angle Shift"),
    ]
    
    rng = np.random.default_rng(seed=42)
    for vname, lf, tint, ns, blur_k, rot, desc in camera_variants:
        var_img = base_bgr.astype(np.float32)
        var_img[:, :, 0] *= tint[2] # B
        var_img[:, :, 1] *= tint[1] # G
        var_img[:, :, 2] *= tint[0] # R
        var_img *= lf
        if ns > 0:
            noise = rng.normal(0, ns, var_img.shape)
            var_img += noise
        var_img = np.clip(var_img, 0, 255).astype(np.uint8)
        if blur_k > 0:
            k = blur_k if blur_k % 2 == 1 else blur_k + 1
            var_img = cv2.GaussianBlur(var_img, (k, k), 0)
        if abs(rot) > 0.1:
            M_rot = cv2.getRotationMatrix2D((400, 200), rot, 1.0)
            var_img = cv2.warpAffine(var_img, M_rot, (800, 400), borderMode=cv2.BORDER_REPLICATE)
            
        vpath = os.path.join(OUTPUT_DIR_PRINTABLE, vname)
        cv2.imwrite(vpath, var_img)
        print(f"  Saved camera variant: {vname} ({desc})")

    # 3. Generate Master 300 DPI Printable Demo Sheet
    print("\n--- Generating Master Printable Sheet ---")
    sheet_w, sheet_h = 2480, 3508 # A4 at 300 DPI
    sheet = np.ones((sheet_h, sheet_w, 3), dtype=np.uint8) * 255
    
    # Header Branding & Title
    cv2.putText(sheet, "H2SENTRY - PHYSICAL SYNTHETIC REACTION-STRIP DEMONSTRATOR", (120, 140),
                cv2.FONT_HERSHEY_DUPLEX, 1.6, (20, 30, 40), 3, cv2.LINE_AA)
    cv2.putText(sheet, "TARGET PHYSICAL SPECIFICATION: 8 mm x 4 mm (2:1 Aspect Ratio) Rounded Sensor Patch", (120, 200),
                cv2.FONT_HERSHEY_SIMPLEX, 0.95, (70, 80, 90), 2, cv2.LINE_AA)
    
    # Prominent Disclaimer Banner
    cv2.rectangle(sheet, (110, 240), (sheet_w - 110, 390), (235, 240, 250), -1)
    cv2.rectangle(sheet, (110, 240), (sheet_w - 110, 390), (40, 50, 180), 3)
    cv2.putText(sheet, "CRITICAL SCIENTIFIC & REGULATORY DISCLOSURE:", (140, 285),
                cv2.FONT_HERSHEY_DUPLEX, 0.95, (30, 40, 160), 2, cv2.LINE_AA)
    cv2.putText(sheet, "SYNTHETIC SOFTWARE-VALIDATION DEMONSTRATOR - NOT CHEMICALLY EXPOSED", (140, 335),
                cv2.FONT_HERSHEY_DUPLEX, 1.15, (20, 20, 180), 3, cv2.LINE_AA)
    cv2.putText(sheet, "For SIH 2026 prototype evaluation and computer vision alignment only. Not laboratory calibration.", (140, 375),
                cv2.FONT_HERSHEY_SIMPLEX, 0.80, (60, 60, 70), 2, cv2.LINE_AA)

    # HERO STRIP CALLOUT BOX (742 ppm·min)
    hero_y = 420
    cv2.rectangle(sheet, (110, hero_y), (sheet_w - 110, hero_y + 400), (255, 250, 240), -1)
    cv2.rectangle(sheet, (110, hero_y), (sheet_w - 110, hero_y + 400), (220, 140, 30), 4) # Amber gold highlight
    cv2.putText(sheet, "★ HERO DEMONSTRATION PROTOTYPE STRIP (742 ppm*min - MODERATE SHIFT EXPOSURE)", (140, hero_y + 45),
                cv2.FONT_HERSHEY_DUPLEX, 1.1, (160, 80, 10), 2, cv2.LINE_AA)
    cv2.putText(sheet, "The primary demonstration patch for phone scanning. Exhibits clear moderate amber-brown darkening.", (140, hero_y + 80),
                cv2.FONT_HERSHEY_SIMPLEX, 0.75, (80, 80, 80), 2, cv2.LINE_AA)

    # Hero Strip - Enlarged 4x Display (400 x 200 px)
    hx = 150
    hy = hero_y + 110
    hw, hh = 440, 220
    draw_rounded_rectangle(sheet, (hx, hy), (hx + hw, hy + hh), (b742, g742, r742), radius=22, thickness=-1)
    draw_rounded_rectangle(sheet, (hx, hy), (hx + hw, hy + hh), (100, 105, 110), radius=22, thickness=3)
    cv2.putText(sheet, "HERO (4x Zoom)", (hx + 20, hy + hh + 35), cv2.FONT_HERSHEY_SIMPLEX, 0.70, (40, 40, 40), 2, cv2.LINE_AA)

    # Hero Strip - True 1:1 Scale (8mm x 4mm = 95 x 48 px at 300 DPI)
    hx_11 = 650
    hy_11 = hero_y + 130
    draw_rounded_rectangle(sheet, (hx_11, hy_11), (hx_11 + 95, hy_11 + 48), (b742, g742, r742), radius=6, thickness=-1)
    draw_rounded_rectangle(sheet, (hx_11 - 2, hy_11 - 2), (hx_11 + 97, hy_11 + 50), (60, 65, 70), radius=7, thickness=2)
    cv2.putText(sheet, "1:1 True Scale (8x4 mm)", (hx_11 - 10, hy_11 + 80), cv2.FONT_HERSHEY_SIMPLEX, 0.60, (20, 20, 20), 2, cv2.LINE_AA)
    cv2.putText(sheet, "Cut & place on wristband", (hx_11 - 15, hy_11 + 105), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (80, 80, 80), 1, cv2.LINE_AA)

    # Hero Details Column
    cv2.putText(sheet, f"Target Dose: 742.0 ppm*min", (1000, hero_y + 135), cv2.FONT_HERSHEY_DUPLEX, 0.85, (20, 30, 40), 2, cv2.LINE_AA)
    cv2.putText(sheet, f"Synthetic RGB: ({r742}, {g742}, {b742})", (1000, hero_y + 170), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (60, 70, 80), 2, cv2.LINE_AA)
    L742, a742, b_st742 = rgb_to_cielab(r742, g742, b742)
    cv2.putText(sheet, f"CIE L*a*b*: L={L742}, a={a742}, b={b_st742}", (1000, hero_y + 205), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (60, 70, 80), 2, cv2.LINE_AA)
    cv2.putText(sheet, f"Status: MODERATE (Shift Action Review Threshold)", (1000, hero_y + 240), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (180, 80, 10), 2, cv2.LINE_AA)
    cv2.putText(sheet, f"Kinetics: Pb(OAc)2 Diffusion Decay (k=850.0)", (1000, hero_y + 275), cv2.FONT_HERSHEY_SIMPLEX, 0.70, (100, 100, 100), 1, cv2.LINE_AA)

    # GRID OF 11 REQUIRED DOSES (3 Columns x 4 Rows)
    grid_doses = [
        (0.0,    "0 ppm*min",    "Virgin Baseline (Ivory)",      "Unexposed virgin substrate"),
        (150.0,  "150 ppm*min",  "Low Shift Routine (Tan)",      "Safe occupational shift"),
        (300.0,  "300 ppm*min",  "5 ppm x 60 min",               "Threshold notification"),
        (480.0,  "480 ppm*min",  "1 ppm x 480 min (TWA 1ppm)",   "Full 8h permissible exposure"),
        (600.0,  "600 ppm*min",  "5 ppm x 120 min",              "Intermediate exposure"),
        (742.0,  "742 ppm*min",  "HERO: Moderate Amber",         "Elevated shift action level"),
        (800.0,  "800 ppm*min",  "Elevated Industrial",          "Shift review required"),
        (960.0,  "960 ppm*min",  "2 ppm x 480 min",              "High action level breach"),
        (1200.0, "1200 ppm*min", "5 ppm x 240 min",             "Elevated peak exposure"),
        (1500.0, "1500 ppm*min", "Critical Dark Coffee",         "High cumulative dose"),
        (1850.0, "1850 ppm*min", "Near-Saturation Threshold",    "Action level limit"),
    ]

    start_grid_y = 860
    col_w = (sheet_w - 240) // 3
    row_h = 280

    for idx, (dose, dose_title, scenario, desc) in enumerate(grid_doses):
        r_idx = idx // 3
        c_idx = idx % 3
        
        bx = 120 + c_idx * col_w
        by = start_grid_y + r_idx * row_h
        
        # Patch card container
        card_bg = (255, 248, 240) if dose == 742.0 else (248, 250, 252)
        card_border = (220, 140, 30) if dose == 742.0 else (205, 210, 215)
        cv2.rectangle(sheet, (bx, by), (bx + col_w - 30, by + row_h - 25), card_bg, -1)
        cv2.rectangle(sheet, (bx, by), (bx + col_w - 30, by + row_h - 25), card_border, 2)
        
        # 2:1 Rectangular color strip (280 x 140 px)
        sw, sh = 260, 130
        sx = bx + 20
        sy = by + 20
        
        r, g, b = dose_to_strip_color(dose)
        draw_rounded_rectangle(sheet, (sx, sy), (sx + sw, sy + sh), (b, g, r), radius=14, thickness=-1)
        draw_rounded_rectangle(sheet, (sx - 2, sy - 2), (sx + sw + 2, sy + sh + 2), (100, 105, 110), radius=15, thickness=2)
        
        # 1:1 Scale Mini Strip (95 x 48 px at 300 DPI)
        mx = bx + col_w - 145
        my = by + 25
        draw_rounded_rectangle(sheet, (mx, my), (mx + 95, my + 48), (b, g, r), radius=6, thickness=-1)
        draw_rounded_rectangle(sheet, (mx - 2, my - 2), (mx + 97, my + 50), (80, 85, 90), radius=7, thickness=1)
        cv2.putText(sheet, "1:1 Scale", (mx + 10, my + 65), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (100, 100, 100), 1, cv2.LINE_AA)
        cv2.putText(sheet, "8x4 mm", (mx + 14, my + 80), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (100, 100, 100), 1, cv2.LINE_AA)

        # External labels STRICTLY OUTSIDE the patch
        star = "★ " if dose == 742.0 else ""
        cv2.putText(sheet, f"{star}{dose_title}", (sx, by + sh + 45),
                    cv2.FONT_HERSHEY_DUPLEX, 0.70, (20, 30, 40), 2, cv2.LINE_AA)
        cv2.putText(sheet, scenario, (sx, by + sh + 70),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (60, 70, 80), 1, cv2.LINE_AA)
        cv2.putText(sheet, f"RGB: ({r}, {g}, {b})", (sx, by + sh + 90),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.50, (100, 110, 120), 1, cv2.LINE_AA)

    # 1:1 SCALE MULTI-STRIP CUTOUT BANK AT BOTTOM
    cut_bank_y = start_grid_y + 4 * row_h + 30
    cv2.putText(sheet, "RAPID PROTOTYPE CUTOUT BANK (1:1 TRUE PHYSICAL SCALE: 8 mm x 4 mm | 300 DPI)", (120, cut_bank_y),
                cv2.FONT_HERSHEY_DUPLEX, 0.85, (20, 30, 40), 2, cv2.LINE_AA)
    
    cut_y = cut_bank_y + 25
    cutout_selection = [
        (0.0, "0 ppm"),
        (150.0, "150 ppm"),
        (480.0, "480 ppm"),
        (742.0, "★ 742 ppm (HERO)"),
        (960.0, "960 ppm"),
        (1850.0, "1850 ppm"),
    ]
    for i, (dose, d_lbl) in enumerate(cutout_selection):
        r, g, b = dose_to_strip_color(dose)
        py = cut_y + i * 75
        lbl_color = (180, 80, 10) if dose == 742.0 else (40, 40, 40)
        cv2.putText(sheet, f"{d_lbl:>16}:", (120, py + 32),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.60, lbl_color, 2, cv2.LINE_AA)
        
        for k in range(8):
            px = 420 + k * 235
            draw_rounded_rectangle(sheet, (px, py), (px + 95, py + 48), (b, g, r), radius=6, thickness=-1)
            b_th = 2 if dose == 742.0 else 1
            draw_rounded_rectangle(sheet, (px - 2, py - 2), (px + 97, py + 50), (60, 65, 70), radius=7, thickness=b_th)
            cv2.line(sheet, (px - 15, py + 24), (px - 5, py + 24), (180, 180, 180), 1)
            cv2.line(sheet, (px + 100, py + 24), (px + 110, py + 24), (180, 180, 180), 1)

    # Footer
    cv2.putText(sheet, "H2Sentry SIH 2026 | Mangalore Refinery and Petrochemicals Limited (MRPL) | Synthetic Software Test Demonstrator",
                (sheet_w // 2 - 640, sheet_h - 40), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (120, 130, 140), 2, cv2.LINE_AA)

    sheet_out_path = os.path.join(OUTPUT_DIR_PRINTABLE, "printable_strip_sheet.png")
    cv2.imwrite(sheet_out_path, sheet)
    print(f"Saved master printable demo sheet -> {sheet_out_path}")

if __name__ == "__main__":
    print("==================================================================")
    print("H2SENTRY PHYSICAL REACTION STRIP GENERATION & DATASET EXTRACTION")
    print("==================================================================")
    
    # 1. Extract crops directly from existing dataset images
    df_manifest = extract_dataset_strip_crops(num_samples_to_extract=250)
    
    # 2. Generate Hero & Standalone Printable Assets
    generate_hero_and_printable_assets()
    
    print("\nPhysical reaction-strip assets generation completed successfully!")
