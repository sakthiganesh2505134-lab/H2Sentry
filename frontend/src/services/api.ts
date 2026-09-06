/**
 * H2Sentry API Client Service
 */

import type {
  SystemHealth,
  DemoBadgeItem,
  CVAnalyzeResponse,
  Reading,
  ReadingCreatePayload,
  DashboardStats,
  Worker,
  WorkerDetail,
  WorkerCreatePayload,
  WorkerUpdatePayload,
  Badge,
  BadgeCreatePayload,
  BadgeLookupResponse,
  CalibrationSummary,
  CalibrationSample,
  SystemSettings,
  AuthUser,
  LoginCredentials,
  AuthResponse
} from '../types';

// Dynamic API Base URL resolution:
// In local dev, falls back to '/api' (proxied by Vite to http://127.0.0.1:8000).
// In production or cloud deployments (Render/Vercel), uses VITE_API_BASE_URL.
const rawBase = import.meta.env.VITE_API_BASE_URL || '';
const API_BASE = rawBase 
  ? (rawBase.endsWith('/api') ? rawBase : `${rawBase.replace(/\/$/, '')}/api`) 
  : '/api';

export async function fetchHealth(): Promise<SystemHealth> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
  return res.json();
}

export async function fetchDemoBadges(): Promise<DemoBadgeItem[]> {
  const res = await fetch(`${API_BASE}/cv/demo-badges`);
  if (!res.ok) throw new Error(`Failed to load demo badges: ${res.statusText}`);
  return res.json();
}

export async function lookupBadge(badgeId: string): Promise<BadgeLookupResponse> {
  const res = await fetch(`${API_BASE}/badges/lookup/${encodeURIComponent(badgeId.trim())}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Badge lookup failed (${res.status})`);
  }
  return res.json();
}

export async function verifyBadge(badgeId: string): Promise<{ data: BadgeLookupResponse; httpStatus: number }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

  try {
    const res = await fetch(`${API_BASE}/badges/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ badge_id: badgeId.trim() }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Server returned error (${res.status})`);
    }

    const data: BadgeLookupResponse = await res.json();
    return { data, httpStatus: res.status };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Connection timed out while verifying badge. Please check your network.');
    }
    throw err;
  }
}

export async function fetchBadges(): Promise<Badge[]> {
  const res = await fetch(`${API_BASE}/badges`);
  if (!res.ok) throw new Error(`Failed to load badges: ${res.statusText}`);
  return res.json();
}

export async function createOrAssignBadge(payload: BadgeCreatePayload): Promise<Badge> {
  const res = await fetch(`${API_BASE}/badges`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to assign badge: ${res.statusText}`);
  }
  return res.json();
}

export async function analyzeBadgeImage(params: {
  file?: File | Blob | null;
  imageBase64?: string | null;
  demoPresetId?: string | null;
  temperatureC?: number;
  humidityPct?: number;
  stripAgeDays?: number;
  badgeIdHint?: string;
}): Promise<CVAnalyzeResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout

  try {
    // If base64 or demoPresetId without a File, use analyze-json endpoint for speed
    if (!params.file && (params.demoPresetId || params.imageBase64)) {
      const res = await fetch(`${API_BASE}/cv/analyze-json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: params.imageBase64 || undefined,
          demo_preset_id: params.demoPresetId || undefined,
          temperature_c: params.temperatureC ?? 25.0,
          humidity_pct: params.humidityPct ?? 50.0,
          strip_age_days: params.stripAgeDays ?? 14.0,
          badge_id_hint: params.badgeIdHint || undefined,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const detailMsg = typeof errData.detail === 'string'
          ? errData.detail
          : (errData.detail?.message || errData.message || `CV Analysis failed (${res.status})`);
        throw new Error(detailMsg);
      }
      return res.json();
    }

    // Otherwise use multipart form
    const formData = new FormData();
    if (params.file) {
      const filename = (params.file instanceof File && params.file.name) ? params.file.name : 'scan_capture.jpg';
      formData.append('file', params.file, filename);
    }
    if (params.imageBase64) formData.append('image_base64', params.imageBase64);
    if (params.demoPresetId) formData.append('demo_preset_id', params.demoPresetId);
    formData.append('temperature_c', String(params.temperatureC ?? 25.0));
    formData.append('humidity_pct', String(params.humidityPct ?? 50.0));
    formData.append('strip_age_days', String(params.stripAgeDays ?? 14.0));
    if (params.badgeIdHint) formData.append('badge_id_hint', params.badgeIdHint);

    const res = await fetch(`${API_BASE}/cv/analyze`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const detailMsg = typeof errData.detail === 'string'
        ? errData.detail
        : (errData.detail?.message || errData.message || `CV Analysis failed (${res.status})`);
      throw new Error(detailMsg);
    }
    return res.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Analysis timed out. Please check your network connection and try again.');
    }
    throw err;
  }
}

