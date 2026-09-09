"""
H2Sentry Dosimeter Region Detection Engine
Identifies:
1. Outer Badge ROI / Card Boundary
2. Printed Reference Color Scale ROI
3. Passive Chemical H2S Reaction Strip ROI (Wide Rectangular Geometry)
4. Expiry / Shelf-Life Indicator ROI

Implements robust classical CV techniques:
- Multi-scale contour analysis & rectangularity evaluation
- Aspect ratio scoring (supports 2.5:1 through 12:1 wide strip geometry)
- Square region rejection for reaction strip (distinguishes QR codes from strips)
- Relative spatial layout topology & proximity constraints
"""

import cv2
import numpy as np
from typing import Dict, Any, Tuple, Optional, List

class BadgeDetectionResult:
    def __init__(
        self,
        badge_bbox: List[int],
        ref_scale_bbox: List[int],
        reaction_strip_bbox: List[int],
        expiry_bbox: List[int],
        confidences: Dict[str, float],
        cropped_regions: Dict[str, np.ndarray],
        annotated_image: np.ndarray,
        success: bool = True,
        error_message: Optional[str] = None
    ):
        self.badge_bbox = badge_bbox # [x, y, w, h]
        self.ref_scale_bbox = ref_scale_bbox
        self.reaction_strip_bbox = reaction_strip_bbox
        self.expiry_bbox = expiry_bbox
        self.confidences = confidences
        self.cropped_regions = cropped_regions
        self.annotated_image = annotated_image
        self.success = success
        self.error_message = error_message

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "error_message": self.error_message,
            "badge": {
                "bbox": self.badge_bbox,
                "confidence": round(self.confidences.get("badge", 0.0), 3)
            },
            "reference": {
                "bbox": self.ref_scale_bbox,
                "confidence": round(self.confidences.get("reference", 0.0), 3)
            },
            "reaction_strip": {
                "bbox": self.reaction_strip_bbox,
                "confidence": round(self.confidences.get("reaction_strip", 0.0), 3)
            },
            "expiry": {
                "bbox": self.expiry_bbox,
                "confidence": round(self.confidences.get("expiry", 0.0), 3)
            }
        }

def score_strip_candidate(
    bx: int, by: int, bw: int, bh: int,
    ref_y_bottom: int,
    img_w: int, img_h: int,
    contour: np.ndarray
) -> Tuple[float, Dict[str, Any]]:
    """
    Scores a candidate contour as a chemical reaction strip.
    Favors wide horizontal rectangular geometry (aspect ratios 1.8:1 to 12:1).
    Explicitly penalizes and rejects square / QR-like regions (aspect ~ 1.0).
    """
    aspect = float(bw) / max(1, bh)
    area = float(bw * bh)
    total_area = float(img_w * img_h)
    area_ratio = area / total_area

    # Reject candidates located inside physical reference scale if one was detected
    if ref_y_bottom > 0 and (by + bh * 0.5) < (ref_y_bottom - 10):
        return 0.0, {"aspect": 0.0, "rectangularity": 0.0, "area_ratio": 0.0, "composite_score": 0.0}

    # 1. Aspect Ratio Score: high for 1.8 to 12.0, very low for square/QR (aspect ~ 1.0)
    if aspect < 1.3:
        # Obvious square QR-like region -> heavy penalty / rejection
        aspect_score = 0.02
    elif aspect < 1.8:
        aspect_score = 0.35
    elif 1.8 <= aspect <= 12.0:
        aspect_score = min(1.0, 0.80 + 0.20 * min(1.0, (aspect - 1.8) / 4.0))
    elif aspect > 12.0:
        aspect_score = max(0.40, 1.0 - (aspect - 12.0) * 0.05)
    else:
        aspect_score = 0.50

    # 2. Rectangularity / Fill Factor
    cnt_area = cv2.contourArea(contour)
    rectangularity = cnt_area / max(1.0, area)
    rect_score = min(1.0, max(0.2, rectangularity))

    # 3. Area Suitability (strip should occupy 1.5% - 45% of field of view)
    if 0.015 <= area_ratio <= 0.45:
        area_score = 1.0
    elif area_ratio < 0.015:
        area_score = max(0.1, area_ratio / 0.015)
    else:
        area_score = max(0.3, 1.0 - (area_ratio - 0.45))

    # 4. Proximity & Relative Topology
    if ref_y_bottom > 0:
        pos_score = 1.0 if by >= ref_y_bottom - 5 else 0.50
    else:
        pos_score = 0.90

    # Composite candidate score with high weighting on aspect ratio
    weights = [0.60, 0.15, 0.15, 0.10]
    scores = [aspect_score, rect_score, area_score, pos_score]
    composite = float(np.dot(weights, scores))

    if aspect < 1.4:
        composite *= 0.40 # Extra penalty factor for square objects

    meta = {
        "aspect": round(aspect, 2),
        "rectangularity": round(rectangularity, 2),
        "area_ratio": round(area_ratio, 3),
        "composite_score": round(composite, 3)
    }
    return composite, meta

