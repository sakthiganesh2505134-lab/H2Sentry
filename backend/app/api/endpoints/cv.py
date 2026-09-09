"""
Computer Vision API Endpoints
"""

import os
import cv2
import base64
from typing import Optional, List
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Body
from pydantic import BaseModel

from backend.cv.pipeline import run_dosimeter_analysis_pipeline, image_to_base64
from backend.cv.badge_generator import generate_standard_demo_suite, generate_badge_image
from backend.app.schemas.schemas import CVAnalyzeResponse, DemoBadgeItem

router = APIRouter()

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
DEMO_DIR = os.path.join(os.path.dirname(BACKEND_DIR), "data", "demo")

class Base64AnalyzeRequest(BaseModel):
    image_base64: Optional[str] = None
    demo_preset_id: Optional[str] = None
    temperature_c: float = 25.0
    humidity_pct: float = 50.0
    strip_age_days: float = 14.0
    badge_id_hint: Optional[str] = None

@router.get("/demo-badges", response_model=List[DemoBadgeItem])
def get_demo_badges():
    """
    Returns available deterministic synthetic software validation badges.
    """
    os.makedirs(DEMO_DIR, exist_ok=True)
    meta = generate_standard_demo_suite(DEMO_DIR)
    
    result = []
    for m in meta:
        filepath = m["path"]
        img = cv2.imread(filepath)
        b64 = image_to_base64(img, quality=80)
        result.append(DemoBadgeItem(
            id=m["id"],
            filename=m["filename"],
            title=m["title"],
            description=m["description"],
            expected_dose=m["expected_dose"],
            expiry_status=m["expiry_status"],
            badge_id=m["badge_id"],
            image_url=b64
        ))
    return result

@router.post("/analyze", response_model=CVAnalyzeResponse)
async def analyze_badge_image(
    file: Optional[UploadFile] = File(None),
    image: Optional[UploadFile] = File(None),
    photo: Optional[UploadFile] = File(None),
    image_base64: Optional[str] = Form(None),
    demo_preset_id: Optional[str] = Form(None),
    temperature_c: float = Form(25.0),
    humidity_pct: float = Form(50.0),
    strip_age_days: float = Form(14.0),
    badge_id_hint: Optional[str] = Form(None)
):
    """
    Analyzes an uploaded dosimeter badge image via multipart form.
    Accepts 'file', 'image', or 'photo' field name for maximum client compatibility.
    """
    image_bytes = None
    
    upload_file = file or image or photo
    if upload_file is not None:
        try:
            image_bytes = await upload_file.read()
        except Exception as read_err:
            raise HTTPException(status_code=400, detail=f"Failed to read uploaded image file: {str(read_err)}")
            
    if not image_bytes and image_base64:
        # Strip data URL prefix if present
        b64_str = image_base64.split(",")[-1]
        try:
            image_bytes = base64.b64decode(b64_str)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid base64 image data.")
    elif not image_bytes and demo_preset_id:
        filepath = os.path.join(DEMO_DIR, f"{demo_preset_id}.png")
        if not os.path.exists(filepath):
            # Regenerate if missing
            generate_standard_demo_suite(DEMO_DIR)
        if os.path.exists(filepath):
            with open(filepath, "rb") as f:
                image_bytes = f.read()
        else:
            raise HTTPException(status_code=404, detail=f"Demo preset {demo_preset_id} not found.")
                
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Please provide a badge image file, base64 payload, or demo_preset_id.")

    try:
        pipeline_result = run_dosimeter_analysis_pipeline(
            image_input=image_bytes,
            temperature_c=temperature_c,
            humidity_pct=humidity_pct,
            strip_age_days=strip_age_days,
            badge_id_hint=badge_id_hint
        )
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"CV processing error: {str(exc)}")

    if not pipeline_result.get("success", False):
        raise HTTPException(status_code=422, detail=pipeline_result.get("error", "CV pipeline failed."))

    return pipeline_result

@router.post("/analyze-json", response_model=CVAnalyzeResponse)
def analyze_badge_image_json(payload: Base64AnalyzeRequest):
    """
    Analyzes an uploaded dosimeter badge image via JSON body (for base64/demo presets).
    """
    image_bytes = None
    if payload.image_base64:
        b64_str = payload.image_base64.split(",")[-1]
        try:
            image_bytes = base64.b64decode(b64_str)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid base64 image data.")
    elif payload.demo_preset_id:
        filepath = os.path.join(DEMO_DIR, f"{payload.demo_preset_id}.png")
        if not os.path.exists(filepath):
            generate_standard_demo_suite(DEMO_DIR)
        if os.path.exists(filepath):
            with open(filepath, "rb") as f:
                image_bytes = f.read()
        else:
            raise HTTPException(status_code=404, detail=f"Demo preset {payload.demo_preset_id} not found.")
    else:
        raise HTTPException(status_code=400, detail="Must provide image_base64 or demo_preset_id.")

    try:
        pipeline_result = run_dosimeter_analysis_pipeline(
            image_input=image_bytes,
            temperature_c=payload.temperature_c,
            humidity_pct=payload.humidity_pct,
            strip_age_days=payload.strip_age_days,
            badge_id_hint=payload.badge_id_hint
        )
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"CV processing error: {str(exc)}")

    if not pipeline_result.get("success", False):
        raise HTTPException(status_code=422, detail=pipeline_result.get("error", "CV pipeline failed."))

    return pipeline_result