export async function saveReading(payload: ReadingCreatePayload): Promise<Reading> {
  const res = await fetch(`${API_BASE}/readings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Failed to save reading (${res.status})`);
  }
  return res.json();
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await fetch(`${API_BASE}/readings/stats/dashboard`);
  if (!res.ok) throw new Error(`Failed to load dashboard stats: ${res.statusText}`);
  return res.json();
}

export async function fetchReadings(params?: {
  workerId?: string;
  status?: string;
  shift?: string;
  limit?: number;
  offset?: number;
}): Promise<Reading[]> {
  const query = new URLSearchParams();
  if (params?.workerId) query.set('worker_id', params.workerId);
  if (params?.status) query.set('status', params.status);
  if (params?.shift) query.set('shift', params.shift);
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.offset) query.set('offset', String(params.offset));

  const url = `${API_BASE}/readings${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch readings: ${res.statusText}`);
  return res.json();
}

export async function fetchReadingById(id: string): Promise<Reading> {
  const res = await fetch(`${API_BASE}/readings/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch reading ${id}: ${res.statusText}`);
  return res.json();
}

export async function fetchWorkers(department?: string): Promise<Worker[]> {
  const query = department ? `?department=${encodeURIComponent(department)}` : '';
  const res = await fetch(`${API_BASE}/workers${query}`);
  if (!res.ok) throw new Error(`Failed to load workers: ${res.statusText}`);
  return res.json();
}

export async function createWorker(payload: WorkerCreatePayload): Promise<Worker> {
  const res = await fetch(`${API_BASE}/workers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to create worker: ${res.statusText}`);
  }
  return res.json();
}

export async function updateWorker(workerId: string, payload: WorkerUpdatePayload): Promise<Worker> {
  const res = await fetch(`${API_BASE}/workers/${workerId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to update worker: ${res.statusText}`);
  }
  return res.json();
}

export async function deleteWorker(workerId: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/workers/${workerId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to delete worker: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchWorkerDetail(workerId: string): Promise<WorkerDetail> {
  const res = await fetch(`${API_BASE}/workers/${workerId}`);
  if (!res.ok) throw new Error(`Failed to load worker detail: ${res.statusText}`);
  return res.json();
}

export async function fetchCalibrationSummary(): Promise<CalibrationSummary> {
  const res = await fetch(`${API_BASE}/calibration/summary`);
  if (!res.ok) throw new Error(`Failed to load calibration summary: ${res.statusText}`);
  return res.json();
}

export async function fetchCalibrationSamples(): Promise<CalibrationSample[]> {
  const res = await fetch(`${API_BASE}/calibration/samples`);
  if (!res.ok) throw new Error(`Failed to load calibration samples: ${res.statusText}`);
  return res.json();
}

export async function addCalibrationSample(data: {
  sample_code: string;
  chamber_run_id: string;
  known_concentration_ppm: number;
  exposure_duration_min: number;
  known_dose_ppm_min: number;
  temperature_c: number;
  humidity_pct: number;
  strip_age_days: number;
  observed_delta_e: number;
  observed_L_star: number;
}): Promise<CalibrationSample> {
  const res = await fetch(`${API_BASE}/calibration/samples`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to add calibration sample: ${res.statusText}`);
  return res.json();
}

export async function fetchSettings(): Promise<SystemSettings> {
  const res = await fetch(`${API_BASE}/settings`);
  if (!res.ok) throw new Error(`Failed to load settings: ${res.statusText}`);
  return res.json();
}

export async function updateSettings(settings: Partial<SystemSettings>): Promise<{ success: boolean; settings: SystemSettings }> {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error(`Failed to update settings: ${res.statusText}`);
  return res.json();
}

export async function seedDemoData(): Promise<any> {
  const res = await fetch(`${API_BASE}/demo/seed`, { method: 'POST' });
  if (!res.ok) throw new Error(`Failed to seed demo data: ${res.statusText}`);
  return res.json();
}

export async function resetDatabase(): Promise<any> {
  const res = await fetch(`${API_BASE}/demo/reset`, { method: 'POST' });
  if (!res.ok) throw new Error(`Failed to reset database: ${res.statusText}`);
  return res.json();
}

// Session Token Management
const TOKEN_KEY = 'h2sentry_session_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function storeToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {}
}

export function clearStoredToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

export async function loginUser(credentials: LoginCredentials): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Sign in failed (${res.status})`);
  }
  const data: AuthResponse = await res.json();
  storeToken(data.token);
  return data;
}

export async function fetchCurrentUser(token?: string): Promise<AuthUser> {
  const activeToken = token || getStoredToken();
  if (!activeToken) throw new Error('No active session token');

  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: {
      Authorization: `Bearer ${activeToken}`
    }
  });
  if (!res.ok) {
    clearStoredToken();
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Session expired');
  }
  return res.json();
}

export async function logoutUser(): Promise<void> {
  const activeToken = getStoredToken();
  if (activeToken) {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${activeToken}`
        }
      });
    } catch {}
  }
  clearStoredToken();
}
