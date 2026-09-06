"""
H2Sentry Synthetic Badge Generator
Generates realistic, deterministic physical badge mockups with:
- Corner fiducials for geometric alignment / detection
- Printed 6-patch reference color scale (for lighting calibration)
- Passive chemical H2S reaction strip (color kinetics based on dose ppm·min)
- Separate chemical shelf-life / expiry indicator
- Industrial branding (MRPL / H2Sentry)
"""

import cv2
import numpy as np
import os
from typing import Tuple, Optional

# Standard reference patch true reflectance RGB values (under standard D65 illuminant)
KNOWN_REFERENCE_PATCHES = {
    "white": (245, 245, 245),
    "light_gray": (180, 180, 180),
    "mid_gray": (120, 120, 120),
    "dark_gray": (50, 50, 50),
    "cyan": (30, 180, 210),
    "amber": (220, 140, 30),
}

def dose_to_strip_color(dose_ppm_min: float) -> Tuple[int, int, int]:
    """
    Deterministic kinetic colorimetric model for passive H2S strip:
    Metal-salt / Nano-composite reaction kinetics:
    - 0 ppm·min: Cream / Ivory (245, 240, 220)
    - 150 ppm·min (Low): Light Tan / Ochre (215, 195, 155)
    - 742 ppm·min (Moderate): Amber / Golden Brown (160, 120, 65)
    - 1850 ppm·min (High): Dark Coffee Brown (85, 55, 30)
    - 3000+ ppm·min (Critical): Deep Blackish-Brown (40, 28, 20)
    """
    dose = max(0.0, float(dose_ppm_min))
    # Normalized logarithmic/kinetic progression
    # Rate constant k for passive diffusion
    decay = np.exp(-dose / 850.0)
    
    # Base color (unexposed)
    r0, g0, b0 = 245, 240, 222
    # Saturated color (infinite exposure)
    r_inf, g_inf, b_inf = 35, 25, 18
    
    r = int(r_inf + (r0 - r_inf) * decay)
    g = int(g_inf + (g0 - g_inf) * (decay ** 1.15))
    b = int(b_inf + (b0 - b_inf) * (decay ** 1.35))
    
    return (max(10, min(255, r)), max(10, min(255, g)), max(10, min(255, b)))

