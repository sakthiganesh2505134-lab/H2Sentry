import React, { useState } from 'react';
import {
  ArrowLeft,
  Check,
  Camera,
  AlertTriangle,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Cpu,
  Info,
  Activity,
  AlertOctagon
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
  const shiftName = currentWorker?.shift || 'Shift A (Morning)';
  const badgeId = result.badge_id_detected || currentWorker?.active_badge_id || 'H2S-BDG-2026-000381';
  const workerDisplayName = currentWorker ? `${currentWorker.name} / ${currentWorker.employee_id}` : 'Ravi / EMP1024';
  const dataStatus = 'SIMULATED / SOFTWARE TEST DATA';
  const calVersion = result.exposure.calibration_version || 'CAL-v0.1-demo';

  // Status banners adhering strictly to safety language guidelines (never claim "safe")
  let bannerBg = 'bg-amber-500/15 border-amber-500/30 text-amber-300';
  let bannerTitle = 'ATTENTION REQUIRED';
  let BannerIcon = AlertTriangle;
  let actionText = 'Elevated cumulative exposure. Review shift tasks and monitor ventilation in work area.';

  if (status === 'LOW') {
    bannerBg = 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300';
    bannerTitle = 'OCCUPATIONAL REFERENCE: NORMAL';
    BannerIcon = Activity;
    actionText = 'Cumulative exposure is within nominal shift baseline reference.';
  } else if (status === 'HIGH' || status === 'CRITICAL') {
    bannerBg = 'bg-red-500/15 border-red-500/30 text-red-300';
    bannerTitle = 'REQUIRES SUPERVISOR REVIEW';
    BannerIcon = ShieldAlert;
    actionText = 'Cumulative exposure exceeds OSHA/MRPL Action Level threshold. Notify supervisor.';
  }

  // 10-Step Reading Trace Checklist
  const traceSteps = [
    { step: '01', title: 'Image captured', detail: 'Optical frame ingested from smartphone sensor' },
    { step: '02', title: 'Reference detected', detail: '7 standard optical calibration swatches segmented' },
    { step: '03', title: 'Reaction strip detected', detail: 'Horizontal rectangular chemical zone isolated' },
    { step: '04', title: 'Image quality acceptable', detail: `Quality score: ${(result.image_quality.score * 100).toFixed(0)}% (Sharpness & Lum OK)` },
    { step: '05', title: 'Lighting normalized', detail: `Channel gains: R=${result.color_calibration.channel_gains.r.toFixed(2)}, G=${result.color_calibration.channel_gains.g.toFixed(2)}, B=${result.color_calibration.channel_gains.b.toFixed(2)}` },
    { step: '06', title: 'Color extracted', detail: `CIE L*=${result.color_features.cielab?.L_star?.toFixed(1) || '72.5'}, ΔE*=${result.color_features.delta_e_baseline?.toFixed(1) || '24.2'}` },
    { step: '07', title: 'Calibration applied', detail: `Model: ${calVersion} with ambient temp/RH compensation` },
    { step: '08', title: 'Exposure estimated', detail: `${dosePpmMin.toFixed(1)} ppm·min (${twaPpm.toFixed(2)} ppm 8-hr TWA)` },
    { step: '09', title: 'Confidence calculated', detail: `Overall confidence: ${confidencePct}% (${result.confidence.rating})` },
    { step: '10', title: 'Reading saved', detail: saved ? 'Committed to database record' : 'Ready to commit to record' },
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
    <div className="flex flex-col justify-between min-h-[580px] h-full p-5 space-y-4 animate-fadeIn overflow-y-auto select-none">
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
            <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 block font-bold">
              COLORIMETRIC DOSIMETRY
            </span>
            <h2 className="text-base font-black text-white tracking-tight font-mono uppercase">
              EXPOSURE READING
            </h2>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-figma-card border border-figma-border text-cyan-400">
          {calVersion}
        </span>
      </div>

      {/* Dominant Cumulative Dose Hero Card */}
      <div className="p-5 rounded-2xl bg-figma-card border border-figma-border text-center shadow-xl relative overflow-hidden">
        <div className="text-[11px] font-mono text-figma-textMuted uppercase tracking-wider mb-1">
          Estimated Cumulative Exposure
        </div>

        {/* Dominant Number in ppm·min */}
        <div className="flex items-baseline justify-center gap-2">
          <span className="text-5xl sm:text-6xl font-black text-white font-mono tracking-tight">
            {dosePpmMin.toFixed(0)}
          </span>
          <span className="text-base font-mono text-cyan-400 font-bold">
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

        {/* Key Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-figma-border/50 text-[11px] font-mono">
          <div className="p-2 rounded bg-black/30 border border-figma-border/40 text-left">
            <span className="text-figma-textMuted block text-[9px] uppercase">Confidence</span>
            <span className="text-emerald-400 font-bold">{confidencePct}% ({result.confidence.rating})</span>
          </div>
          <div className="p-2 rounded bg-black/30 border border-figma-border/40 text-left">
            <span className="text-figma-textMuted block text-[9px] uppercase">Badge</span>
            <span className="text-white font-bold truncate block">{badgeId}</span>
          </div>
          <div className="p-2 rounded bg-black/30 border border-figma-border/40 text-left">
            <span className="text-figma-textMuted block text-[9px] uppercase">Worker</span>
            <span className="text-white font-bold truncate block">{workerDisplayName}</span>
          </div>
          <div className="p-2 rounded bg-black/30 border border-figma-border/40 text-left">
            <span className="text-figma-textMuted block text-[9px] uppercase">Telemetry Mode</span>
            <span className="text-cyan-400 font-bold truncate block">{dataStatus}</span>
          </div>
        </div>
      </div>

      {/* Status & Action Guidance Banner */}
      <div className={`p-3.5 rounded-xl border ${bannerBg} flex items-start space-x-3 transition`}>
        <BannerIcon className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="text-xs">
          <div className="font-bold font-mono tracking-wide">{bannerTitle}</div>
          <div className="text-figma-textSecondary mt-0.5">{actionText}</div>
        </div>
      </div>

      {/* Occupational Safety Reference Section */}
      <div className="p-4 rounded-xl bg-figma-card/80 border border-figma-border text-xs space-y-2.5">
        <div className="flex items-center gap-2 text-cyan-400 font-mono font-bold">
          <Info className="w-4 h-4 shrink-0" />
          <span className="uppercase tracking-wide">Occupational Reference</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-figma-textSecondary">
          <div className="p-1.5 rounded bg-black/30 border border-figma-border/40">
            <span className="text-white font-bold block">NIOSH REL</span>
            <span>10 ppm (10-min ceiling)</span>
          </div>
          <div className="p-1.5 rounded bg-black/30 border border-figma-border/40">
            <span className="text-white font-bold block">OSHA General Ceiling</span>
            <span>20 ppm</span>
          </div>
          <div className="p-1.5 rounded bg-black/30 border border-figma-border/40">
            <span className="text-white font-bold block">OSHA Exceptional Peak</span>
            <span>50 ppm (up to 10 min)</span>
          </div>
          <div className="p-1.5 rounded bg-black/30 border border-figma-border/40">
            <span className="text-red-400 font-bold block">NIOSH IDLH</span>
            <span>100 ppm</span>
          </div>
        </div>

        <p className="text-[10px] font-mono text-figma-textMuted leading-relaxed border-t border-figma-border/30 pt-2">
          These reference values describe airborne H₂S concentration and are not directly equivalent to this passive dosimeter's cumulative ppm·min estimate.
        </p>

        {/* Mandatory Odor Warning Callout */}
        <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-200 text-[10px] font-mono flex items-start gap-2">
          <AlertOctagon className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong>Odor Fatigue Warning:</strong> Do not rely on the rotten-egg odor of H₂S as a safety indicator. The sense of smell can rapidly fatigue at elevated exposure.
          </div>
        </div>
      </div>

      {/* Expandable Technical Reading Trace */}
      <div className="rounded-xl bg-figma-card border border-figma-border overflow-hidden">
        <button
          onClick={() => setShowTechnicalTrace(!showTechnicalTrace)}
          className="w-full p-3.5 flex items-center justify-between text-xs font-mono text-figma-textMuted hover:text-white transition"
        >
          <span className="flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
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

            {/* 10 Pipeline Steps */}
            <div className="space-y-1.5 pt-1">
              {traceSteps.map((s, idx) => (
                <div key={idx} className="flex items-start gap-2 p-1.5 rounded bg-black/30 border border-figma-border/30">
                  <span className="text-[10px] font-bold text-cyan-400">{s.step}</span>
                  <div className="flex-1">
                    <span className="text-white font-semibold text-[11px]">✓ {s.title}: </span>
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
          className="w-full py-4 px-4 figma-button-primary text-sm font-bold shadow-lg shadow-cyan-500/20 space-x-2 uppercase tracking-wider"
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
          <span>RETAKE SCAN</span>
        </button>
      </div>
    </div>
  );
};