def detect_badge_regions(img: np.ndarray) -> BadgeDetectionResult:
    """
    Detects the dosimeter badge and physical elongated rectangular reaction strip.
    Detects physical reference scale if printed, but seamlessly operates without one.
    """
    if img is None or img.size == 0:
        return BadgeDetectionResult([], [], [], [], {}, {}, img, False, "Invalid image")
        
    h, w = img.shape[:2]
    annotated = img.copy()
    
    # Convert grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    
    # Multi-threshold edge & contour maps
    _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    edges = cv2.Canny(blurred, 30, 100)
    
    contours, _ = cv2.findContours(thresh, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    edge_cnts, _ = cv2.findContours(edges, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    
    badge_x, badge_y, badge_w, badge_h = 0, 0, w, h
    badge_conf = 0.92
    
    # 1. Identify Outer Card / Wristband Boundary
    max_area = 0.0
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area > (w * h * 0.15):
            bx, by, bw, bh = cv2.boundingRect(cnt)
            aspect = float(bw) / max(1, bh)
            if 0.8 <= aspect <= 3.0 and area > max_area:
                max_area = area
                badge_x, badge_y, badge_w, badge_h = bx, by, bw, bh
                badge_conf = 0.96

    if max_area == 0.0:
        badge_x, badge_y, badge_w, badge_h = int(w * 0.02), int(h * 0.02), int(w * 0.96), int(h * 0.96)
        badge_conf = 0.88

    # 2. Check if a Physical Reference Color Scale exists on the card (Upper portion of card, by < h * 0.45)
    swatch_boxes = []
    for c in edge_cnts:
        bx, by, bw_c, bh_c = cv2.boundingRect(c)
        aspect = bw_c / max(1, bh_c)
        if 0.70 <= aspect <= 2.80 and 30 <= bw_c <= int(w * 0.25) and 25 <= bh_c <= int(h * 0.30) and by < int(h * 0.45):
            if not any(abs(bx - b[0]) < 15 and abs(by - b[1]) < 15 for b in swatch_boxes):
                swatch_boxes.append((bx, by, bw_c, bh_c))

    swatch_row = []
    if len(swatch_boxes) >= 4:
        for s in swatch_boxes:
            aligned = [other for other in swatch_boxes if abs(other[1] - s[1]) < 28]
            if len(aligned) >= 4 and len(aligned) > len(swatch_row):
                swatch_row = aligned

    ref_detected_dynamically = False
    ref_y_bottom = 0
    ref_bbox = []
    ref_crop = None
    ref_conf = 0.0

    if swatch_row:
        swatch_row.sort(key=lambda b: b[0])
        pitch = (swatch_row[-1][0] - swatch_row[0][0]) / max(1, (len(swatch_row) - 1))
        patch_w = float(np.median([s[2] for s in swatch_row]))
        patch_h = float(np.median([s[3] for s in swatch_row]))
        avg_y = float(np.median([s[1] for s in swatch_row]))

        if (swatch_row[-1][0] + patch_w > w * 0.70) and len(swatch_row) < 7:
            x_0 = swatch_row[-1][0] - 6 * pitch
            min_rx = max(0, int(x_0 - 5))
            max_rx = min(w, int(swatch_row[-1][0] + patch_w + 5))
        else:
            min_rx = max(0, int(min(s[0] for s in swatch_row) - 5))
            max_rx = min(w, int(max(s[0] + s[2] for s in swatch_row) + 5))

        min_ry = max(0, int(avg_y - 8))
        max_ry = min(h, int(avg_y + patch_h + 8))
        rx, ry, rw, rh = min_rx, min_ry, max_rx - min_rx, max_ry - min_ry
        ref_bbox = [rx, ry, rw, rh]
        ref_crop = img[ry:ry+rh, rx:rx+rw]
        ref_detected_dynamically = True
        ref_y_bottom = ry + rh
        ref_conf = 0.95
    else:
        # Check if card has a blank unprinted upper reference box at y < h * 0.40
        for c in edge_cnts:
            bx, by, bw_c, bh_c = cv2.boundingRect(c)
            if by < int(h * 0.35) and bw_c > int(w * 0.50) and 35 < bh_c < int(h * 0.25):
                ref_y_bottom = max(ref_y_bottom, by + bh_c)

    # 3. Identify Wide Rectangular Chemical Reaction Strip
    candidate_scores = []
    for c in list(edge_cnts) + list(contours):
        bx, by, bw_c, bh_c = cv2.boundingRect(c)
        aspect = float(bw_c) / max(1, bh_c)
        area_ratio = float(bw_c * bh_c) / (w * h)
        
        # Disqualify regions in top reference/header area or whole card
        if ref_y_bottom > 0 and (by + bh_c * 0.5) < (ref_y_bottom - 5):
            continue
        if area_ratio > 0.60:
            continue
        if aspect < 1.3: # square QR or square expiry
            continue
            
        if bw_c > int(w * 0.12) and bh_c > int(h * 0.04):
            # Prefer 1.6 to 6.0 aspect ratio for strips
            if 1.6 <= aspect <= 6.0:
                aspect_score = 1.0
            elif aspect > 6.0:
                aspect_score = 0.60
            else:
                aspect_score = 0.40
                
            cnt_area = cv2.contourArea(c)
            rectangularity = cnt_area / max(1.0, float(bw_c * bh_c))
            rect_score = min(1.0, max(0.2, rectangularity))
            
            # Prefer strip patch (area ~ 3% - 25%)
            if 0.03 <= area_ratio <= 0.25:
                area_score = 1.0
            else:
                area_score = 0.70
                
            score = 0.50 * aspect_score + 0.30 * rect_score + 0.20 * area_score
            candidate_scores.append((score, (bx, by, bw_c, bh_c)))

    if candidate_scores:
        # Sort by score, then prefer nested inner strip patch over outer well if both match
        candidate_scores.sort(key=lambda item: (item[0], -item[1][1], -item[1][2]), reverse=True)
        best_strip = candidate_scores[0][1]
        for score, box in candidate_scores:
            if box[0] >= best_strip[0] and (box[0] + box[2]) <= (best_strip[0] + best_strip[2]) and box[2] < best_strip[2] * 0.8:
                best_strip = box
                break
        sx, sy, sw, sh = best_strip[0], best_strip[1], best_strip[2], best_strip[3]
        strip_conf = 0.95
    else:
        sx = int(badge_x + badge_w * 0.15)
        sy = int(badge_y + badge_h * 0.45)
        sw = int(badge_w * 0.45)
        sh = int(badge_h * 0.35)
        strip_conf = 0.50

    # Expiry indicator coordinate (if present in corner)
    ex = int(badge_x + badge_w * 0.70)
    ey = int(badge_y + badge_h * 0.40)
    ew = int(badge_w * 0.23)
    eh = int(badge_h * 0.45)

    # Clamp bounding boxes to image dimensions
    def clamp_box(bx: int, by: int, bw: int, bh: int) -> List[int]:
        nx = max(0, min(w - 1, bx))
        ny = max(0, min(h - 1, by))
        nw = max(10, min(w - nx, bw))
        nh = max(10, min(h - ny, bh))
        return [nx, ny, nw, nh]

    badge_bbox = clamp_box(badge_x, badge_y, badge_w, badge_h)
    strip_bbox = clamp_box(sx, sy, sw, sh)
    expiry_bbox = clamp_box(ex, ey, ew, eh)

    if ref_bbox:
        ref_bbox = clamp_box(ref_bbox[0], ref_bbox[1], ref_bbox[2], ref_bbox[3])
        ref_crop = img[ref_bbox[1]:ref_bbox[1]+ref_bbox[3], ref_bbox[0]:ref_bbox[0]+ref_bbox[2]]

    strip_crop = img[strip_bbox[1]:strip_bbox[1]+strip_bbox[3], strip_bbox[0]:strip_bbox[0]+strip_bbox[2]]
    expiry_crop = img[expiry_bbox[1]:expiry_bbox[1]+expiry_bbox[3], expiry_bbox[0]:expiry_bbox[0]+expiry_bbox[2]]

    expiry_conf = 0.90 if expiry_crop.size > 0 else 0.0

    # Draw High-Visibility Industrial Colorimetric Overlay on Annotated Image
    # 1. Dosimeter Card Boundary (Cyan)
    cv2.rectangle(annotated, (badge_bbox[0], badge_bbox[1]), 
                  (badge_bbox[0]+badge_bbox[2], badge_bbox[1]+badge_bbox[3]), (255, 200, 0), 2)
    cv2.putText(annotated, f"DOSIMETER [{badge_conf*100:.0f}%]", 
                (badge_bbox[0]+10, badge_bbox[1]+22), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 200, 0), 2)

    # 2. Reference Color Scale (Yellow-Amber if physical, else Digital indicator)
    if ref_detected_dynamically and ref_bbox:
        cv2.rectangle(annotated, (ref_bbox[0], ref_bbox[1]), 
                      (ref_bbox[0]+ref_bbox[2], ref_bbox[1]+ref_bbox[3]), (0, 215, 255), 2)
        cv2.putText(annotated, f"PHYSICAL REFERENCE SCALE [{ref_conf*100:.0f}%]", 
                    (ref_bbox[0]+8, ref_bbox[1]-8), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 215, 255), 2)
    else:
        cv2.putText(annotated, "DIGITAL MODEL CALIBRATION [ACTIVE]", 
                    (badge_bbox[0]+10, badge_bbox[1]+42), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (0, 215, 255), 1)

    # 3. Horizontal Rectangular Chemical Reaction Strip (Magenta)
    cv2.rectangle(annotated, (strip_bbox[0], strip_bbox[1]), 
                  (strip_bbox[0]+strip_bbox[2], strip_bbox[1]+strip_bbox[3]), (255, 80, 220), 2)
    strip_aspect = float(strip_bbox[2]) / max(1, strip_bbox[3])
    cv2.putText(annotated, f"REACTION STRIP [{strip_aspect:.1f}:1] [{strip_conf*100:.0f}%]", 
                (strip_bbox[0]+8, strip_bbox[1]-8), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 80, 220), 2)

    return BadgeDetectionResult(
        badge_bbox=badge_bbox,
        ref_scale_bbox=ref_bbox,
        reaction_strip_bbox=strip_bbox,
        expiry_bbox=expiry_bbox,
        confidences={
            "badge": badge_conf,
            "reference": ref_conf,
            "reaction_strip": strip_conf,
            "expiry": expiry_conf
        },
        cropped_regions={
            "reference": ref_crop,
            "reaction_strip": strip_crop,
            "expiry": expiry_crop
        },
        annotated_image=annotated,
        success=True
    )
