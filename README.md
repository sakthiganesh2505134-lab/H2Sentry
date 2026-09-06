# H2Sentry — Passive Exposure Intelligence

> **Passive Cumulative H2S Exposure Dosimeter System**  
> Problem Statement SIH26118 | Mangalore Refinery and Petrochemicals Limited (MRPL)

---

## 1. Product Identity & Philosophy

**H2Sentry** is a passive cumulative $\text{H}_2\text{S}$ exposure dosimeter system that combines a disposable colorimetric badge/wristband with smartphone computer vision to estimate cumulative exposure dose and digitally record the result against the worker, badge, and shift.

### The 4 Physical Badge Operational Layers:
1. **Unique QR / DataMatrix** — *Identity Layer (WHO / WHICH BADGE)*: Encodes only the unique Badge ID (e.g. `H2S-BDG-000001`). The backend resolves the worker, employee ID, plant unit, shift, and validity timestamps without exposing sensitive worker PII inside the physical QR code.
2. **Printed Reference Colour Scale** — *Lighting Normalization Layer (OPTICAL CALIBRATION)*: Six calibrated reference patches (White, Light Gray, Mid Gray, Dark Gray, Cyan, Amber) normalize for ambient lux, white balance shifts, and smartphone sensor variations before measuring chemical reaction.
3. **$\text{H}_2\text{S}$ Reaction Chemical Strip** — *Exposure Sensing Layer (WHAT EXPOSURE OCCURRED)*: Porous metal-salt matrix undergoes irreversible proportional darkening upon passive diffusion of $\text{H}_2\text{S}$ gas over time. The chemical response records cumulative exposure dose ($\text{ppm}\cdot\text{min}$).
4. **Expiry / Shelf-Life Indicator** — *Integrity Layer (IS BADGE STILL VALID)*: Separate chemical indicator transitions from green (valid) to amber (expiring soon) to red (expired), ensuring stale or oxidized badges are flagged before recording occupational dose.

---

## 2. Modes of Operation

H2Sentry strictly separates **Clean Normal Mode** from **Deterministic Demo Mode**:

### A. Clean Normal Mode (Default Initial State)
- **Zero random / fake worker names** on a fresh install or clean reset.
- A new worker starts with **0 historical readings**.
- Supervisors add workers via the dashboard (`Add Worker`) and assign badges (`Assign Badge`).
- Worker scans the QR code $\rightarrow$ camera opens $\rightarrow$ reading is analyzed and digitally committed to their shift record.

### B. Demo Mode (Deterministic Benchmark Scenarios)
- Provides 7 deterministic benchmark presets for presentations and technical evaluation:
  1. `Clean` (0 ppm·min baseline)
  2. `Low Exposure` (150 ppm·min)
  3. `Moderate Exposure` (742 ppm·min)
  4. `High Exposure` (1850 ppm·min)
  5. `Expired Badge` (Reagent integrity rejection)
  6. `Degraded Lighting` (Optical normalization demonstration)
  7. `Blurry Scan` (Quality control rejection)
- All demo data is strictly tagged with `data_status="SIMULATED"`.

---

## 3. Scientific Transparency & Prototype Status

- **Estimated Cumulative Exposure**: The primary measurement is cumulative exposure dose ($\text{ppm}\cdot\text{min}$) and equivalent 8-hour TWA ($\text{ppm}$).
- **Calibration Version**: `CAL-v0.1-demo`. Synthetic calibration metrics are labeled as simulated demonstration models.
- **Safety Disclosures**:
  - H2Sentry is a **passive cumulative exposure dosimeter**, **NOT** an instantaneous real-time $\text{H}_2\text{S}$ alarm.
  - It is **NOT** a replacement for mandatory personal electronic $\text{H}_2\text{S}$ detectors.
  - It is **NOT** a medical diagnostic device.
  - True quantitative field deployment requires empirical chamber calibration data across temperature and humidity profiles.

---

## 4. Local Development Setup

### Prerequisites
- **Python 3.10+** (with `pip` and virtual environment support)
- **Node.js 18+** and `npm`

### Step 1: Clone & Setup Backend
```bash
# Navigate to workspace
cd H2Sentry

# Create and activate Python virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
# source venv/bin/activate

# Install dependencies
pip install fastapi uvicorn pydantic opencv-python numpy pytest

# Initialize / Seed database (optional for demo mode):
python -m backend.app.database.seed

# Start FastAPI backend on http://127.0.0.1:8000
python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

### Step 2: Setup & Start Frontend
```bash
# In a new terminal window:
cd H2Sentry/frontend

# Install dependencies
npm install

