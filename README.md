# H2Sentry — Passive Exposure Intelligence

> **Passive Cumulative H₂S Exposure Dosimeter with Quantitative Computer Vision & ML Calibration**  
> Problem Statement SIH26118 | Mangalore Refinery and Petrochemicals Limited (MRPL)

---

## 1. Product Identity & Scientific Philosophy

**H2Sentry** is an occupational passive cumulative $\text{H}_2\text{S}$ exposure dosimeter system combining disposable colorimetric wristbands/badges with smartphone computer vision to estimate cumulative exposure dose ($\text{ppm}\cdot\text{min}$) and digitally record verified dosimetry records against the worker, badge, and shift.

### The 4 Physical Badge Operational Layers:
1. **Unique QR / DataMatrix** — *Identity Layer (WHO / WHICH BADGE)*: Encodes only the unique Badge ID (e.g. `MRPL-H2S-8821`). The server-side registry maps the worker, employee ID, plant unit, shift, and validity timestamps without exposing worker PII inside the QR code.
2. **Digital Reference-Scale & In-App Optical Normalization** — *Lighting Normalization Layer*: In-app digital calibration standards normalize ambient lux, channel gains, white balance shifts, and mobile sensor curves before measuring chemical reaction.
3. **$\text{H}_2\text{S}$ Reaction Chemical Strip** — *Exposure Sensing Layer (WHAT EXPOSURE OCCURRED)*: Porous metal-salt matrix undergoes irreversible proportional darkening upon passive diffusion of $\text{H}_2\text{S}$ gas over time. The response records cumulative exposure dose ($\text{ppm}\cdot\text{min}$).
4. **Expiry / Shelf-Life Indicator** — *Integrity Layer (IS BADGE VALID)*: Dedicated indicator transitions from green (valid) to amber (expiring soon) to red (expired), ensuring stale or oxidized badges are flagged before recording occupational dose.

---

## 2. Modes of Operation

H2Sentry strictly separates **Clean Production Mode** from **Deterministic Demo Mode**:

### A. Clean Production Mode (Default)
- Zero fake worker names on a fresh database.
- A new worker starts with 0 historical readings.
- Supervisors add workers via the dashboard (`Add Worker`) and assign badges (`Assign Badge`).
- Worker scans the QR code $\rightarrow$ camera captures reaction strip $\rightarrow$ reading is analyzed and digitally committed to the PostgreSQL/SQLite database.

### B. Demo Mode (Deterministic Benchmark Scenarios)
- Provides deterministic benchmark presets for field demonstrations:
  1. `Clean` (0 ppm·min baseline)
  2. `Low Exposure` (150 ppm·min)
  3. `Moderate Exposure` (742 ppm·min)
  4. `High Exposure` (1850 ppm·min)
  5. `Expired Badge` (Reagent integrity rejection)
  6. `Degraded Lighting` (Optical normalization demonstration)
  7. `Blurry Scan` (Quality control rejection)
- All prototype validation data is labeled with `data_status="SIMULATED"`.

---

## 3. Scientific Transparency & Prototype Status

- **Estimated Cumulative Exposure**: The primary measurement is cumulative exposure dose ($\text{ppm}\cdot\text{min}$) and equivalent 8-hour TWA ($\text{ppm}$).
- **Calibration Version**: `CAL-v1.0-ml-gbr`.
- **Safety Disclosures**:
  - H2Sentry is a **passive cumulative exposure dosimeter**, **NOT** an instantaneous real-time $\text{H}_2\text{S}$ alarm.
  - It is **NOT** a replacement for mandatory personal electronic $\text{H}_2\text{S}$ detectors.
  - It is **NOT** a medical diagnostic device.
  - Current color/dose training data is synthetic software-validation data. Quantitative field deployment requires controlled laboratory chamber calibration across temperature and humidity profiles.

---

## 4. Production Architecture

```
[ Worker Android Phone / PWA ]        [ Supervisor Desktop / Laptop ]
             │                                       │
             ▼ (HTTPS)                               ▼ (HTTPS)
   ┌────────────────────────────────────────────────────────┐
   │  Frontend Hosting (Vercel / Cloudflare / Netlify)       │
   │  React 18 + Vite + TypeScript Mobile-First PWA         │
   └──────────────────────────┬─────────────────────────────┘
                              │
                              ▼ (HTTPS REST API / JWT)
   ┌────────────────────────────────────────────────────────┐
   │  Backend API (Render / Railway / Docker / Fly.io)       │
   │  FastAPI + Uvicorn + OpenCV Headless + Scikit-Learn     │
   └──────────────────────────┬─────────────────────────────┘
                              │
                              ▼ (SQLAlchemy / Connection Pool)
   ┌────────────────────────────────────────────────────────┐
   │  Production Database (Render PostgreSQL / Supabase)    │
   │  (Automatic SQLite fallback for local development)     │
   └────────────────────────────────────────────────────────┘
```

