# H2Sentry System Documentation

**SIH 2026 — Problem Statement SIH26118 (Mangalore Refinery and Petrochemicals Limited - MRPL)**

## Architecture Overview

H2Sentry is a colorimetric cumulative hydrogen sulfide (H₂S) dosimeter and occupational safety intelligence platform designed for industrial refinery environments.

### Core Modules:

1. **`backend/cv/` — Computer Vision & Dosimetry Engine**
   - `detector.py`: Dual-zone region-of-interest (ROI) detector separating the 7-patch printed reference scale card from the physical chemical reaction strip.
   - `calibrator.py`: Dynamic optical normalizer and 7-patch reference swatch extractor (`0`, `50`, `100`, `200`, `400`, `800`, `1600` ppm·min).
   - `color_extractor.py`: Isolates the active chemical zone on the elongated reaction strip in RGB, HSV, and CIE-Lab color spaces.
   - `exposure_engine.py`: Kinetic inverse-distance color interpolation engine calculating cumulative dose (ppm·min) and 8-hour Time Weighted Average (TWA).
   - `confidence.py`: Optical quality scoring (sharpness, lighting uniformity, geometry distortion).
   - `validation.py`: Physical badge and reference validation guards.

2. **`backend/app/` — FastAPI REST Services**
   - `api/endpoints/cv.py`: Multipart exposure strip analysis endpoint (`POST /api/cv/analyze`).
   - `api/endpoints/badges.py`: QR badge identification and database registry bridge (`POST /api/badges/verify`).
   - `api/endpoints/auth.py`: Role-based worker and supervisor authentication.
   - `api/endpoints/readings.py`: Occupational exposure dosimetry database queries.
   - `api/endpoints/calibration.py`: Laboratory reference calibration endpoints.

3. **`frontend/` — Mobile-First Worker & Supervisor Progressive Web Application**
   - `WorkerQrScanView.tsx`: Deterministic QR badge identification scanner.
   - `WorkerCameraScanView.tsx`: Colorimetric measurement camera with live optical quality feedback and dual-zone physical strip framing guide.
   - `WorkerScanResultView.tsx`: Dosimetry analysis report with TWA gauge, ACGIH/OSHA risk categories, and exposure breakdown.
   - `DashboardView.tsx`: Refinery plant supervisor command center with heatmaps, shift trends, and active workforce status.
