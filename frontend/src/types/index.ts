/**
 * H2Sentry Master TypeScript Type Definitions
 * Matches Backend Pydantic & SQLAlchemy Models
 */

export interface SystemHealth {
  status: string;
  service: string;
  version: string;
  opencv_version: string;
  numpy_version: string;
  python_version: string;
  os: string;
  pipeline_state: string;
}

export interface DemoBadgeItem {
  id: string;
  filename: string;
  title: string;
  description: string;
  expected_dose: number;
  expiry_status: string;
  badge_id: string;
  image_url: string;
}

export interface ImageQualityMetrics {
  width: number;
  height: number;
  blur_variance: number;
  mean_brightness: number;
  contrast_std: number;
  dark_clip_pct: number;
  glare_clip_pct?: number;
  sharpness_score: number;
  brightness_score: number;
  contrast_score: number;
}

export interface ImageQualityResult {
  valid: boolean;
  score: number;
  issues: string[];
  warnings: string[];
  metrics?: ImageQualityMetrics;
}

export interface DetectionBox {
  bbox: [number, number, number, number]; // [x, y, w, h]
  confidence: number;
}

export interface DetectionsResult {
  success: boolean;
  error_message?: string | null;
  badge?: DetectionBox;
  reference?: DetectionBox;
  reaction_strip?: DetectionBox;
  expiry?: DetectionBox;
}

export interface ObservedPatch {
  name: string;
  standard_rgb: [number, number, number];
  observed_rgb: [number, number, number];
  delta_rgb: number;
}

export interface ColorCalibrationResult {
  success: boolean;
  calibration_mode?: string;
  calibration_quality: number;
  residual_error: number;
  channel_gains: {
    r: number;
    g: number;
    b: number;
  };
  observed_patches: ObservedPatch[];
  cumulative_scale_swatches?: any[];
  warnings: string[];
}

export interface ExpiryResult {
  status: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'UNKNOWN';
  confidence: number;
  description: string;
  calibrated_rgb?: [number, number, number];
}

export interface EnvironmentalFactors {
  temperature_c: number;
  humidity_pct: number;
  strip_age_days?: number;
  compensation_factor: number;
  temp_multiplier?: number;
  humidity_multiplier?: number;
}

export interface ExposureResult {
  estimated_dose: number;
  unit: string;
  status: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | 'UNKNOWN';
  status_code: string;
  status_description: string;
  equivalent_8h_twa_ppm: number;
  raw_dose_uncompensated?: number;
  calibration_version: string;
  warnings: string[];
  environmental_factors: EnvironmentalFactors;
  scientific_disclosure: string;
}

export interface ConfidenceFactor {
  score: number;
  weight: number;
  description: string;
}

export interface ConfidenceResult {
  confidence: number;
  confidence_pct: number;
  rating: 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'LOW';
  rating_color: string;
  factors: Record<string, ConfidenceFactor>;
  warnings: string[];
}

export interface CVAnalyzeResponse {
  success: boolean;
  processing_time_ms: number;
  image_quality: ImageQualityResult;
  detections: DetectionsResult;
  color_calibration: ColorCalibrationResult;
  color_features: {
    success: boolean;
    raw_rgb?: { r: number; g: number; b: number };
    calibrated_rgb?: { r: number; g: number; b: number };
    hsv?: { hue_deg: number; saturation_pct: number; value_pct: number };
    cielab?: { L_star: number; a_star: number; b_star: number };
    delta_e_baseline?: number;
    uniformity_score?: number;
    noise_std?: number;
    error?: string;
  };
  expiry: ExpiryResult;
  exposure: ExposureResult;
  confidence: ConfidenceResult;
  annotated_image_base64?: string;
  cropped_regions_base64?: {
    reference: string;
    reaction_strip: string;
    expiry: string;
  };
  warnings: string[];
  badge_id_detected?: string | null;
}

export interface Reading {
  id: string;
  worker_id?: string | null;
  worker_name?: string | null;
  worker_employee_id?: string | null;
  department?: string | null;
  unit?: string | null;
  badge_id?: string | null;
  timestamp: string;
  shift: string;
  temperature_c: number;
  humidity_pct: number;
  strip_age_days: number;
  estimated_dose: number;
  equivalent_8h_twa_ppm: number;
  dose_unit: string;
  confidence: number;
  confidence_pct: number;
  status: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  expiry_status: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED';
  image_quality_score: number;
  image_quality_valid: boolean;
  color_features: Record<string, any>;
  detections: Record<string, any>;
  warnings: string[];
  calibration_version: string;
  model_version: string;
  data_status: 'DEMO' | 'SIMULATED' | 'EXPERIMENTAL' | 'VALIDATED';
  source: string;
  image_path?: string | null;
  annotated_image_path?: string | null;
}

export interface ReadingCreatePayload {
  worker_id?: string;
  badge_id?: string;
  shift?: string;
  temperature_c: number;
  humidity_pct: number;
  strip_age_days: number;
  estimated_dose: number;
  equivalent_8h_twa_ppm: number;
  dose_unit: string;
  confidence: number;
  status: string;
  expiry_status: string;
  image_quality_score: number;
  image_quality_valid: boolean;
  color_features?: Record<string, any>;
  detections?: Record<string, any>;
  warnings?: string[];
  data_status?: 'DEMO' | 'SIMULATED' | 'EXPERIMENTAL' | 'VALIDATED';
  source?: string;
  image_base64?: string;
  annotated_image_base64?: string;
}

