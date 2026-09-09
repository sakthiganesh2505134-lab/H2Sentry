"""
H2Sentry Master Synthetic Wristband Dataset & Physical Strip Asset Generator
=============================================================================
DISCLAIMER:
All generated assets, images, colors, and dataset records are
SYNTHETIC SOFTWARE-VALIDATION DATA for prototype demonstration and testing.
It is NOT laboratory H2S calibration data, safety certification, or regulatory validation.

Generates:
1. Clean 8mm x 4mm (2:1 aspect ratio) physical reaction strip assets (data/calibration/physical_strips/)
2. Printable 300 DPI reaction strip sheet with external labels and safety disclaimers
3. 6,000 synthetic wristband images across 600 independent continuous chemical dose states:
   - 4,000 Train images (400 states x 10 photographic variations)
   - 1,000 Validation images (100 states x 10 photographic variations)
   - 1,000 Test images (100 states x 10 photographic variations)
4. Full OpenCV feature extraction via detector -> calibrator -> color_extractor pipeline
5. Metadata CSV and extracted ML feature CSV with strict chemical_state_id split isolation.
"""

import os
import sys
import math
import cv2
import numpy as np
import pandas as pd
from typing import Tuple, Dict, Any, List
from PIL import Image, ImageDraw, ImageFont

# Ensure project root is on sys.path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.cv.badge_generator import dose_to_strip_color, KNOWN_REFERENCE_PATCHES
from backend.cv.detector import detect_badge_regions
from backend.cv.calibrator import calibrate_reference_scale
from backend.cv.color_extractor import extract_strip_color_features, rgb_to_cielab, compute_delta_e_cielab, UNEXPOSED_BASELINE_LAB

RANDOM_SEED = 42

OUTPUT_DIR_CALIBRATION = os.path.join(PROJECT_ROOT, "data", "calibration")
OUTPUT_DIR_PHYSICAL_STRIPS = os.path.join(OUTPUT_DIR_CALIBRATION, "physical_strips")
OUTPUT_DIR_DATASET = os.path.join(OUTPUT_DIR_CALIBRATION, "synthetic_wristband_dataset")
METADATA_CSV_PATH = os.path.join(OUTPUT_DIR_CALIBRATION, "synthetic_wristband_metadata.csv")
FEATURE_CSV_PATH = os.path.join(OUTPUT_DIR_CALIBRATION, "synthetic_feature_dataset.csv")

# Standard exposure anchors (ppm·min)
ANCHOR_DOSES = [0.0, 48.0, 150.0, 240.0, 480.0, 742.0, 960.0, 1850.0, 1920.0]

