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
from backend.app.database.seed import seed_if_empty

# Ensure database tables exist safely on startup
Base.metadata.create_all(bind=engine)
seed_if_empty()

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

# Mount built React/Vite Frontend (All-in-One Single Free Web Service on Render)
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FRONTEND_DIST = os.path.join(PROJECT_ROOT, "frontend", "dist")

if os.path.exists(FRONTEND_DIST):
    assets_dir = os.path.join(FRONTEND_DIST, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="frontend_assets")

from fastapi.responses import FileResponse, JSONResponse

@app.get("/", include_in_schema=False)
async def serve_root():
    index_file = os.path.join(FRONTEND_DIST, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file, media_type="text/html")
    return {
        "project": "H2Sentry",
        "sih_code": "SIH26118",
        "organization": "Mangalore Refinery and Petrochemicals Limited (MRPL)",
        "docs_url": "/docs",
        "health_url": "/health"
    }

@app.get("/{full_path:path}", include_in_schema=False)
async def serve_spa_frontend(full_path: str):
    # Allow API, static uploads, and docs routes to pass through
    if full_path.startswith(("api/", "static/", "docs", "openapi.json", "health")):
        return JSONResponse(status_code=404, content={"detail": f"Route /{full_path} not found"})
    
    # Check if a specific file exists (e.g. manifest.json, sw.js, pwa-192x192.png, favicon.ico)
    file_path = os.path.join(FRONTEND_DIST, full_path)
    if os.path.isfile(file_path):
        return FileResponse(file_path)
    
    # Otherwise fallback to index.html for React SPA client-side routing
    index_file = os.path.join(FRONTEND_DIST, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file, media_type="text/html")
    
    return JSONResponse(status_code=404, content={"detail": "Frontend build not found"})