def generate_badge_image(
    badge_id: str = "MRPL-H2S-8821",
    dose_ppm_min: float = 742.0,
    expiry_status: str = "VALID", # "VALID", "EXPIRING_SOON", "EXPIRED"
    lighting_factor: float = 1.0, # 1.0 = normal, 0.6 = dark, 1.4 = bright
    color_temp_tint: Tuple[float, float, float] = (1.0, 1.0, 1.0), # RGB multiplier
    blur_ksize: int = 0, # Gaussian blur
    noise_sigma: float = 0.0,
    include_ref_scale: bool = True,
    include_strip: bool = True,
    width: int = 800,
    height: int = 480
) -> np.ndarray:
    """
    Renders a synthetic badge image with precise pixel dimensions.
    Returns BGR NumPy array (OpenCV format).
    """
    # Create white/off-white badge card substrate
    img = np.ones((height, width, 3), dtype=np.uint8) * 248
    
    # Outer wristband/holder housing (dark titanium matte gray border)
    cv2.rectangle(img, (0, 0), (width, height), (38, 42, 46), -1)
    # Badge insert area (clean white substrate)
    margin = 30
    cv2.rectangle(img, (margin, margin), (width - margin, height - margin), (250, 250, 250), -1)
    cv2.rectangle(img, (margin, margin), (width - margin, height - margin), (180, 185, 190), 2)
    
    # 4 Corner Alignment Fiducial Targets (for CV detector)
    fiducial_size = 28
    corners = [
        (margin + 12, margin + 12),
        (width - margin - 12 - fiducial_size, margin + 12),
        (margin + 12, height - margin - 12 - fiducial_size),
        (width - margin - 12 - fiducial_size, height - margin - 12 - fiducial_size),
    ]
    for (cx, cy) in corners:
        # Black square with concentric white and black inner markers
        cv2.rectangle(img, (cx, cy), (cx + fiducial_size, cy + fiducial_size), (20, 20, 20), -1)
        cv2.rectangle(img, (cx + 6, cy + 6), (cx + fiducial_size - 6, cy + fiducial_size - 6), (240, 240, 240), -1)
        cv2.rectangle(img, (cx + 10, cy + 10), (cx + fiducial_size - 10, cy + fiducial_size - 10), (20, 20, 20), -1)
        
    # Header Branding & Metadata
    cv2.putText(img, "MRPL OCCUPATIONAL SAFETY", (margin + 60, margin + 30),
                cv2.FONT_HERSHEY_DUPLEX, 0.55, (40, 50, 60), 1, cv2.LINE_AA)
    cv2.putText(img, "H2SENTRY DOSIMETER", (margin + 60, margin + 55),
                cv2.FONT_HERSHEY_DUPLEX, 0.85, (15, 25, 35), 2, cv2.LINE_AA)
    cv2.putText(img, f"ID: {badge_id}", (width - margin - 220, margin + 35),
                cv2.FONT_HERSHEY_SIMPLEX, 0.55, (60, 70, 80), 1, cv2.LINE_AA)
    cv2.putText(img, "CHEM: Pb(OAc)2-MATRIX", (width - margin - 220, margin + 55),
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, (100, 110, 120), 1, cv2.LINE_AA)
    
    # Divider line
    cv2.line(img, (margin + 20, margin + 70), (width - margin - 20, margin + 70), (210, 215, 220), 1)

    # ------------------------------------------------------------------
    # Zone 1: Reference Color Scale (Upper Section)
    # Box: x ~ [60, 740], y ~ [115, 185]
    # ------------------------------------------------------------------
    ref_x, ref_y, ref_w, ref_h = margin + 30, margin + 85, width - 2 * margin - 60, 70
    cv2.rectangle(img, (ref_x, ref_y), (ref_x + ref_w, ref_y + ref_h), (235, 238, 240), -1)
    cv2.rectangle(img, (ref_x, ref_y), (ref_x + ref_w, ref_y + ref_h), (160, 165, 170), 2)
    
    if include_ref_scale:
        cv2.putText(img, "[REF SCALE] OPTICAL CALIBRATION TARGET", (ref_x + 10, ref_y - 6),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.42, (80, 90, 100), 1, cv2.LINE_AA)
        
        # 6 Reference Patches
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
            # OpenCV uses BGR
            cv2.rectangle(img, (px, py), (px + patch_w, py + patch_h), (b_val, g_val, r_val), -1)
            cv2.rectangle(img, (px, py), (px + patch_w, py + patch_h), (90, 95, 100), 1)
            # Label below
            cv2.putText(img, label, (px + patch_w // 2 - 8, py + patch_h - 4),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.35, (10, 10, 10) if r_val > 100 else (240, 240, 240), 1)
    else:
        # Blank unprinted zone (missing reference scale)
        cv2.putText(img, "[MISSING CALIBRATION TARGET]", (ref_x + 10, ref_y + 40),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (140, 145, 150), 1, cv2.LINE_AA)

    # ------------------------------------------------------------------
    # Zone 2: H2S Reaction Chemical Exposure Strip (Center / Lower Section)
    # Box: x ~ [60, 500], y ~ [215, 395]
    # ------------------------------------------------------------------
    strip_x, strip_y = margin + 30, margin + 185
    strip_w, strip_h = width - 2 * margin - 260, 180
    cv2.rectangle(img, (strip_x, strip_y), (strip_x + strip_w, strip_y + strip_h), (240, 242, 245), -1)
    cv2.rectangle(img, (strip_x, strip_y), (strip_x + strip_w, strip_y + strip_h), (140, 145, 150), 2)
    cv2.putText(img, "[REACTION STRIP] H2S CHEMICAL EXPOSURE MATRIX", (strip_x + 10, strip_y - 8),
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, (80, 90, 100), 1, cv2.LINE_AA)
    
    if include_strip:
        # Inner active chemical porous membrane
        mem_margin = 16
        mx, my, mw, mh = strip_x + mem_margin, strip_y + mem_margin, strip_w - 2 * mem_margin, strip_h - 2 * mem_margin
        r_strip, g_strip, b_strip = dose_to_strip_color(dose_ppm_min)
        
        # Active reagent color fill (BGR) with slight natural chemical texture
        reagent_bgr = (b_strip, g_strip, r_strip)
        cv2.rectangle(img, (mx, my), (mx + mw, my + mh), reagent_bgr, -1)
        cv2.rectangle(img, (mx, my), (mx + mw, my + mh), (100, 105, 110), 1)
        
        # Sub-text on strip membrane
        cv2.putText(img, "H2S ACTIVE ZONE", (mx + 15, my + mh // 2),
                    cv2.FONT_HERSHEY_DUPLEX, 0.6, (20, 20, 20) if r_strip > 120 else (220, 220, 220), 1, cv2.LINE_AA)
        cv2.putText(img, "CUMULATIVE SENSING MEMBRANE", (mx + 15, my + mh // 2 + 25),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, (40, 40, 40) if r_strip > 120 else (190, 190, 190), 1, cv2.LINE_AA)
    else:
        # Empty missing strip well
        cv2.putText(img, "[EMPTY REACTION WELL - NO STRIP]", (strip_x + 30, strip_y + 90),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (140, 145, 150), 1, cv2.LINE_AA)

    # ------------------------------------------------------------------
    # Zone 3: Expiry / Shelf-Life Indicator (Right Lower Section)
    # Box: x ~ [540, 710], y ~ [215, 395]
    # ------------------------------------------------------------------
    exp_x, exp_y = width - margin - 200, margin + 185
    exp_w, exp_h = 170, 180
    cv2.rectangle(img, (exp_x, exp_y), (exp_x + exp_w, exp_y + exp_h), (240, 242, 245), -1)
    cv2.rectangle(img, (exp_x, exp_y), (exp_x + exp_w, exp_y + exp_h), (140, 145, 150), 2)
    cv2.putText(img, "[EXPIRY] SHELF-LIFE", (exp_x + 8, exp_y - 8),
                cv2.FONT_HERSHEY_SIMPLEX, 0.42, (80, 90, 100), 1, cv2.LINE_AA)
    
    # Expiry indicator dot / window
    dot_center = (exp_x + exp_w // 2, exp_y + exp_h // 2 - 10)
    dot_radius = 36
    
    if expiry_status == "VALID":
        exp_bgr = (60, 200, 40) # Bright Green
        exp_label = "VALID"
        exp_text_color = (20, 140, 10)
    elif expiry_status == "EXPIRING_SOON":
        exp_bgr = (30, 180, 240) # Amber/Orange
        exp_label = "EXPIRING"
        exp_text_color = (10, 120, 200)
    else: # EXPIRED
        exp_bgr = (40, 40, 220) # Bright Red
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
    # Apply Environmental / Lighting / Camera Artifacts
    # ------------------------------------------------------------------
    out = img.astype(np.float32)
    
    # Color temperature tint (e.g. tungsten warmth or fluorescent cool)
    out[:, :, 0] *= color_temp_tint[2] # B
    out[:, :, 1] *= color_temp_tint[1] # G
    out[:, :, 2] *= color_temp_tint[0] # R
    
    # Lighting intensity (underexposure / overexposure / shadows)
    out *= lighting_factor
    
    # Sensor noise
    if noise_sigma > 0:
        noise = np.random.normal(0, noise_sigma, out.shape)
        out += noise
        
    out = np.clip(out, 0, 255).astype(np.uint8)
    
    # Optical blur / focus issue
    if blur_ksize > 0:
        k = blur_ksize if blur_ksize % 2 == 1 else blur_ksize + 1
        out = cv2.GaussianBlur(out, (k, k), 0)
        
    return out

def generate_standard_demo_suite(output_dir: str = "data/demo"):
    """
    Generates standard synthetic demo badges for test cases & 1-click presets.
    """
    os.makedirs(output_dir, exist_ok=True)
    
    presets = [
        {
            "filename": "badge_baseline_0ppm.png",
            "dose": 0.0,
            "badge_id": "MRPL-H2S-0012",
            "expiry": "VALID",
            "lighting": 1.0,
            "title": "Clean (0 ppm·min)",
            "description": "Virgin unexposed chemical matrix. Low/zero cumulative dose."
        },
        {
            "filename": "badge_low_150ppm.png",
            "dose": 150.0,
            "badge_id": "MRPL-H2S-1044",
            "expiry": "VALID",
            "lighting": 1.0,
            "title": "Low (150 ppm·min)",
            "description": "Safe occupational range (< 300 ppm·min). Routine shift exposure."
        },
        {
            "filename": "badge_moderate_742ppm.png",
            "dose": 742.0,
            "badge_id": "MRPL-H2S-8821",
            "expiry": "VALID",
            "lighting": 1.0,
            "title": "Moderate (742 ppm·min)",
            "description": "Elevated exposure (300 - 1000 ppm·min). Requires shift review."
        },
        {
            "filename": "badge_high_1850ppm.png",
            "dose": 1850.0,
            "badge_id": "MRPL-H2S-9302",
            "expiry": "VALID",
            "lighting": 1.0,
            "title": "High (1850 ppm·min)",
            "description": "Action level breach (1000 - 2400 ppm·min). Immediate investigation."
        },
        {
            "filename": "badge_expired.png",
            "dose": 420.0,
            "badge_id": "MRPL-H2S-4019",
            "expiry": "EXPIRED",
            "lighting": 1.0,
            "title": "Expired Reagent",
            "description": "Shelf-life reagent expired. Physical badge must be replaced."
        },
        {
            "filename": "badge_poor_lighting.png",
            "dose": 742.0,
            "badge_id": "MRPL-H2S-8821-WARM",
            "expiry": "VALID",
            "lighting": 0.65,
            "color_temp_tint": (1.25, 0.95, 0.75), # Strong warm yellow/tungsten cast
            "title": "Poor Lighting (Warm Cast)",
            "description": "Validates optical reference scale calibration matrix under yellow lighting."
        },
        {
            "filename": "badge_blurry.png",
            "dose": 600.0,
            "badge_id": "MRPL-H2S-7714",
            "expiry": "VALID",
            "lighting": 1.0,
            "blur_ksize": 17,
            "title": "Blurry (Rejection Engine)",
            "description": "Triggers CV image quality rejection engine with blur warning."
        },
        {
            "filename": "badge_missing_reference.png",
            "dose": 742.0,
            "badge_id": "MRPL-H2S-NOREF",
            "expiry": "VALID",
            "lighting": 1.0,
            "include_ref_scale": False,
            "title": "Missing Reference Scale",
            "description": "Reference color scale missing. Rejects without generating number."
        },
        {
            "filename": "badge_missing_strip.png",
            "dose": 0.0,
            "badge_id": "MRPL-H2S-NOSTRIP",
            "expiry": "VALID",
            "lighting": 1.0,
            "include_strip": False,
            "title": "Missing Reaction Strip",
            "description": "Empty reaction well. Rejects without generating number."
        }
    ]
    
    generated_meta = []
    for p in presets:
        filepath = os.path.join(output_dir, p["filename"])
        img = generate_badge_image(
            badge_id=p["badge_id"],
            dose_ppm_min=p["dose"],
            expiry_status=p["expiry"],
            lighting_factor=p.get("lighting", 1.0),
            color_temp_tint=p.get("color_temp_tint", (1.0, 1.0, 1.0)),
            blur_ksize=p.get("blur_ksize", 0),
            noise_sigma=p.get("noise_sigma", 0.0),
            include_ref_scale=p.get("include_ref_scale", True),
            include_strip=p.get("include_strip", True)
        )
        cv2.imwrite(filepath, img)
        generated_meta.append({
            "id": p["filename"].replace(".png", ""),
            "filename": p["filename"],
            "path": filepath,
            "title": p["title"],
            "description": p["description"],
            "expected_dose": p["dose"],
            "expiry_status": p["expiry"],
            "badge_id": p["badge_id"]
        })
        
    return generated_meta

if __name__ == "__main__":
    meta = generate_standard_demo_suite()
    print(f"Generated {len(meta)} demo badge images in data/demo/")
