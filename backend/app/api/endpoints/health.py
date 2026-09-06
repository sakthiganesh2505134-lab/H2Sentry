"""
Health and System Diagnostic Endpoint
"""

from fastapi import APIRouter
import platform
import cv2
import numpy as np

router = APIRouter()

@router.get("/health")
def get_health_status():
    return {
        "status": "HEALTHY",
        "service": "H2Sentry Exposure Intelligence API",
        "version": "1.0.0-sih2026",
        "opencv_version": cv2.__version__,
        "numpy_version": np.__version__,
        "python_version": platform.python_version(),
        "os": platform.platform(),
        "pipeline_state": "ACTIVE"
    }