def draw_rounded_rectangle(img: np.ndarray, top_left: Tuple[int, int], bottom_right: Tuple[int, int], color: Tuple[int, int, int], radius: int = 10, thickness: int = -1):
    """Draws a rounded rectangle on an OpenCV image."""
    x1, y1 = top_left
    x2, y2 = bottom_right
    r = min(radius, (x2 - x1) // 2, (y2 - y1) // 2)
    
    if thickness == -1:
        # Filled rounded rectangle
        cv2.rectangle(img, (x1 + r, y1), (x2 - r, y2), color, -1)
        cv2.rectangle(img, (x1, y1 + r), (x2, y2 - r), color, -1)
        cv2.circle(img, (x1 + r, y1 + r), r, color, -1)
        cv2.circle(img, (x2 - r, y1 + r), r, color, -1)
        cv2.circle(img, (x1 + r, y2 - r), r, color, -1)
        cv2.circle(img, (x2 - r, y2 - r), r, color, -1)
    else:
        # Border only
        cv2.line(img, (x1 + r, y1), (x2 - r, y1), color, thickness)
        cv2.line(img, (x1 + r, y2), (x2 - r, y2), color, thickness)
        cv2.line(img, (x1, y1 + r), (x1, y2 - r), color, thickness)
        cv2.line(img, (x2, y1 + r), (x2, y2 - r), color, thickness)
        cv2.ellipse(img, (x1 + r, y1 + r), (r, r), 180, 0, 90, color, thickness)
        cv2.ellipse(img, (x2 - r, y1 + r), (r, r), 270, 0, 90, color, thickness)
        cv2.ellipse(img, (x1 + r, y2 - r), (r, r), 90, 0, 90, color, thickness)
        cv2.ellipse(img, (x2 - r, y2 - r), (r, r), 0, 0, 90, color, thickness)

def generate_physical_strip_image(dose_ppm_min: float, width: int = 1600, height: int = 800, corner_radius: int = 60) -> np.ndarray:
    """
    Renders a high-resolution, clean 2:1 physical reaction strip asset (8mm x 4mm aspect ratio).
    Contains pure synthetic reaction color with rounded corners and transparent/white boundary.
    NO text, NO numbers, NO RGB inside the reaction strip.
    """
    r, g, b = dose_to_strip_color(dose_ppm_min)
    bgr_color = (b, g, r)
    
    # 4-channel RGBA image for clean alpha rounded corners
    img = np.zeros((height, width, 4), dtype=np.uint8)
    
    # Draw rounded rectangle in RGBA
    # Center reaction patch with slight border margin
    margin = 8
    x1, y1 = margin, margin
    x2, y2 = width - margin, height - margin
    r_corner = corner_radius
    
    color_rgba = (b, g, r, 255)
    border_rgba = (max(0, b - 30), max(0, g - 30), max(0, r - 30), 255)
    
    # Main filled area
    cv2.rectangle(img, (x1 + r_corner, y1), (x2 - r_corner, y2), color_rgba, -1)
    cv2.rectangle(img, (x1, y1 + r_corner), (x2, y2 - r_corner), color_rgba, -1)
    cv2.circle(img, (x1 + r_corner, y1 + r_corner), r_corner, color_rgba, -1)
    cv2.circle(img, (x2 - r_corner, y1 + r_corner), r_corner, color_rgba, -1)
    cv2.circle(img, (x1 + r_corner, y2 - r_corner), r_corner, color_rgba, -1)
    cv2.circle(img, (x2 - r_corner, y2 - r_corner), r_corner, color_rgba, -1)
    
    # Subtle edge border
    cv2.ellipse(img, (x1 + r_corner, y1 + r_corner), (r_corner, r_corner), 180, 0, 90, border_rgba, 2)
    cv2.ellipse(img, (x2 - r_corner, y1 + r_corner), (r_corner, r_corner), 270, 0, 90, border_rgba, 2)
    cv2.ellipse(img, (x1 + r_corner, y2 - r_corner), (r_corner, r_corner), 90, 0, 90, border_rgba, 2)
    cv2.ellipse(img, (x2 - r_corner, y2 - r_corner), (r_corner, r_corner), 0, 0, 90, border_rgba, 2)
    cv2.line(img, (x1 + r_corner, y1), (x2 - r_corner, y1), border_rgba, 2)
    cv2.line(img, (x1 + r_corner, y2), (x2 - r_corner, y2), border_rgba, 2)
    cv2.line(img, (x1, y1 + r_corner), (x1, y2 - r_corner), border_rgba, 2)
    cv2.line(img, (x2, y1 + r_corner), (x2, y2 - r_corner), border_rgba, 2)
    
    return img

def generate_printable_strip_sheet(output_path: str):
    """
    Renders a high-resolution printable sheet containing all anchor strips with cutout guidelines,
    exterior labels, physical 8mm x 4mm scale guide, and prominent software-validation disclaimers.
    """
    # 2480 x 3508 (A4 at 300 DPI)
    sheet_w, sheet_h = 2480, 3508
    sheet = np.ones((sheet_h, sheet_w, 3), dtype=np.uint8) * 255
    
    # Header Title & Disclaimers
    cv2.putText(sheet, "H2SENTRY - SYNTHETIC PROTOTYPE REACTION STRIP SHEET", (120, 150),
                cv2.FONT_HERSHEY_DUPLEX, 1.8, (20, 30, 40), 3, cv2.LINE_AA)
    cv2.putText(sheet, "PHYSICAL SPECIFICATION: 8 mm x 4 mm (2:1 Aspect Ratio) Rounded-Corner Replaceable Sensor Patch", (120, 220),
                cv2.FONT_HERSHEY_SIMPLEX, 1.0, (70, 80, 90), 2, cv2.LINE_AA)
    
    # Prominent Alert Box
    cv2.rectangle(sheet, (110, 260), (sheet_w - 110, 420), (230, 235, 245), -1)
    cv2.rectangle(sheet, (110, 260), (sheet_w - 110, 420), (40, 50, 180), 3)
    cv2.putText(sheet, "CRITICAL SCIENTIFIC & SAFETY DISCLOSURE:", (140, 310),
                cv2.FONT_HERSHEY_DUPLEX, 1.0, (30, 40, 160), 2, cv2.LINE_AA)
    cv2.putText(sheet, "SYNTHETIC SOFTWARE VALIDATION ONLY - NOT H2S-EXPOSED MATERIAL", (140, 360),
                cv2.FONT_HERSHEY_DUPLEX, 1.2, (20, 20, 180), 3, cv2.LINE_AA)
    cv2.putText(sheet, "This sheet provides deterministic colorimetric demonstration strips for physical prototype alignment.", (140, 400),
                cv2.FONT_HERSHEY_SIMPLEX, 0.85, (60, 60, 70), 2, cv2.LINE_AA)

    # Grid of Anchors (3 columns x 3 rows)
    grid_anchors = [
        (0.0, "0 ppm*min", "Virgin Baseline (Ivory)", "Unexposed baseline substrate"),
        (48.0, "48 ppm*min", "0.1 ppm x 480 min", "Trace 8h shift exposure"),
        (150.0, "150 ppm*min", "Low Exposure (Tan)", "Safe occupational routine"),
        (240.0, "240 ppm*min", "0.5 ppm x 480 min", "Action-tracking range"),
        (480.0, "480 ppm*min", "1.0 ppm x 480 min (TWA 1ppm)", "Shift allowable limit"),
        (742.0, "742 ppm*min", "Moderate (Amber-Brown)", "Elevated review range"),
        (960.0, "960 ppm*min", "2.0 ppm x 480 min", "Action level threshold"),
        (1850.0, "1850 ppm*min", "High Exposure (Coffee)", "Critical action level"),
        (1920.0, "1920 ppm*min", "4.0 ppm x 480 min", "Near-saturation threshold"),
    ]
    
    start_y = 520
    col_w = (sheet_w - 240) // 3
    row_h = 300
    
    # 8mm at 300 DPI is approx 94.5 pixels, 4mm is 47.2 pixels
    # For high-visibility cutout on demo sheet, we provide both 1x physical scale (8x4mm) and 4x enlarged presentation scale (32x16mm)
    for idx, (dose, dose_title, scenario, desc) in enumerate(grid_anchors):
        r_idx = idx // 3
        c_idx = idx % 3
        
        bx = 120 + c_idx * col_w
        by = start_y + r_idx * row_h
        
        # Patch bounding box
        cv2.rectangle(sheet, (bx, by), (bx + col_w - 40, by + row_h - 30), (245, 248, 250), -1)
        cv2.rectangle(sheet, (bx, by), (bx + col_w - 40, by + row_h - 30), (200, 205, 210), 2)
        
        # Color Strip Patch (Enlarged 4x for easy cutout and presentation: 360 x 180 px -> 2:1 aspect ratio)
        strip_w, strip_h = 320, 160
        sx = bx + 25
        sy = by + 25
        
        r, g, b = dose_to_strip_color(dose)
        draw_rounded_rectangle(sheet, (sx, sy), (sx + strip_w, sy + strip_h), (b, g, r), radius=16, thickness=-1)
        # Cutout dotted guide border around strip
        draw_rounded_rectangle(sheet, (sx - 4, sy - 4), (sx + strip_w + 4, sy + strip_h + 4), (100, 105, 110), radius=18, thickness=2)
        
        # Actual 1:1 Physical Scale Mini Strip (8mm x 4mm = 95 x 48 px at 300 DPI)
        mx = bx + col_w - 150
        my = by + 30
        draw_rounded_rectangle(sheet, (mx, my), (mx + 95, my + 48), (b, g, r), radius=6, thickness=-1)
        draw_rounded_rectangle(sheet, (mx - 2, my - 2), (mx + 97, my + 50), (80, 85, 90), radius=7, thickness=1)
        cv2.putText(sheet, "1:1 Scale", (mx + 10, my + 65), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (100, 100, 100), 1, cv2.LINE_AA)
        cv2.putText(sheet, "8x4 mm", (mx + 14, my + 80), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (100, 100, 100), 1, cv2.LINE_AA)

        # External text labels STRICTLY OUTSIDE the patch
        cv2.putText(sheet, f"DOSE: {dose_title}", (sx, by + strip_h + 50),
                    cv2.FONT_HERSHEY_DUPLEX, 0.75, (20, 30, 40), 2, cv2.LINE_AA)
        cv2.putText(sheet, scenario, (sx, by + strip_h + 75),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.60, (60, 70, 80), 1, cv2.LINE_AA)
        cv2.putText(sheet, f"RGB: ({r}, {g}, {b})", (sx, by + strip_h + 95),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (100, 110, 120), 1, cv2.LINE_AA)

    # Multi-Strip Cutting Bar (Row of 6 identical mini 8x4mm strips for each anchor for quick scissors cutout)
    cutting_bar_y = start_y + 3 * row_h + 60
    cv2.putText(sheet, "RAPID PROTOTYPE REACTION STRIP CUTOUT BANK (1:1 TRUE PHYSICAL SCALE: 8 mm x 4 mm)", (120, cutting_bar_y),
                cv2.FONT_HERSHEY_DUPLEX, 0.85, (20, 30, 40), 2, cv2.LINE_AA)
    
    cut_y = cutting_bar_y + 30
    for i, (dose, dose_title, _, _) in enumerate(grid_anchors):
        r, g, b = dose_to_strip_color(dose)
        py = cut_y + i * 85
        cv2.putText(sheet, f"{dose_title.split()[0]:>5} ppm*min:", (120, py + 35),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.65, (40, 40, 40), 2, cv2.LINE_AA)
        
        for k in range(8):
            px = 380 + k * 230
            # 8mm x 4mm physical cutout rectangle (95 x 48 px at 300 DPI)
            draw_rounded_rectangle(sheet, (px, py), (px + 95, py + 48), (b, g, r), radius=6, thickness=-1)
            draw_rounded_rectangle(sheet, (px - 2, py - 2), (px + 97, py + 50), (120, 125, 130), radius=7, thickness=1)
            # Dotted scissor guidelines
            cv2.line(sheet, (px - 15, py + 24), (px - 5, py + 24), (180, 180, 180), 1)
            cv2.line(sheet, (px + 100, py + 24), (px + 110, py + 24), (180, 180, 180), 1)

    # Footer
    cv2.putText(sheet, "H2Sentry SIH2026 | Mangalore Refinery and Petrochemicals Limited (MRPL) | Synthetic Software Test Harness",
                (sheet_w // 2 - 620, sheet_h - 60), cv2.FONT_HERSHEY_SIMPLEX, 0.70, (120, 130, 140), 2, cv2.LINE_AA)
    
    cv2.imwrite(output_path, sheet)
    print(f"Generated printable strip sheet: {output_path}")

def render_wristband_badge_image(
    badge_id: str,
    dose_ppm_min: float,
    expiry_status: str = "VALID",
    lighting_factor: float = 1.0,
    color_temp_tint: Tuple[float, float, float] = (1.0, 1.0, 1.0),
    noise_sigma: float = 0.0,
    blur_ksize: int = 0,
    rotation_deg: float = 0.0,
    perspective_tilt: float = 0.0,
    include_ref_scale: bool = True,
    include_strip: bool = True,
    width: int = 800,
    height: int = 480,
    rng: np.random.Generator = None
) -> np.ndarray:
    """
    Renders a realistic synthetic dosimeter badge image matching the physical prototype layout:
    - 4 corner fiducials
    - 6-patch optical reference calibration scale
    - Small 8mm x 4mm (2:1 aspect ratio, rounded corners) reaction strip placed inside the reaction well
    - Expiry indicator
    - Header branding and badge ID
    - Controlled photographic variation (lighting, tint, sensor noise, blur, tilt)
    """
    if rng is None:
        rng = np.random.default_rng()

    # Base badge canvas
    img = np.ones((height, width, 3), dtype=np.uint8) * 248
    
    # Outer wristband/holder housing (dark titanium matte gray border)
    cv2.rectangle(img, (0, 0), (width, height), (38, 42, 46), -1)
    
    # Badge insert area
    margin = 30
    cv2.rectangle(img, (margin, margin), (width - margin, height - margin), (250, 250, 250), -1)
    cv2.rectangle(img, (margin, margin), (width - margin, height - margin), (180, 185, 190), 2)
    
    # 4 Corner Alignment Fiducial Targets
    fiducial_size = 28
    corners = [
        (margin + 12, margin + 12),
        (width - margin - 12 - fiducial_size, margin + 12),
        (margin + 12, height - margin - 12 - fiducial_size),
        (width - margin - 12 - fiducial_size, height - margin - 12 - fiducial_size),
    ]
    for (cx, cy) in corners:
        cv2.rectangle(img, (cx, cy), (cx + fiducial_size, cy + fiducial_size), (20, 20, 20), -1)
        cv2.rectangle(img, (cx + 6, cy + 6), (cx + fiducial_size - 6, cy + fiducial_size - 6), (240, 240, 240), -1)
        cv2.rectangle(img, (cx + 10, cy + 10), (cx + fiducial_size - 10, cy + fiducial_size - 10), (20, 20, 20), -1)
        
    # Header Branding & Metadata
    cv2.putText(img, "MRPL OCCUPATIONAL SAFETY", (margin + 60, margin + 30),
                cv2.FONT_HERSHEY_DUPLEX, 0.55, (40, 50, 60), 1, cv2.LINE_AA)
    cv2.putText(img, "H2SENTRY DOSIMETER", (margin + 60, margin + 55),
                cv2.FONT_HERSHEY_DUPLEX, 0.85, (15, 25, 35), 2, cv2.LINE_AA)
    cv2.putText(img, f"ID: {badge_id}", (width - margin - 230, margin + 35),
                cv2.FONT_HERSHEY_SIMPLEX, 0.55, (60, 70, 80), 1, cv2.LINE_AA)
    cv2.putText(img, "CHEM: Pb(OAc)2-MATRIX", (width - margin - 230, margin + 55),
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, (100, 110, 120), 1, cv2.LINE_AA)
    
    # Divider line
    cv2.line(img, (margin + 20, margin + 70), (width - margin - 20, margin + 70), (210, 215, 220), 1)

    # ------------------------------------------------------------------
    # Zone 1: Reference Color Scale (Upper Section)
    # ------------------------------------------------------------------
    ref_x, ref_y, ref_w, ref_h = margin + 30, margin + 85, width - 2 * margin - 60, 70
    cv2.rectangle(img, (ref_x, ref_y), (ref_x + ref_w, ref_y + ref_h), (235, 238, 240), -1)
    cv2.rectangle(img, (ref_x, ref_y), (ref_x + ref_w, ref_y + ref_h), (160, 165, 170), 2)
    
    if include_ref_scale:
        cv2.putText(img, "[REF SCALE] OPTICAL CALIBRATION TARGET", (ref_x + 10, ref_y - 6),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.42, (80, 90, 100), 1, cv2.LINE_AA)
        
        patches = [
            ("W", (245, 245, 245)),
            ("LG", (180, 180, 180)),
            ("MG", (120, 120, 120)),
            ("DG", (50, 50, 50)),
            ("CY", (30, 180, 210)),
            ("AM", (220, 140, 30)),
        ]
        num_p = len(patches)
        patch_w = (ref_w - (num_p + 1) * 12) // num_p
        patch_h = ref_h - 24
        
        for idx, (label, (r_val, g_val, b_val)) in enumerate(patches):
            px = ref_x + 12 + idx * (patch_w + 12)
            py = ref_y + 12
            cv2.rectangle(img, (px, py), (px + patch_w, py + patch_h), (b_val, g_val, r_val), -1)
            cv2.rectangle(img, (px, py), (px + patch_w, py + patch_h), (90, 95, 100), 1)
            cv2.putText(img, label, (px + patch_w // 2 - 8, py + patch_h - 4),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.35, (10, 10, 10) if r_val > 100 else (240, 240, 240), 1)
    else:
        cv2.putText(img, "[MISSING CALIBRATION TARGET]", (ref_x + 10, ref_y + 40),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (140, 145, 150), 1, cv2.LINE_AA)

    # ------------------------------------------------------------------
    # Zone 2: Small 8mm x 4mm (2:1 aspect ratio) Reaction Strip in Reaction Well
    # ------------------------------------------------------------------
    strip_x, strip_y = margin + 30, margin + 185
    strip_w, strip_h = width - 2 * margin - 260, 180
    cv2.rectangle(img, (strip_x, strip_y), (strip_x + strip_w, strip_y + strip_h), (240, 242, 245), -1)
    cv2.rectangle(img, (strip_x, strip_y), (strip_x + strip_w, strip_y + strip_h), (140, 145, 150), 2)
    cv2.putText(img, "[REACTION STRIP] H2S CHEMICAL EXPOSURE MATRIX (8x4mm 2:1)", (strip_x + 10, strip_y - 8),
                cv2.FONT_HERSHEY_SIMPLEX, 0.42, (80, 90, 100), 1, cv2.LINE_AA)
    
    if include_strip:
        # Chemical reaction strip with 2:1 aspect ratio (e.g. 260 x 130 px centered in the well)
        patch_w = 260
        patch_h = 130
        mx = strip_x + (strip_w - patch_w) // 2
        my = strip_y + (strip_h - patch_h) // 2
        
        r_strip, g_strip, b_strip = dose_to_strip_color(dose_ppm_min)
        reagent_bgr = (b_strip, g_strip, r_strip)
        
        # Draw rounded 2:1 reaction strip
        draw_rounded_rectangle(img, (mx, my), (mx + patch_w, my + patch_h), reagent_bgr, radius=12, thickness=-1)
        draw_rounded_rectangle(img, (mx, my), (mx + patch_w, my + patch_h), (100, 105, 110), radius=12, thickness=2)
        
        # Subtle holder clips on left/right ends of the 8x4mm strip
        cv2.rectangle(img, (mx - 4, my + 30), (mx + 8, my + patch_h - 30), (160, 165, 170), -1)
        cv2.rectangle(img, (mx + patch_w - 8, my + 30), (mx + patch_w + 4, my + patch_h - 30), (160, 165, 170), -1)
    else:
        cv2.putText(img, "[EMPTY REACTION WELL - NO STRIP]", (strip_x + 30, strip_y + 90),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (140, 145, 150), 1, cv2.LINE_AA)

    # ------------------------------------------------------------------
    # Zone 3: Expiry / Shelf-Life Indicator (Right Lower Section)
    # ------------------------------------------------------------------
    exp_x, exp_y = width - margin - 200, margin + 185
    exp_w, exp_h = 170, 180
    cv2.rectangle(img, (exp_x, exp_y), (exp_x + exp_w, exp_y + exp_h), (240, 242, 245), -1)
    cv2.rectangle(img, (exp_x, exp_y), (exp_x + exp_w, exp_y + exp_h), (140, 145, 150), 2)
    cv2.putText(img, "[EXPIRY] SHELF-LIFE", (exp_x + 8, exp_y - 8),
                cv2.FONT_HERSHEY_SIMPLEX, 0.42, (80, 90, 100), 1, cv2.LINE_AA)
    
    dot_center = (exp_x + exp_w // 2, exp_y + exp_h // 2 - 10)
    dot_radius = 36
    
    if expiry_status == "VALID":
        exp_bgr = (60, 200, 40)
        exp_label = "VALID"
        exp_text_color = (20, 140, 10)
    elif expiry_status == "EXPIRING_SOON":
        exp_bgr = (30, 180, 240)
        exp_label = "EXPIRING"
        exp_text_color = (10, 120, 200)
    else:
        exp_bgr = (40, 40, 220)
        exp_label = "EXPIRED"
        exp_text_color = (30, 30, 180)
        
    cv2.circle(img, dot_center, dot_radius, exp_bgr, -1)
    cv2.circle(img, dot_center, dot_radius, (80, 85, 90), 2)
    cv2.circle(img, dot_center, dot_radius - 8, (255, 255, 255), 1)
    
    cv2.putText(img, exp_label, (exp_x + exp_w // 2 - 32, exp_y + exp_h - 22),
                cv2.FONT_HERSHEY_DUPLEX, 0.55, exp_text_color, 1, cv2.LINE_AA)
    cv2.putText(img, "SHELF VALIDITY", (exp_x + exp_w // 2 - 40, exp_y + exp_h - 8),
                cv2.FONT_HERSHEY_SIMPLEX, 0.35, (100, 110, 120), 1, cv2.LINE_AA)

    # ------------------------------------------------------------------
    # Apply Photographic & Environmental Variations
    # ------------------------------------------------------------------
    out = img.astype(np.float32)
    
    # 1. Color temperature tint
    out[:, :, 0] *= color_temp_tint[2] # B
    out[:, :, 1] *= color_temp_tint[1] # G
    out[:, :, 2] *= color_temp_tint[0] # R
    
    # 2. Lighting intensity
    out *= lighting_factor
    
    # 3. Mild gradient shadow (optional simulation of uneven light across phone)
    if rng.random() > 0.5:
        grad = np.linspace(0.92, 1.05, width).reshape(1, width, 1)
        out *= grad
        
    # 4. Sensor noise
    if noise_sigma > 0:
        noise = rng.normal(0, noise_sigma, out.shape)
        out += noise
        
    out = np.clip(out, 0, 255).astype(np.uint8)
    
    # 5. Optical blur
    if blur_ksize > 0:
        k = blur_ksize if blur_ksize % 2 == 1 else blur_ksize + 1
        out = cv2.GaussianBlur(out, (k, k), 0)
        
    # 6. Rotation (slight phone tilt)
    if abs(rotation_deg) > 0.1:
        M_rot = cv2.getRotationMatrix2D((width / 2, height / 2), rotation_deg, 1.0)
        out = cv2.warpAffine(out, M_rot, (width, height), borderMode=cv2.BORDER_REPLICATE)

    return out

def generate_full_synthetic_wristband_dataset(num_train_states: int = 400, num_val_states: int = 100, num_test_states: int = 100, variations_per_state: int = 10):
    """
    Generates complete synthetic wristband image dataset and runs the CV pipeline to extract features.
    """
    rng = np.random.default_rng(seed=RANDOM_SEED)
    
    os.makedirs(OUTPUT_DIR_PHYSICAL_STRIPS, exist_ok=True)
    os.makedirs(os.path.join(OUTPUT_DIR_DATASET, "train"), exist_ok=True)
    os.makedirs(os.path.join(OUTPUT_DIR_DATASET, "validation"), exist_ok=True)
    os.makedirs(os.path.join(OUTPUT_DIR_DATASET, "test"), exist_ok=True)
    
    # 1. Generate Standalone Physical Strip Images
    print("--- Step 1: Generating Standalone Physical Strip Assets (8mm x 4mm, 2:1) ---")
    for anchor in ANCHOR_DOSES:
        strip_img = generate_physical_strip_image(anchor, width=1600, height=800, corner_radius=60)
        fname = f"strip_{int(round(anchor)):04d}.png"
        fpath = os.path.join(OUTPUT_DIR_PHYSICAL_STRIPS, fname)
        cv2.imwrite(fpath, strip_img)
        print(f"Generated clean physical strip: {fname} (Dose: {anchor} ppm·min)")
        
    # 2. Generate Printable Strip Sheet
    print("--- Step 2: Generating Printable Strip Sheet ---")
    printable_path = os.path.join(OUTPUT_DIR_PHYSICAL_STRIPS, "printable_strip_sheet.png")
    generate_printable_strip_sheet(printable_path)
    
    # 3. Create Independent Continuous Chemical Dose States
    print("--- Step 3: Generating Independent Chemical States ---")
    total_states = num_train_states + num_val_states + num_test_states
    
    def sample_states(n_states: int) -> np.ndarray:
        # Stratified sampling across dose spectrum:
        # 8% baseline unexposed (0.0 ppm·min)
        # 22% low (0.5 - 250 ppm·min)
        # 35% moderate (250 - 1000 ppm·min)
        # 35% high/saturation (1000 - 2000 ppm·min)
        n0 = int(n_states * 0.08)
        n_l = int(n_states * 0.22)
        n_m = int(n_states * 0.35)
        n_h = n_states - (n0 + n_l + n_m)
        
        d_zero = np.zeros(n0, dtype=np.float64)
        d_low = rng.uniform(0.5, 250.0, size=n_l)
        d_mod = rng.uniform(250.0, 1000.0, size=n_m)
        d_high = rng.uniform(1000.0, 2000.0, size=n_h)
        
        all_d = np.concatenate([d_zero, d_low, d_mod, d_high])
        rng.shuffle(all_d)
        return all_d

    train_doses = sample_states(num_train_states)
    val_doses = sample_states(num_val_states)
    test_doses = sample_states(num_test_states)
    
    # Photographic variation parameter presets
    lighting_presets = [
        {"desc": "neutral_daylight", "factor": 1.00, "tint": (1.00, 1.00, 1.00), "noise": 0.5, "blur": 0, "rot": 0.0},
        {"desc": "warm_tungsten",   "factor": 0.92, "tint": (1.18, 0.96, 0.82), "noise": 1.0, "blur": 0, "rot": 1.2},
        {"desc": "cool_fluorescent","factor": 1.05, "tint": (0.88, 0.98, 1.14), "noise": 0.8, "blur": 0, "rot": -1.5},
        {"desc": "bright_diffuse",  "factor": 1.22, "tint": (1.02, 1.02, 1.02), "noise": 0.3, "blur": 0, "rot": 0.5},
        {"desc": "dim_underexposed","factor": 0.72, "tint": (0.95, 0.95, 0.95), "noise": 2.2, "blur": 0, "rot": -0.8},
        {"desc": "mild_camera_blur","factor": 1.00, "tint": (1.00, 1.00, 1.00), "noise": 1.2, "blur": 3, "rot": 0.0},
        {"desc": "warm_dim_light",  "factor": 0.80, "tint": (1.15, 0.98, 0.85), "noise": 1.8, "blur": 0, "rot": 2.0},
        {"desc": "cool_bright_light","factor": 1.15, "tint": (0.92, 0.98, 1.10), "noise": 0.6, "blur": 0, "rot": -2.2},
        {"desc": "high_sensor_noise","factor": 0.90, "tint": (1.00, 1.00, 1.00), "noise": 3.0, "blur": 0, "rot": 0.3},
        {"desc": "mild_angle_shift","factor": 1.02, "tint": (1.04, 0.98, 0.96), "noise": 1.0, "blur": 0, "rot": 2.8},
    ]

    splits = [
        ("train", train_doses, num_train_states),
        ("validation", val_doses, num_val_states),
        ("test", test_doses, num_test_states),
    ]

    metadata_records = []
    feature_records = []
    
    global_img_count = 0
    total_expected = total_states * variations_per_state
    print(f"--- Step 4: Generating {total_expected} Synthetic Wristband Images & Running OpenCV Feature Extraction ---")

    for split_name, doses, n_st in splits:
        for st_idx, dose in enumerate(doses):
            chem_state_id = f"CHEM-{split_name[:2].upper()}-{st_idx+1:04d}"
            base_r, base_g, base_b = dose_to_strip_color(dose)
            
            for var_idx in range(variations_per_state):
                global_img_count += 1
                img_id = f"img_{split_name}_{st_idx+1:04d}_var{var_idx+1:02d}"
                badge_id = f"H2S-{split_name[:3].upper()}-{st_idx+1:04d}"
                
                preset = lighting_presets[var_idx % len(lighting_presets)]
                # Add slight random jitter
                lf = preset["factor"] + rng.uniform(-0.03, 0.03)
                tint = (
                    preset["tint"][0] + rng.uniform(-0.02, 0.02),
                    preset["tint"][1] + rng.uniform(-0.02, 0.02),
                    preset["tint"][2] + rng.uniform(-0.02, 0.02),
                )
                ns = max(0.0, preset["noise"] + rng.uniform(-0.2, 0.2))
                rot = preset["rot"] + rng.uniform(-0.3, 0.3)
                blur_k = preset["blur"]
                
                # Environmental variations (simulated ambient state)
                temp_c = float(round(25.0 + rng.uniform(-6.0, 10.0), 1))
                rh_pct = float(round(50.0 + rng.uniform(-20.0, 30.0), 1))
                age_days = float(round(14.0 + rng.uniform(-10.0, 25.0), 1))
                
                # Render complete synthetic wristband image
                badge_img = render_wristband_badge_image(
                    badge_id=badge_id,
                    dose_ppm_min=dose,
                    expiry_status="VALID",
                    lighting_factor=lf,
                    color_temp_tint=tint,
                    noise_sigma=ns,
                    blur_ksize=blur_k,
                    rotation_deg=rot,
                    rng=rng
                )
                
                # Save image file in split folder
                img_rel_path = os.path.join("synthetic_wristband_dataset", split_name, f"{img_id}.png")
                img_full_path = os.path.join(OUTPUT_DIR_CALIBRATION, img_rel_path)
                cv2.imwrite(img_full_path, badge_img)
                
                # Record image metadata
                meta_row = {
                    "image_id": img_id,
                    "chemical_state_id": chem_state_id,
                    "split": split_name,
                    "dose_ppm_min": round(dose, 2),
                    "base_strip_r": base_r,
                    "base_strip_g": base_g,
                    "base_strip_b": base_b,
                    "lighting_condition": preset["desc"],
                    "lighting_factor": round(lf, 3),
                    "tint_r": round(tint[0], 3),
                    "tint_g": round(tint[1], 3),
                    "tint_b": round(tint[2], 3),
                    "noise_sigma": round(ns, 2),
                    "blur_ksize": blur_k,
                    "rotation_deg": round(rot, 2),
                    "temperature_c": temp_c,
                    "humidity_pct": rh_pct,
                    "strip_age_days": age_days,
                    "image_path": img_rel_path
                }
                metadata_records.append(meta_row)
                
                # ------------------------------------------------------------------
                # Run Real OpenCV Pipeline to extract calibrated ML features
                # ------------------------------------------------------------------
                detection_result = detect_badge_regions(badge_img)
                if not detection_result.success:
                    print(f"Warning: detection failed for {img_id}")
                    continue
                    
                ref_crop = detection_result.cropped_regions.get("reference")
                calibrator = calibrate_reference_scale(ref_crop)
                
                strip_crop = detection_result.cropped_regions.get("reaction_strip")
                color_features = extract_strip_color_features(strip_crop, calibrator)
                
                if color_features.get("success", False):
                    cal_rgb = color_features.get("calibrated_rgb", {})
                    cielab = color_features.get("cielab", {})
                    hsv = color_features.get("hsv", {})
                    
                    feat_row = {
                        "chemical_state_id": chem_state_id,
                        "image_id": img_id,
                        "split": split_name,
                        "dose_ppm_min": round(dose, 2),
                        "cal_r": cal_rgb.get("r", base_r),
                        "cal_g": cal_rgb.get("g", base_g),
                        "cal_b": cal_rgb.get("b", base_b),
                        "L_star": cielab.get("L_star", 96.0),
                        "a_star": cielab.get("a_star", 0.0),
                        "b_star": cielab.get("b_star", 0.0),
                        "hue": hsv.get("hue_deg", 0.0),
                        "sat": hsv.get("saturation_pct", 0.0),
                        "val": hsv.get("value_pct", 100.0),
                        "delta_e": color_features.get("delta_e_baseline", 0.0),
                        "uniformity_score": color_features.get("uniformity_score", 0.9),
                        "noise_std": color_features.get("noise_std", 1.0),
                        "temperature_c": temp_c,
                        "humidity_pct": rh_pct,
                        "strip_age_days": age_days
                    }
                    feature_records.append(feat_row)
                else:
                    print(f"Warning: feature extraction failed for {img_id}")
                    
            if (st_idx + 1) % 50 == 0 or (st_idx + 1) == n_st:
                print(f"[{split_name.upper()}] Processed {st_idx+1}/{n_st} states ({global_img_count}/{total_expected} images)")

    # Save CSVs
    df_meta = pd.DataFrame(metadata_records)
    df_feat = pd.DataFrame(feature_records)
    
    df_meta.to_csv(METADATA_CSV_PATH, index=False)
    df_feat.to_csv(FEATURE_CSV_PATH, index=False)
    
    print(f"\n========================================================")
    print(f"SUCCESSFULLY GENERATED MASTER DATASET ASSETS:")
    print(f"Total Metadata Rows: {len(df_meta)}")
    print(f"Total Feature Rows: {len(df_feat)}")
    print(f"Train samples: {len(df_feat[df_feat['split'] == 'train'])}")
    print(f"Validation samples: {len(df_feat[df_feat['split'] == 'validation'])}")
    print(f"Test samples: {len(df_feat[df_feat['split'] == 'test'])}")
    print(f"Saved Metadata CSV -> {METADATA_CSV_PATH}")
    print(f"Saved Feature CSV -> {FEATURE_CSV_PATH}")
    print(f"========================================================\n")

if __name__ == "__main__":
    generate_full_synthetic_wristband_dataset()