# Start Vite dev server on http://localhost:5173
npm run dev
```

---

## 5. Production Build & Deployment Guide

### Frontend Production Build
```bash
cd H2Sentry/frontend
npm run build
# Output bundle is generated in H2Sentry/frontend/dist/
```

### Environment Configuration (`VITE_API_BASE_URL`)
The frontend dynamically reads `VITE_API_BASE_URL` from its environment:
- **Local Development**: `VITE_API_BASE_URL=/api` (proxied by Vite to `http://127.0.0.1:8000`).
- **Production Cloud Hosting**: Set `VITE_API_BASE_URL=https://your-backend-service.onrender.com/api`.

### Deploying Frontend (Vercel / Netlify / Cloudflare Pages)
1. Link your Git repository or upload the `frontend/` folder.
2. **Framework Preset**: Vite / React.
3. **Build Command**: `npm run build`
4. **Output Directory**: `dist`
5. **Environment Variable**: `VITE_API_BASE_URL=https://<your-deployed-backend-url>/api`

### Deploying Backend (Render / Railway / Fly.io)
1. Deploy from the root directory using Python environment.
2. **Start Command**: `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
3. **Python Version**: 3.10+
4. **Environment Variables**:
   - `HOST=0.0.0.0`
   - `PORT=8000`
   - `DATABASE_URL=sqlite:///./backend/data/h2sentry.db`

### HTTPS Requirement for Mobile Camera Access
> [!IMPORTANT]
> Modern mobile web browsers (Safari iOS, Chrome Android) require a **secure origin (`https://` or `localhost`)** to grant access to the device camera (`navigator.mediaDevices.getUserMedia`). Ensure your deployed frontend URL is served over HTTPS.

---

## 6. Running Tests

```bash
# Run all backend unit & integration tests
python -m pytest backend/tests -v
```

---

## 7. Architecture Overview

```
H2Sentry/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── endpoints/
│   │   │   │   ├── badges.py       # QR badge lookup & lifecycle
│   │   │   │   ├── cv.py           # Computer vision analysis endpoint
│   │   │   │   ├── demo.py         # Seed & reset database endpoints
│   │   │   │   ├── readings.py     # Reading submission & retrieval
│   │   │   │   └── workers.py      # Worker CRUD & dossier endpoints
│   │   │   ├── database/
│   │   │   │   ├── models.py       # SQLAlchemy ORM (Worker, Badge, Reading, CalibrationSample)
│   │   │   │   ├── session.py      # SQLite connection & schema initializer
│   │   │   │   └── seed.py         # Deterministic benchmark sample generator
│   │   │   └── schemas/            # Pydantic validation schemas
│   │   └── main.py                 # FastAPI application factory & CORS configuration
│   ├── cv/
│   │   ├── exposure_engine.py      # Colorimetric kinetics & CIE L*a*b* dose estimation
│   │   └── image_processor.py      # OpenCV badge, reference scale, & strip detection
│   └── tests/
│       └── test_api.py             # 18 automated unit and integration tests
│
└── frontend/
    ├── public/
    │   ├── manifest.json           # Mobile PWA configuration
    │   └── favicon.svg             # Application brand icon
    └── src/
        ├── components/
        │   ├── public/
        │   │   └── LandingView.tsx # Public awareness & educational showcase
        │   ├── worker/             # Mobile PWA Worker Experience
        │   │   ├── WorkerLayout.tsx
        │   │   ├── WorkerHomeView.tsx
        │   │   ├── WorkerQrScanView.tsx      # Step 1: QR identity bridge
        │   │   ├── WorkerCameraScanView.tsx  # Step 2: Optical camera capture
        │   │   ├── WorkerScanResultView.tsx  # Step 3: Dose + 12-step trace
        │   │   ├── WorkerHistoryView.tsx     # Historical exposure log
        │   │   └── WorkerProfileView.tsx     # Worker profile & badge status
        │   ├── supervisor/         # Desktop Supervisor Portal
        │   ├── DashboardView.tsx   # Attention-required alerts & shift statistics
        │   ├── WorkforceView.tsx   # Worker CRUD, badge assignment & dossier
        │   ├── CalibrationLabView.tsx # Calibration curve & sensor science
        │   └── ReadingDetailModal.tsx # Full technical reading trace modal
        └── services/
            └── api.ts              # Resilient REST API client with VITE_API_BASE_URL support
```

---

## 8. SIH 2026 Submission Details
- **Organization**: Mangalore Refinery and Petrochemicals Limited (MRPL)
- **Problem Statement Code**: SIH26118
- **Core Technology**: Passive Chemical Sensing + Smartphone Computer Vision + Reference-Based Optical Calibration + Cumulative Occupational Exposure Records.
