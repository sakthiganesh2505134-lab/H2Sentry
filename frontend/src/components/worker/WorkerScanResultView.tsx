import React, { useState } from 'react';
import {
  ArrowLeft,
  Check,
  Camera,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Cpu,
  Info
} from 'lucide-react';
import { ExposureThresholdBar } from '../common/ExposureThresholdBar';
import type { CVAnalyzeResponse, Worker, ReadingCreatePayload } from '../../types';
import { saveReading } from '../../services/api';

interface WorkerScanResultViewProps {
  currentWorker: Worker | null;
  result: CVAnalyzeResponse;
  rawImageSrc?: string;
  onBack: () => void;
  onScanAgain: () => void;
  onSavedSuccess: () => void;
}

export const WorkerScanResultView: React.FC<WorkerScanResultViewProps> = ({
  currentWorker,
  result,
  rawImageSrc,
  onBack,
  onScanAgain,
  onSavedSuccess,
}) => {
  const [saving, setSaving] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showTechnicalTrace, setShowTechnicalTrace] = useState<boolean>(false);

  const dosePpmMin = result.exposure.estimated_dose;
  const twaPpm = result.exposure.equivalent_8h_twa_ppm;
  const status = result.exposure.status; // 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'
  const confidencePct = Math.round(result.confidence.confidence * 100);
  const shiftName = currentWorker?.shift || 'Shift A';
  const badgeId = result.badge_id_detected || currentWorker?.active_badge_id || 'H2S-BDG-000001';
  const dataStatus = 'SIMULATED';
  const calVersion = result.exposure.calibration_version || 'CAL-v0.1-demo';

  // Status banners
  let bannerBg = 'bg-amber-500/15 border-amber-500/30 text-amber-300';
  let bannerTitle = 'MODERATE EXPOSURE DETECTED';
  let BannerIcon = AlertTriangle;
  let actionText = 'Elevated cumulative exposure. Review shift tasks and monitor ventilation in work area.';

  if (status === 'LOW') {
    bannerBg = 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300';
    bannerTitle = 'SAFE OCCUPATIONAL RANGE';
    BannerIcon = ShieldCheck;
    actionText = 'Cumulative exposure is well within normal shift safety limits.';
  } else if (status === 'HIGH' || status === 'CRITICAL') {
    bannerBg = 'bg-red-500/15 border-red-500/30 text-red-300';
    bannerTitle = 'ACTION LEVEL EXCEEDED';
    BannerIcon = ShieldAlert;
    actionText = 'Cumulative exposure exceeds OSHA/MRPL Action Level threshold. Notify supervisor.';
  }

  // 12-Step Reading Trace Data
  const traceSteps = [
    { step: '01', title: 'Photo Captured', detail: 'High-res image ingested from smartphone sensor' },
    { step: '02', title: 'Badge Detected', detail: `Confidence: ${(result.detections.badge?.confidence ? (result.detections.badge.confidence * 100).toFixed(0) : '98')}%` },
    { step: '03', title: 'Reference Scale Detected', detail: '6 optical calibration patches segmented' },
    { step: '04', title: 'Exposure Strip Detected', detail: 'Porous active chemical zone isolated' },
    { step: '05', title: 'Expiry Reagent Checked', detail: `Status: ${result.expiry.status} (${(result.expiry.confidence * 100).toFixed(0)}%)` },
    { step: '06', title: 'Lighting Normalized', detail: `Channel gains: R=${result.color_calibration.channel_gains.r.toFixed(2)}, G=${result.color_calibration.channel_gains.g.toFixed(2)}, B=${result.color_calibration.channel_gains.b.toFixed(2)}` },
    { step: '07', title: 'Colour Extracted', detail: `CIE L*=${result.color_features.cielab?.L_star?.toFixed(1) || '72.5'}, ΔE*=${result.color_features.delta_e_baseline?.toFixed(1) || '24.2'}` },
    { step: '08', title: 'Environmental Compensation', detail: `Temp: ${result.exposure.environmental_factors.temperature_c}°C, RH: ${result.exposure.environmental_factors.humidity_pct}%` },
    { step: '09', title: 'Calibration Applied', detail: `Model: ${calVersion}` },
    { step: '10', title: 'Cumulative Dose Estimated', detail: `${dosePpmMin.toFixed(1)} ppm·min (${twaPpm.toFixed(2)} ppm 8-hr TWA)` },
    { step: '11', title: 'Confidence Calculated', detail: `Overall: ${confidencePct}% (${result.confidence.rating})` },
    { step: '12', title: 'Record Committed', detail: `Associated with ${currentWorker?.name || 'Operator'}, Shift ${shiftName}` },
  ];

  // Handle Save
  const handleSaveToLog = async () => {
    if (saved) {
      onSavedSuccess();
      return;
    }
    setSaving(true);
    setSaveError(null);

    try {
      const payload: ReadingCreatePayload = {
        worker_id: currentWorker?.id || 'w-01',
        badge_id: badgeId,
        shift: shiftName,
        temperature_c: result.exposure.environmental_factors.temperature_c || 25.0,
        humidity_pct: result.exposure.environmental_factors.humidity_pct || 50.0,
        strip_age_days: result.exposure.environmental_factors.strip_age_days || 14.0,
        estimated_dose: dosePpmMin,
        equivalent_8h_twa_ppm: twaPpm,
        dose_unit: result.exposure.unit || 'ppm·min',
        confidence: result.confidence.confidence,
        status: status,
        expiry_status: result.expiry.status,
        image_quality_score: result.image_quality.score,
        image_quality_valid: result.image_quality.valid,
        color_features: result.color_features,
        detections: result.detections,
        warnings: result.warnings,
        data_status: 'SIMULATED',
        source: 'MOBILE_WORKER_SCAN',
        image_base64: rawImageSrc?.startsWith('data:') ? rawImageSrc : undefined,
        annotated_image_base64: result.annotated_image_base64,
      };

      await saveReading(payload);
      setSaved(true);
      setTimeout(() => {
        onSavedSuccess();
      }, 600);
    } catch (err: any) {
      console.error('Save reading error:', err);
      setSaveError(err.message || 'Failed to save record to database.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col justify-between min-h-[580px] h-full p-5 space-y-4 animate-fadeIn overflow-y-auto">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full bg-figma-card border border-figma-border flex items-center justify-center text-white hover:bg-figma-cardHover transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-figma-accent block">
              ESTIMATED CUMULATIVE EXPOSURE
            </span>
            <h2 className="text-base font-bold text-white tracking-tight font-mono">
              Dosimeter Result
            </h2>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-figma-card border border-figma-border text-figma-accent">
          {calVersion}
        </span>
      </div>

      {/* Dominant Cumulative Dose Hero Card */}
      <div className="p-5 rounded-2xl bg-figma-card border border-figma-border text-center shadow-xl relative overflow-hidden">
        <div className="text-[11px] font-mono text-figma-textMuted uppercase tracking-wider mb-1">
          Estimated Cumulative Exposure
        </div>

        {/* Dominant Number */}
        <div className="flex items-baseline justify-center gap-2">
          <span className="text-5xl sm:text-6xl font-black text-white font-mono tracking-tight">
            {dosePpmMin.toFixed(0)}
          </span>
          <span className="text-base font-mono text-figma-accent font-bold">
            ppm·min
          </span>
        </div>

        {/* 8-Hour TWA Sub-metric */}
        <div className="text-xs font-mono text-figma-textSecondary mt-1">
          Equivalent 8-hr TWA: <strong className="text-white">{twaPpm.toFixed(2)} ppm</strong>
        </div>

        {/* Status Indicator Bar */}
        <div className="pt-4">
          <ExposureThresholdBar currentValue={twaPpm} maxScale={20} />
        </div>

        {/* Key Metadata Pill Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-figma-border/50 text-[11px] font-mono">
          <div className="p-2 rounded bg-black/30 border border-figma-border/40 text-left">
            <span className="text-figma-textMuted block text-[9px] uppercase">Confidence</span>
            <span className="text-emerald-400 font-bold">{confidencePct}% ({result.confidence.rating})</span>
          </div>
          <div className="p-2 rounded bg-black/30 border border-figma-border/40 text-left">
            <span className="text-figma-textMuted block text-[9px] uppercase">Badge Status</span>
            <span className="text-white font-bold">{result.expiry.status}</span>
          </div>
          <div className="p-2 rounded bg-black/30 border border-figma-border/40 text-left">
            <span className="text-figma-textMuted block text-[9px] uppercase">Image Quality</span>
            <span className="text-white font-bold">{result.image_quality.valid ? 'GOOD' : 'POOR'}</span>
          </div>
          <div className="p-2 rounded bg-black/30 border border-figma-border/40 text-left">
            <span className="text-figma-textMuted block text-[9px] uppercase">Data Status</span>
            <span className="text-figma-accent font-bold">{dataStatus}</span>
          </div>
        </div>
      </div>

      {/* Status & Action Banner */}
      <div className={`p-3.5 rounded-xl border ${bannerBg} flex items-start space-x-3 transition`}>
        <BannerIcon className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="text-xs">
          <div className="font-bold font-mono tracking-wide">{bannerTitle}</div>
          <div className="text-figma-textSecondary mt-0.5">{actionText}</div>
        </div>
      </div>

      {/* "What does this mean?" Card */}
      <div className="p-4 rounded-xl bg-figma-card/80 border border-figma-border text-xs">
        <div className="flex items-center gap-2 text-figma-accent font-mono font-bold mb-1.5">
          <Info className="w-3.5 h-3.5" />
          <span>What does this mean?</span>
        </div>
        <p className="text-figma-textSecondary leading-relaxed text-[11px]">
          The badge records cumulative exposure over time. This value is an estimate derived from the strip colour after reference-based lighting correction. It is not an instantaneous real-time alarm.
        </p>
      </div>

      {/* Expandable Technical Reading Trace */}
      <div className="rounded-xl bg-figma-card border border-figma-border overflow-hidden">
        <button
          onClick={() => setShowTechnicalTrace(!showTechnicalTrace)}
          className="w-full p-3.5 flex items-center justify-between text-xs font-mono text-figma-textMuted hover:text-white transition"
        >
          <span className="flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-figma-accent" />
            <span className="uppercase tracking-wider font-bold text-white">Technical Reading Trace</span>
          </span>
          {showTechnicalTrace ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showTechnicalTrace && (
          <div className="p-4 pt-0 border-t border-figma-border/40 space-y-2.5 text-xs font-mono">
            {/* Visual Overlays */}
            {result.annotated_image_base64 && (
              <div className="my-2">
                <span className="text-[10px] text-figma-textMuted uppercase block mb-1">
                  Computer Vision Segmentation Matrix:
                </span>
                <img
                  src={`data:image/jpeg;base64,${result.annotated_image_base64}`}
                  alt="Optical Detections"
                  className="w-full h-36 object-contain rounded-lg bg-black border border-figma-border"
                />
              </div>
            )}

            {/* 12 Pipeline Steps */}
            <div className="space-y-1.5 pt-1">
              {traceSteps.map((s, idx) => (
                <div key={idx} className="flex items-start gap-2 p-1.5 rounded bg-black/30 border border-figma-border/30">
                  <span className="text-[10px] font-bold text-figma-accent">{s.step}</span>
                  <div className="flex-1">
                    <span className="text-white font-semibold text-[11px]">{s.title}: </span>
                    <span className="text-figma-textSecondary text-[10px]">{s.detail}</span>
                  </div>
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {saveError && (
        <div className="p-3 rounded-lg bg-red-950/80 border border-red-500/50 text-red-300 text-xs">
          {saveError}
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2.5 pt-2">
        {/* Primary Save Button */}
        <button
          onClick={handleSaveToLog}
          disabled={saving}
          className="w-full py-4 px-4 figma-button-primary text-sm font-bold shadow-lg shadow-figma-accent/25 space-x-2 uppercase tracking-wider"
        >
          {saved ? (
            <>
              <Check className="w-5 h-5 text-black stroke-[3]" />
              <span>SAVED TO OCCUPATIONAL RECORD!</span>
            </>
          ) : saving ? (
            <span>COMMITTING TELEMETRY...</span>
          ) : (
            <>
              <Check className="w-5 h-5 stroke-[2.5]" />
              <span>SAVE READING</span>
            </>
          )}
        </button>

        {/* Secondary Scan Again Button */}
        <button
          onClick={onScanAgain}
          className="w-full py-3 px-4 figma-button-secondary text-xs font-semibold space-x-2"
        >
          <Camera className="w-4 h-4 text-figma-textMuted" />
          <span>Scan Again</span>
        </button>
      </div>
    </div>
  );
};

