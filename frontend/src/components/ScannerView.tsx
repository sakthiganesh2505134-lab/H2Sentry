import React, { useState, useRef, useEffect } from 'react';
import { 
  Scan, 
  Upload, 
  Camera, 
  ShieldAlert, 
  Sliders, 
  Save, 
  Eye, 
  Thermometer, 
  Droplets, 
  Clock, 
  Info, 
  RefreshCw,
  Check,
  Zap,
  AlertTriangle
} from 'lucide-react';
import type { 
  DemoBadgeItem, 
  CVAnalyzeResponse, 
  Worker, 
  ReadingCreatePayload 
} from '../types';
import { analyzeBadgeImage, saveReading } from '../services/api';

interface ScannerViewProps {
  demoBadges: DemoBadgeItem[];
  workers: Worker[];
  initialPresetId?: string | null;
  onReadingSaved: () => void;
  onOpenWorkerDossier?: (workerId: string) => void;
}

export const ScannerView: React.FC<ScannerViewProps> = ({
  demoBadges,
  workers,
  initialPresetId,
  onReadingSaved,
}) => {
  // Mode selection: 'preset' | 'upload' | 'camera'
  const [mode, setMode] = useState<'preset' | 'upload' | 'camera'>('preset');
  const [selectedPresetId, setSelectedPresetId] = useState<string>(initialPresetId || 'badge_moderate_742ppm');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Environmental Parameters
  const [temperatureC, setTemperatureC] = useState<number>(28.0);
  const [humidityPct, setHumidityPct] = useState<number>(65.0);
  const [stripAgeDays, setStripAgeDays] = useState<number>(14.0);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('w-01');
  const [badgeIdHint, setBadgeIdHint] = useState<string>('MRPL-H2S-8821');

  // Pipeline execution state
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<CVAnalyzeResponse | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [savingRecord, setSavingRecord] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // UI tabs for optical breakdown
  const [viewOverlay, setViewOverlay] = useState<'annotated' | 'raw'>('annotated');
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<'overview' | 'regions' | 'calibration' | 'science'>('overview');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update selected preset if passed as prop
  useEffect(() => {
    if (initialPresetId) {
      setSelectedPresetId(initialPresetId);
      setMode('preset');
    }
  }, [initialPresetId]);

  // Sync badge ID with preset
  useEffect(() => {
    if (mode === 'preset') {
      const p = demoBadges.find((b) => b.id === selectedPresetId);
      if (p) {
        setBadgeIdHint(p.badge_id);
      }
    }
  }, [selectedPresetId, mode, demoBadges]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setMode('upload');
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleRunAnalysis = async () => {
    setAnalyzing(true);
    setAnalysisError(null);
    setSavedSuccess(false);

    try {
      let res: CVAnalyzeResponse;
      if (mode === 'preset') {
        res = await analyzeBadgeImage({
          demoPresetId: selectedPresetId,
          temperatureC,
          humidityPct,
          stripAgeDays,
          badgeIdHint,
        });
      } else if (mode === 'upload' && uploadedFile) {
        res = await analyzeBadgeImage({
          file: uploadedFile,
          temperatureC,
          humidityPct,
          stripAgeDays,
          badgeIdHint,
        });
      } else {
        throw new Error('Please select a synthetic preset badge or upload a dosimeter image.');
      }

      setAnalysisResult(res);
    } catch (err: any) {
      setAnalysisError(err.message || 'CV analysis failed. Please check image quality.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCommitToDossier = async () => {
    if (!analysisResult) return;
    setSavingRecord(true);
    try {
      const selectedWorker = workers.find((w) => w.id === selectedWorkerId);
      const payload: ReadingCreatePayload = {
        worker_id: selectedWorkerId || undefined,
        badge_id: badgeIdHint || 'MRPL-H2S-8821',
        shift: selectedWorker?.shift || 'Shift A',
        temperature_c: temperatureC,
        humidity_pct: humidityPct,
        strip_age_days: stripAgeDays,
        estimated_dose: analysisResult.exposure.estimated_dose,
        equivalent_8h_twa_ppm: analysisResult.exposure.equivalent_8h_twa_ppm,
        dose_unit: analysisResult.exposure.unit,
        confidence: analysisResult.confidence.confidence,
        status: analysisResult.exposure.status,
        expiry_status: analysisResult.expiry.status,
        image_quality_score: analysisResult.image_quality.score,
        image_quality_valid: analysisResult.image_quality.valid,
        color_features: analysisResult.color_features,
        detections: analysisResult.detections,
        warnings: analysisResult.warnings,
        source: mode === 'preset' ? 'DEMO_PRESET' : 'UPLOAD',
        annotated_image_base64: analysisResult.annotated_image_base64,
      };

      await saveReading(payload);
      setSavedSuccess(true);
      onReadingSaved();
    } catch (err: any) {
      setAnalysisError(err.message || 'Failed to save reading to database.');
    } finally {
      setSavingRecord(false);
    }
  };

  const getStatusVerdictColor = (status: string) => {
    switch (status) {
      case 'LOW':
        return { bg: 'bg-emerald-950/80', border: 'border-emerald-500/50', text: 'text-emerald-400', glow: 'shadow-emerald-500/10' };
      case 'MODERATE':
        return { bg: 'bg-amber-950/80', border: 'border-amber-500/50', text: 'text-amber-400', glow: 'shadow-amber-500/10' };
      case 'HIGH':
        return { bg: 'bg-orange-950/80', border: 'border-orange-500/50', text: 'text-orange-400', glow: 'shadow-orange-500/10' };
      case 'CRITICAL':
        return { bg: 'bg-red-950/80', border: 'border-red-500/50', text: 'text-red-400', glow: 'shadow-red-500/20' };
      default:
        return { bg: 'bg-industrial-850', border: 'border-industrial-700', text: 'text-slate-200', glow: '' };
    }
  };

  const currentPreset = demoBadges.find((b) => b.id === selectedPresetId);

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-xl bg-gradient-to-r from-industrial-900 via-industrial-850 to-industrial-900 border border-industrial-700/80 shadow-xl">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-safety-cyan uppercase tracking-wider mb-1">
            <Scan className="w-3.5 h-3.5" />
            <span>Optical Calibration & Computer Vision Pipeline</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Dosimeter Optical Analyzer
          </h1>
          <p className="text-sm text-industrial-300 mt-1 max-w-2xl">
            Multi-stage pipeline: Image quality validation → 6-patch reference scale matrix normalization → diffusion-reaction kinetics estimation → confidence engine.
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-industrial-950/80 p-1.5 rounded-lg border border-industrial-800">
          <button
            onClick={() => setMode('preset')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              mode === 'preset' ? 'bg-safety-cyan text-industrial-950 font-bold' : 'text-industrial-300 hover:text-white'
            }`}
          >
            Synthetic Presets
          </button>
          <button
            onClick={() => setMode('upload')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              mode === 'upload' ? 'bg-safety-cyan text-industrial-950 font-bold' : 'text-industrial-300 hover:text-white'
            }`}
          >
            Upload Photo
          </button>
        </div>
      </div>

      {/* Main Split: Left Input Configuration | Right Live Image Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Inputs & Environmental Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Preset Selector or File Uploader */}
          <div className="p-5 rounded-xl bg-industrial-900/90 border border-industrial-700/70 shadow-lg space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white font-mono flex items-center justify-between">
              <span>{mode === 'preset' ? '1. Select Benchmark Badge' : '1. Upload Badge Photograph'}</span>
              <span className="text-xs text-safety-cyan font-normal">{mode === 'preset' ? 'Deterministic CV' : 'Custom Image'}</span>
            </h3>

            {mode === 'preset' ? (
              <div className="space-y-2">
                <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-1">
                  {demoBadges.map((badge) => (
                    <div
                      key={badge.id}
                      onClick={() => setSelectedPresetId(badge.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                        selectedPresetId === badge.id
                          ? 'bg-industrial-800 border-safety-cyan shadow-md shadow-cyan-500/10'
                          : 'bg-industrial-850/60 border-industrial-750 hover:bg-industrial-800/80 hover:border-industrial-600'
                      }`}
                    >
                      <div className="space-y-0.5 max-w-[75%]">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-semibold text-white font-sans">{badge.title}</span>
                        </div>
                        <p className="text-[11px] text-industrial-400 truncate">{badge.description}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          badge.expiry_status === 'VALID' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-red-950 text-red-300 border border-red-800'
                        }`}>
                          {badge.expiry_status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png"
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-industrial-700 hover:border-safety-cyan/60 rounded-xl p-6 text-center cursor-pointer transition-all bg-industrial-850/40 hover:bg-industrial-800/40"
                >
                  <Upload className="w-8 h-8 text-industrial-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-200 font-medium">Click to browse or drop dosimeter image</p>
                  <p className="text-[10px] text-industrial-500 mt-1">Supports JPEG, PNG (Min resolution 640x480 recommended)</p>
                </div>
                {uploadedFile && (
                  <div className="text-xs font-mono text-safety-cyan flex items-center justify-between bg-industrial-800 p-2 rounded">
                    <span className="truncate">{uploadedFile.name}</span>
                    <span className="text-industrial-400">({(uploadedFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Environmental Conditions & Worker Assignment */}
          <div className="p-5 rounded-xl bg-industrial-900/90 border border-industrial-700/70 shadow-lg space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white font-mono flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-safety-cyan" />
              <span>2. Environmental Kinetics & Dossier Assignment</span>
            </h3>

            {/* Sliders */}
            <div className="space-y-3 text-xs">
              {/* Temperature Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-mono">
                  <span className="text-industrial-300 flex items-center">
                    <Thermometer className="w-3.5 h-3.5 mr-1 text-amber-400" /> Ambient Temperature
                  </span>
                  <span className="font-bold text-white">{temperatureC.toFixed(1)} °C</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="50"
                  step="0.5"
                  value={temperatureC}
                  onChange={(e) => setTemperatureC(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-industrial-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-industrial-500 font-mono">
                  <span>10°C (Cold)</span>
                  <span>25°C (Ref)</span>
                  <span>50°C (High Tropical)</span>
                </div>
              </div>

              {/* Relative Humidity Slider */}
              <div className="space-y-1.5 pt-2 border-t border-industrial-800">
                <div className="flex justify-between font-mono">
                  <span className="text-industrial-300 flex items-center">
                    <Droplets className="w-3.5 h-3.5 mr-1 text-cyan-400" /> Relative Humidity
                  </span>
                  <span className="font-bold text-white">{humidityPct.toFixed(0)} %</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="95"
                  step="1"
                  value={humidityPct}
                  onChange={(e) => setHumidityPct(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-industrial-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-industrial-500 font-mono">
                  <span>20% (Dry)</span>
                  <span>50% (Standard)</span>
                  <span>95% (Monsoon Coastal)</span>
                </div>
              </div>

              {/* Strip Age Days Slider */}
              <div className="space-y-1.5 pt-2 border-t border-industrial-800">
                <div className="flex justify-between font-mono">
                  <span className="text-industrial-300 flex items-center">
                    <Clock className="w-3.5 h-3.5 mr-1 text-industrial-400" /> Chemical Strip Age
                  </span>
                  <span className="font-bold text-white">{stripAgeDays.toFixed(0)} days</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="120"
                  step="1"
                  value={stripAgeDays}
                  onChange={(e) => setStripAgeDays(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-industrial-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Worker Assignment Dropdown */}
              <div className="space-y-1.5 pt-2 border-t border-industrial-800">
                <label className="text-industrial-300 font-mono block">Assign Scan to Workforce Dossier:</label>
                <select
                  value={selectedWorkerId}
                  onChange={(e) => {
                    setSelectedWorkerId(e.target.value);
                    const w = workers.find((item) => item.id === e.target.value);
                    if (w?.active_badge_id) setBadgeIdHint(w.active_badge_id);
                  }}
                  className="w-full bg-industrial-800 border border-industrial-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-safety-cyan"
                >
                  <option value="">-- Guest / Generic Scan --</option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.employee_id}) — {w.department}
                    </option>
                  ))}
                </select>
              </div>

              {/* Badge ID Hint */}
              <div className="space-y-1 pt-1">
                <label className="text-industrial-400 font-mono block text-[11px]">Badge Serial Identifier:</label>
                <input
                  type="text"
                  value={badgeIdHint}
                  onChange={(e) => setBadgeIdHint(e.target.value)}
                  placeholder="e.g. MRPL-H2S-8821"
                  className="w-full bg-industrial-800 border border-industrial-700 rounded-lg px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-safety-cyan"
                />
              </div>
            </div>

            {/* Run Analysis Action Button */}
            <button
              onClick={handleRunAnalysis}
              disabled={analyzing || (mode === 'upload' && !uploadedFile)}
              className={`w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center space-x-2 transition-all shadow-lg ${
                analyzing || (mode === 'upload' && !uploadedFile)
                  ? 'bg-industrial-800 text-industrial-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-safety-cyan to-blue-500 text-industrial-950 hover:from-cyan-400 hover:to-blue-400 shadow-cyan-500/25 transform hover:-translate-y-0.5'
              }`}
            >
              {analyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Executing CV Pipeline & Matrix Normalization...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-current" />
                  <span>Process Dosimeter Badge</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Visual Optical Preview & Segmentation Overlay (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-5 rounded-xl bg-industrial-900/90 border border-industrial-700/70 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white font-mono flex items-center space-x-2">
                <Eye className="w-4 h-4 text-safety-cyan" />
                <span>Optical Frame & Geometric Alignment</span>
              </h3>
              {analysisResult && (
                <div className="flex items-center space-x-1.5 bg-industrial-950 p-1 rounded-md border border-industrial-800 text-xs">
                  <button
                    onClick={() => setViewOverlay('annotated')}
                    className={`px-2 py-0.5 rounded font-mono transition-colors ${
                      viewOverlay === 'annotated' ? 'bg-safety-cyan text-industrial-950 font-bold' : 'text-industrial-400'
                    }`}
                  >
                    CV ROI Overlays
                  </button>
                  <button
                    onClick={() => setViewOverlay('raw')}
                    className={`px-2 py-0.5 rounded font-mono transition-colors ${
                      viewOverlay === 'raw' ? 'bg-safety-cyan text-industrial-950 font-bold' : 'text-industrial-400'
                    }`}
                  >
                    Raw Image
                  </button>
                </div>
              )}
            </div>

            {/* Image Preview Box */}
            <div className="relative rounded-xl overflow-hidden bg-black/80 border border-industrial-800 flex items-center justify-center min-h-[280px] sm:min-h-[340px]">
              {analyzing && (
                <div className="absolute inset-0 z-20 bg-industrial-950/70 backdrop-blur-xs flex flex-col items-center justify-center space-y-3">
                  <div className="w-12 h-12 border-4 border-safety-cyan/20 border-t-safety-cyan rounded-full animate-spin" />
                  <p className="text-xs font-mono text-safety-cyan animate-pulse">
                    Computing CIE L*a*b* & Optical Matrix gains...
                  </p>
                </div>
              )}

              {analysisResult ? (
                <img
                  src={
                    viewOverlay === 'annotated' && analysisResult.annotated_image_base64
                      ? analysisResult.annotated_image_base64
                      : mode === 'preset' && currentPreset
                      ? currentPreset.image_url
                      : previewUrl || ''
                  }
                  alt="Dosimeter Badge"
                  className="max-h-[380px] w-auto object-contain rounded"
                />
              ) : mode === 'preset' && currentPreset ? (
                <img
                  src={currentPreset.image_url}
                  alt={currentPreset.title}
                  className="max-h-[380px] w-auto object-contain rounded"
                />
              ) : previewUrl ? (
                <img src={previewUrl} alt="Upload Preview" className="max-h-[380px] w-auto object-contain rounded" />
              ) : (
                <div className="text-center p-8 text-industrial-500 space-y-2">
                  <Camera className="w-12 h-12 mx-auto text-industrial-600 stroke-1" />
                  <p className="text-xs font-mono">No badge loaded. Select a synthetic preset or upload an image.</p>
                </div>
              )}

              {/* Scanning Laser Line Effect when Analyzing */}
              {analyzing && (
                <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-scan-line shadow-lg shadow-cyan-400" />
              )}
            </div>

            {/* Segmented Crops Mini-Gallery (Reference, Reaction Strip, Expiry) */}
            {analysisResult?.cropped_regions_base64 && (
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-industrial-800 text-xs font-mono">
                <div className="p-2 rounded bg-industrial-850 border border-yellow-500/30 text-center">
                  <div className="text-[10px] text-amber-400 font-semibold mb-1">REF 6-PATCH ROI</div>
                  {analysisResult.cropped_regions_base64.reference ? (
                    <img
                      src={analysisResult.cropped_regions_base64.reference}
                      alt="Ref Scale"
                      className="h-12 w-full object-cover rounded bg-black"
                    />
                  ) : (
                    <div className="h-12 flex items-center justify-center text-industrial-600">N/A</div>
                  )}
                </div>

                <div className="p-2 rounded bg-industrial-850 border border-pink-500/30 text-center">
                  <div className="text-[10px] text-pink-400 font-semibold mb-1">H2S REAGENT STRIP</div>
                  {analysisResult.cropped_regions_base64.reaction_strip ? (
                    <img
                      src={analysisResult.cropped_regions_base64.reaction_strip}
                      alt="Reaction Strip"
                      className="h-12 w-full object-cover rounded bg-black"
                    />
                  ) : (
                    <div className="h-12 flex items-center justify-center text-industrial-600">N/A</div>
                  )}
                </div>

                <div className="p-2 rounded bg-industrial-850 border border-emerald-500/30 text-center">
                  <div className="text-[10px] text-emerald-400 font-semibold mb-1">EXPIRY INDICATOR</div>
                  {analysisResult.cropped_regions_base64.expiry ? (
                    <img
                      src={analysisResult.cropped_regions_base64.expiry}
                      alt="Expiry Reagent"
                      className="h-12 w-full object-cover rounded bg-black"
                    />
                  ) : (
                    <div className="h-12 flex items-center justify-center text-industrial-600">N/A</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Analysis Error Alert */}
      {analysisError && (
        <div className="p-4 rounded-xl bg-red-950/60 border border-red-500/50 text-red-200 text-xs flex items-center space-x-3">
          <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
          <div>
            <strong className="font-semibold text-red-300">Analysis Error:</strong> {analysisError}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EXPLAINABLE OPTICAL RESULTS REPORT (Rendered when analysisResult exists) */}
      {/* ========================================================================= */}
      {analysisResult && (
        <div className="space-y-6 pt-4 border-t border-industrial-800">
          {/* Main Verdict Summary Card */}
          <div className={`p-6 rounded-xl border shadow-xl ${getStatusVerdictColor(analysisResult.exposure.status).bg} ${getStatusVerdictColor(analysisResult.exposure.status).border} ${getStatusVerdictColor(analysisResult.exposure.status).glow}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold uppercase tracking-wider bg-industrial-950/80 text-white border border-industrial-700">
                    Calculated Cumulative Exposure
                  </span>
                  <span className="text-xs font-mono text-industrial-400">
                    ({analysisResult.processing_time_ms} ms CV Latency)
                  </span>
                </div>

                <div className="flex items-baseline space-x-3">
                  <span className="text-4xl sm:text-5xl font-extrabold text-white font-mono tracking-tight">
                    {analysisResult.exposure.estimated_dose}
                  </span>
                  <span className="text-lg font-bold text-industrial-300 font-mono">
                    {analysisResult.exposure.unit}
                  </span>
                </div>

                <p className="text-sm font-medium text-slate-200 max-w-xl">
                  {analysisResult.exposure.status_description}
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1 text-xs font-mono text-industrial-300">
                  <span className="bg-industrial-900/80 px-2.5 py-1 rounded border border-industrial-750">
                    Equivalent 8h TWA: <strong className="text-white">{analysisResult.exposure.equivalent_8h_twa_ppm} ppm</strong>
                  </span>
                  <span className="bg-industrial-900/80 px-2.5 py-1 rounded border border-industrial-750">
                    Environmental Compensation: <strong className="text-safety-cyan">{(analysisResult.exposure.environmental_factors.compensation_factor).toFixed(3)}x</strong>
                  </span>
                </div>
              </div>

              {/* Status Pill & Action Button */}
              <div className="flex flex-col items-start md:items-end space-y-3">
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1.5 rounded-lg font-mono font-extrabold text-sm uppercase tracking-wider bg-industrial-950 border ${getStatusVerdictColor(analysisResult.exposure.status).text} ${getStatusVerdictColor(analysisResult.exposure.status).border}`}>
                    {analysisResult.exposure.status} SEVERITY
                  </span>
                </div>

                {/* Expiry Status Badge */}
                <div className="flex items-center space-x-2 text-xs font-mono">
                  <span className="text-industrial-400">Reagent Shelf-Life:</span>
                  <span className={`px-2 py-0.5 rounded font-bold ${
                    analysisResult.expiry.status === 'VALID' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                    analysisResult.expiry.status === 'EXPIRING_SOON' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                    'bg-red-950 text-red-400 border border-red-800 font-bold'
                  }`}>
                    {analysisResult.expiry.status}
                  </span>
                </div>

                {/* Commit to Dossier Button */}
                <button
                  onClick={handleCommitToDossier}
                  disabled={savingRecord || savedSuccess}
                  className={`px-5 py-2.5 rounded-lg text-xs font-bold font-mono uppercase tracking-wider flex items-center space-x-2 transition-all shadow-md ${
                    savedSuccess
                      ? 'bg-emerald-600 text-white cursor-default'
                      : 'bg-safety-cyan text-industrial-950 hover:bg-cyan-400 shadow-cyan-500/20'
                  }`}
                >
                  {savedSuccess ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Committed to Dossier</span>
                    </>
                  ) : savingRecord ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving to DB...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save to Workforce Dossier</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Optical Analysis Tabs */}
          <div className="flex border-b border-industrial-800 text-xs font-mono space-x-2">
            {[
              { id: 'overview', label: 'Confidence & Quality' },
              { id: 'calibration', label: 'Reference Matrix Calibration' },
              { id: 'science', label: 'CIE L*a*b* Color Kinetics' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveAnalysisTab(t.id as any)}
                className={`pb-2.5 px-3 font-semibold transition-colors border-b-2 ${
                  activeAnalysisTab === t.id
                    ? 'border-safety-cyan text-safety-cyan'
                    : 'border-transparent text-industrial-400 hover:text-slate-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Confidence & Multi-Factor Quality Breakdown */}
          {activeAnalysisTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: Confidence Scorecard */}
              <div className="p-5 rounded-xl bg-industrial-900/90 border border-industrial-700/70 shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono font-bold uppercase text-industrial-400 tracking-wider">
                    Multi-Factor Optical Confidence Engine
                  </h4>
                  <span className={`text-xs font-mono font-extrabold px-2 py-0.5 rounded ${
                    analysisResult.confidence.rating === 'EXCELLENT' ? 'bg-emerald-950 text-emerald-400' :
                    analysisResult.confidence.rating === 'GOOD' ? 'bg-cyan-950 text-cyan-400' :
                    analysisResult.confidence.rating === 'MODERATE' ? 'bg-amber-950 text-amber-400' : 'bg-red-950 text-red-400'
                  }`}>
                    {analysisResult.confidence.rating} ({analysisResult.confidence.confidence_pct}%)
                  </span>
                </div>

                <div className="space-y-3 text-xs font-mono">
                  {Object.entries(analysisResult.confidence.factors).map(([key, f]) => (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between text-industrial-300">
                        <span className="capitalize">{key.replace(/_/g, ' ')} ({Math.round(f.weight * 100)}% wt)</span>
                        <span className="font-bold text-white">{Math.round(f.score * 100)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-industrial-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            f.score >= 0.85 ? 'bg-emerald-500' : f.score >= 0.65 ? 'bg-cyan-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${f.score * 100}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-industrial-500">{f.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Warnings & Image Diagnostics */}
              <div className="p-5 rounded-xl bg-industrial-900/90 border border-industrial-700/70 shadow-lg space-y-4 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-mono font-bold uppercase text-industrial-400 tracking-wider mb-3">
                    Image Quality Diagnostics & Flags
                  </h4>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-industrial-800 font-mono">
                      <span className="text-industrial-400">Blur Metric (Laplacian Var):</span>
                      <span className="text-white font-bold">{analysisResult.image_quality.metrics?.blur_variance ?? 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-industrial-800 font-mono">
                      <span className="text-industrial-400">Mean Frame Luminance:</span>
                      <span className="text-white font-bold">{analysisResult.image_quality.metrics?.mean_brightness ?? 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-industrial-800 font-mono">
                      <span className="text-industrial-400">Dynamic Contrast Std:</span>
                      <span className="text-white font-bold">{analysisResult.image_quality.metrics?.contrast_std ?? 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-industrial-800 font-mono">
                      <span className="text-industrial-400">Reagent Uniformity:</span>
                      <span className="text-white font-bold">
                        {analysisResult.color_features.uniformity_score ? Math.round(analysisResult.color_features.uniformity_score * 100) : 95}%
                      </span>
                    </div>
                  </div>

                  {analysisResult.warnings && analysisResult.warnings.length > 0 && (
                    <div className="mt-4 p-3 rounded-lg bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs space-y-1">
                      <div className="font-semibold text-amber-400 flex items-center space-x-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Notices & Warnings ({analysisResult.warnings.length})</span>
                      </div>
                      {analysisResult.warnings.map((w, idx) => (
                        <p key={idx} className="text-[11px] pl-5">• {w}</p>
                      ))}
                    </div>
                  )}
                </div>

                <div className="text-[11px] text-industrial-400 font-mono pt-3 border-t border-industrial-800">
                  Chemical Expiry State: <strong className="text-slate-200">{analysisResult.expiry.description}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Reference 6-Patch Matrix Calibration */}
          {activeAnalysisTab === 'calibration' && (
            <div className="p-5 rounded-xl bg-industrial-900/90 border border-industrial-700/70 shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-mono font-bold uppercase text-white tracking-wider">
                    Printed 6-Patch Reference Scale Matrix
                  </h4>
                  <p className="text-xs text-industrial-400 mt-0.5">
                    Solves for 3x3 affine color transformation to eliminate camera chromatic bias and ambient lighting artifacts.
                  </p>
                </div>
                <div className="flex items-center space-x-2 font-mono text-xs">
                  <span className="px-2 py-0.5 rounded bg-cyan-950 text-safety-cyan border border-cyan-800">
                    Quality: {Math.round(analysisResult.color_calibration.calibration_quality * 100)}%
                  </span>
                  <span className="px-2 py-0.5 rounded bg-industrial-800 text-industrial-300">
                    Res. Err: {analysisResult.color_calibration.residual_error}
                  </span>
                </div>
              </div>

              {/* 6 Patch Swatches Table */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {analysisResult.color_calibration.observed_patches?.map((p, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-industrial-850 border border-industrial-750 space-y-2">
                    <div className="text-xs font-bold uppercase text-white font-mono">{p.name}</div>
                    <div className="flex space-x-1.5 h-8">
                      {/* Expected */}
                      <div
                        className="w-1/2 h-full rounded border border-industrial-600"
                        style={{ backgroundColor: `rgb(${p.standard_rgb.join(',')})` }}
                        title={`Standard: RGB(${p.standard_rgb.join(',')})`}
                      />
                      {/* Observed */}
                      <div
                        className="w-1/2 h-full rounded border border-industrial-600"
                        style={{ backgroundColor: `rgb(${p.observed_rgb.join(',')})` }}
                        title={`Observed: RGB(${p.observed_rgb.join(',')})`}
                      />
                    </div>
                    <div className="text-[10px] font-mono text-industrial-400 space-y-0.5">
                      <div>Std: {p.standard_rgb.join(', ')}</div>
                      <div>Obs: {p.observed_rgb.join(', ')}</div>
                      <div className="text-safety-cyan font-semibold">ΔRGB: {p.delta_rgb}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Gain Multipliers */}
              <div className="p-3 rounded-lg bg-industrial-800/60 border border-industrial-750 flex flex-wrap items-center justify-between text-xs font-mono text-industrial-300">
                <span>Calculated Channel Gains:</span>
                <span className="text-rose-400">R: {analysisResult.color_calibration.channel_gains.r}x</span>
                <span className="text-emerald-400">G: {analysisResult.color_calibration.channel_gains.g}x</span>
                <span className="text-blue-400">B: {analysisResult.color_calibration.channel_gains.b}x</span>
              </div>
            </div>
          )}

          {/* Tab 3: CIE L*a*b* Color Kinetics Science */}
          {activeAnalysisTab === 'science' && (
            <div className="p-5 rounded-xl bg-industrial-900/90 border border-industrial-700/70 shadow-lg space-y-4">
              <h4 className="text-xs font-mono font-bold uppercase text-white tracking-wider">
                Diffusion-Reaction Chemical Kinetics Model
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                {/* CIE Lab */}
                <div className="p-4 rounded-lg bg-industrial-850 border border-industrial-750 space-y-2">
                  <div className="text-safety-cyan font-bold">CIE 1976 L*a*b* Perceptual Space</div>
                  <div className="space-y-1 text-slate-300">
                    <div>L* (Lightness): <strong className="text-white">{analysisResult.color_features.cielab?.L_star ?? 'N/A'}</strong></div>
                    <div>a* (Red/Green): <strong className="text-white">{analysisResult.color_features.cielab?.a_star ?? 'N/A'}</strong></div>
                    <div>b* (Yellow/Blue): <strong className="text-white">{analysisResult.color_features.cielab?.b_star ?? 'N/A'}</strong></div>
                  </div>
                  <div className="pt-2 border-t border-industrial-750 text-amber-400 font-bold">
                    ΔE* Baseline: {analysisResult.color_features.delta_e_baseline ?? 'N/A'}
                  </div>
                </div>

                {/* Calibrated RGB & HSV */}
                <div className="p-4 rounded-lg bg-industrial-850 border border-industrial-750 space-y-2">
                  <div className="text-safety-cyan font-bold">Calibrated Color Spaces</div>
                  <div className="space-y-1 text-slate-300">
                    <div>
                      RGB: ({analysisResult.color_features.calibrated_rgb?.r ?? 0}, {analysisResult.color_features.calibrated_rgb?.g ?? 0}, {analysisResult.color_features.calibrated_rgb?.b ?? 0})
                    </div>
                    <div>Hue: {analysisResult.color_features.hsv?.hue_deg ?? 0}°</div>
                    <div>Saturation: {analysisResult.color_features.hsv?.saturation_pct ?? 0}%</div>
                    <div>Value: {analysisResult.color_features.hsv?.value_pct ?? 0}%</div>
                  </div>
                </div>

                {/* Environmental Compensation Formula */}
                <div className="p-4 rounded-lg bg-industrial-850 border border-industrial-750 space-y-2">
                  <div className="text-safety-cyan font-bold">Environmental Kinetics Layer</div>
                  <div className="space-y-1 text-slate-300">
                    <div>Temp Factor (+0.8%/°C): <span className="text-white font-bold">{analysisResult.exposure.environmental_factors.temp_multiplier ?? 1.0}x</span></div>
                    <div>RH Factor (+0.3%/%RH): <span className="text-white font-bold">{analysisResult.exposure.environmental_factors.humidity_multiplier ?? 1.0}x</span></div>
                    <div>Raw Uncompensated: <span className="text-white font-bold">{analysisResult.exposure.raw_dose_uncompensated ?? analysisResult.exposure.estimated_dose} ppm·min</span></div>
                  </div>
                  <div className="pt-2 border-t border-industrial-750 text-emerald-400 font-bold">
                    Compensated: {analysisResult.exposure.estimated_dose} ppm·min
                  </div>
                </div>
              </div>

              {/* Scientific Disclosure */}
              <div className="p-3.5 rounded-lg bg-industrial-950 border border-industrial-800 text-[11px] text-industrial-400 space-y-1">
                <div className="font-semibold text-industrial-300 flex items-center space-x-1">
                  <Info className="w-3.5 h-3.5 text-safety-cyan" />
                  <span>Scientific Prototype Notice</span>
                </div>
                <p>{analysisResult.exposure.scientific_disclosure}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