export interface DashboardStats {
  active_workers_count: number;
  valid_badges_count: number;
  expiring_soon_count: number;
  expired_badges_count: number;
  readings_today_count: number;
  review_required_count: number;
  average_shift_dose: number;
  max_dose_today: number;
  recent_readings: Reading[];
  exposure_distribution: {
    LOW: number;
    MODERATE: number;
    HIGH: number;
    CRITICAL: number;
  };
}

export interface DailyExposureItem {
  date: string;
  day_label: string;
  exposure_ppm_min: number;
  readings_count: number;
}

export interface WorkerSummary {
  worker_id: string;
  employee_id: string;
  worker_name: string;
  department?: string | null;
  unit?: string | null;
  period_days: number;
  cumulative_exposure_ppm_min: number;
  reading_count: number;
  last_reading_ppm_min?: number | null;
  last_reading_timestamp?: string | null;
  first_reading_timestamp?: string | null;
  daily_exposure: DailyExposureItem[];
  dose_unit: string;
  scientific_disclosure: string;
}

export interface Worker {
  id: string;
  employee_id: string;
  name: string;
  department: string;
  unit?: string;
  shift: string;
  contact_phone?: string | null;
  active_badge_id?: string | null;
  badge_status?: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED';
  latest_reading?: Reading | null;
  cumulative_shift_dose?: number;
  cumulative_30d_dose?: number;
  cumulative_15d_dose?: number;
  cumulative_7d_dose?: number;
}

export interface WorkerCreatePayload {
  name: string;
  employee_id: string;
  department: string;
  unit?: string;
  shift: string;
  contact_phone?: string;
}

export interface WorkerUpdatePayload {
  name?: string;
  employee_id?: string;
  department?: string;
  unit?: string;
  shift?: string;
  contact_phone?: string;
  active_badge_id?: string;
}

export interface Badge {
  id: string;
  badge_id: string;
  worker_id?: string | null;
  worker_name?: string | null;
  batch_no: string;
  manufactured_at?: string | null;
  expires_at?: string | null;
  status: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'DECOMMISSIONED';
  calibration_version: string;
  created_at?: string | null;
}

export interface BadgeCreatePayload {
  badge_id: string;
  worker_id?: string;
  batch_no?: string;
  manufactured_at?: string;
  expires_at?: string;
  status?: string;
  calibration_version?: string;
}

export interface BadgeLookupResponse {
  badge_id: string;
  valid: boolean;
  status: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'UNREGISTERED';
  worker_id?: string | null;
  worker_name?: string | null;
  employee_id?: string | null;
  department?: string | null;
  unit?: string | null;
  shift?: string | null;
  issued_at?: string | null;
  expires_at?: string | null;
  last_reading_dose?: number | null;
  last_reading_unit?: string | null;
  last_reading_timestamp?: string | null;
  measurement_period?: string | null;
  cumulative_30d_dose?: number | null;
  cumulative_30d_unit?: string | null;
  calibration_version: string;
  message?: string | null;
}

export interface WorkerDetail {
  worker: Worker;
  badge?: Badge | null;
  readings_history: Reading[];
  total_cumulative_dose: number;
  period_days?: number;
  period_cumulative_dose?: number;
  first_reading_timestamp?: string | null;
  daily_exposure?: DailyExposureItem[];
  lifetime_scans_count: number;
  exposure_trend: Array<{
    timestamp: string;
    dose: number;
    status: string;
    twa_ppm: number;
  }>;
}

export interface CalibrationSample {
  id: string;
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
  predicted_dose_ppm_min: number;
  absolute_error: number;
  relative_error_pct: number;
  data_status?: 'DEMO' | 'SIMULATED' | 'EXPERIMENTAL' | 'VALIDATED';
  calibration_version?: string;
  created_at?: string;
}

export interface CalibrationSummary {
  sample_count: number;
  mae: number;
  rmse: number;
  r_squared: number;
  mean_relative_error_pct: number;
  calibration_version: string;
  model_type: string;
  status: string;
  scientific_notice: string;
  samples: CalibrationSample[];
}

export interface SystemSettings {
  organization_name: string;
  plant_unit: string;
  calibration_version: string;
  cv_engine_version: string;
  thresholds: {
    osha_8hr_pel_ppm: number;
    niosh_ceiling_ppm: number;
    acgih_tlv_twa_ppm: number;
    acgih_stel_ppm: number;
    dose_low_limit_ppm_min: number;
    dose_moderate_limit_ppm_min: number;
    dose_high_limit_ppm_min: number;
  };
  environmental_defaults: {
    default_temp_c: number;
    default_humidity_pct: number;
    default_strip_age_days: number;
  };
  scientific_disclaimer: string;
}

export interface AuthUser {
  id: string;
  username: string;
  employee_id: string;
  name: string;
  role: 'WORKER' | 'SUPERVISOR';
  department: string;
  unit: string;
  shift: string;
  contact_phone?: string | null;
  active_badge_id?: string | null;
  worker_id?: string | null;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
  message?: string;
}