---

## 5. Production Deployment Guide

### Prerequisites
- GitHub account with this repository
- **Vercel** account (Frontend hosting)
- **Render** account (Backend API + PostgreSQL hosting)

---

### Step 1: Deploy PostgreSQL Database (Render)
1. In the Render Dashboard, click **New +** $\rightarrow$ **PostgreSQL**.
2. **Name**: `h2sentry-db`
3. **Database**: `h2sentry`
4. **User**: `h2sentry_user`
5. **Region**: Closest to your location (e.g., Singapore / Frankfurt / Oregon).
6. **Plan**: Free.
7. Click **Create Database**.
8. Once provisioned, copy the **Internal Database URL** (or **External Database URL** if hosting backend elsewhere). Example:
   `postgresql://h2sentry_user:password@dpg-xxxx.singapore-postgres.render.com/h2sentry`

---

### Step 2: Deploy Backend Web Service (Render)
1. In the Render Dashboard, click **New +** $\rightarrow$ **Web Service**.
2. Connect your GitHub repository: `H2Sentry`.
3. Configure settings:
   - **Name**: `h2sentry-api`
   - **Region**: Same as database.
   - **Branch**: `main`
   - **Root Directory**: `.` (leave blank or enter `.`)
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
4. **Environment Variables**:
   | Variable | Value |
   |---|---|
   | `ENVIRONMENT` | `production` |
   | `DATABASE_URL` | *(Paste your PostgreSQL URL from Step 1)* |
   | `JWT_SECRET` | *(Generate a 32-byte hex key, e.g. `openssl rand -hex 32`)* |
   | `ALLOWED_ORIGINS` | `*` *(or your Vercel frontend URL once created)* |
5. Click **Deploy Web Service**.
6. Note your deployed Backend URL: `https://h2sentry-api.onrender.com`.
7. Verify health: visit `https://h2sentry-api.onrender.com/health` $\rightarrow$ should return `{"status": "ok"}`.

---

### Step 3: Deploy Frontend Web Application (Vercel)
1. In the Vercel Dashboard, click **Add New...** $\rightarrow$ **Project**.
2. Import the `H2Sentry` repository from GitHub.
3. Configure project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click Edit $\rightarrow$ select `frontend` $\rightarrow$ click Continue.
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. **Environment Variables**:
   | Variable | Value |
   |---|---|
   | `VITE_API_BASE_URL` | `https://h2sentry-api.onrender.com` *(your Render backend URL)* |
5. Click **Deploy**.
6. Once deployed, note your production URL: `https://h2sentry.vercel.app`.
7. (Optional): Go back to your Render backend service, and update `ALLOWED_ORIGINS` to `https://h2sentry.vercel.app`.

---

## 6. Mobile Phone Testing & Android PWA Installation

1. Open your deployed URL on an Android device: `https://h2sentry.vercel.app`.
2. Chrome will display the **"Install H2Sentry"** banner or option in the menu ($\vdots \rightarrow$ *Add to Home screen*).
3. Tap **Quick Login** as Worker `EMP1024` (Ravi Kumar).
4. Tap **SCAN BADGE** $\rightarrow$ Grant camera permission.
5. Scan the wristband QR code $\rightarrow$ Camera opens in optical dosimeter viewfinder.
6. Capture and analyze the colorimetric strip $\rightarrow$ Estimated cumulative exposure in $\text{ppm}\cdot\text{min}$ is calculated and committed to your permanent dossier.

---

## 7. Local Development Setup

### Backend (Python)
```bash
# Clone & navigate
git clone https://github.com/your-username/H2Sentry.git
cd H2Sentry

# Create virtual environment
python -m venv venv
.\venv\Scripts\activate  # Windows
# source venv/bin/activate # Linux/macOS

# Install dependencies
pip install -r requirements.txt

# Start backend server
python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend (Node.js)
```bash
cd frontend
npm install
npm run dev
# Open https://localhost:5173 or http://localhost:5173
```

---

## 8. Automated Testing & Verification

```bash
# Run backend pytest suite (45/45 tests)
python -m pytest backend/tests -v

# Run frontend TypeScript build
cd frontend
npm run build
```

---

## 9. SIH 2026 Submission Details
- **Problem Statement Code**: SIH26118
- **Organization**: Mangalore Refinery and Petrochemicals Limited (MRPL)
- **Domain**: Smart Industrial Safety & Worker Health Monitoring
- **Core Technology**: Passive Porous Matrix $\text{H}_2\text{S}$ Sensing + Optical Color Normalization + Gradient Boosting ML Regressor + Mobile PWA + Industrial Supervisor Dashboard.

