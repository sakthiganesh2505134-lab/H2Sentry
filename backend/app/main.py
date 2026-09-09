"""
H2Sentry FastAPI Main Application Entrypoint
SIH 2026 - Problem Statement SIH26118 (MRPL)
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.app.api.endpoints import health, cv, readings, workers, calibration, settings, badges, demo, auth
from backend.app.database.database import engine, Base

# Ensure database tables exist safely on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="H2Sentry — Passive Colorimetric H2S Exposure-Dosimeter API",
    description="Occupational cumulative H2S exposure intelligence system with optical calibration and explainable computer vision.",
    version="1.0.0-sih2026"
)

# Configure CORS for Local Development and Production Domains
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "*")
if allowed_origins_env == "*":
    allowed_origins = ["*"]
else:
    allowed_origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static directories for demo badges and uploaded images
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data")
DEMO_DIR = os.path.join(DATA_DIR, "demo")
UPLOADS_DIR = os.path.join(DATA_DIR, "uploads")
CALIBRATION_DIR = os.path.join(DATA_DIR, "calibration")
os.makedirs(DEMO_DIR, exist_ok=True)
os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(CALIBRATION_DIR, exist_ok=True)

app.mount("/static/demo", StaticFiles(directory=DEMO_DIR), name="demo_static")
app.mount("/static/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads_static")
app.mount("/static/calibration", StaticFiles(directory=CALIBRATION_DIR), name="calibration_static")

# Production Healthcheck Endpoint (No auth required)
@app.get("/health", tags=["System Health"])
def root_health():
    return {
        "status": "ok",
        "service": "H2Sentry Exposure Intelligence API",
        "environment": os.getenv("ENVIRONMENT", "production")
    }

# Include API Routers
app.include_router(health.router, prefix="/api", tags=["System Health"])
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication & User Sessions"])
app.include_router(cv.router, prefix="/api/cv", tags=["Computer Vision & Optical Analysis"])
app.include_router(readings.router, prefix="/api/readings", tags=["Dosimetry Readings"])
app.include_router(readings.router, prefix="/api/history", tags=["Exposure History Alias"])
app.include_router(workers.router, prefix="/api/workers", tags=["Workforce & Exposure Records"])
app.include_router(badges.router, prefix="/api/badges", tags=["Badge Registry & QR Identity Bridge"])
app.include_router(calibration.router, prefix="/api/calibration", tags=["Calibration Lab"])
app.include_router(settings.router, prefix="/api/settings", tags=["Safety Thresholds & Settings"])
app.include_router(demo.router, prefix="/api/demo", tags=["Demo Simulation & State Management"])

@app.get("/")
def root():
    return {
        "project": "H2Sentry",
        "sih_code": "SIH26118",
        "organization": "Mangalore Refinery and Petrochemicals Limited (MRPL)",
        "docs_url": "/docs",
        "health_url": "/health"
    }

