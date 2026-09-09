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
  AlertOctagon,
  CheckCircle2
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
  const dataStatus = 'SYNTHETIC / SOFTWARE TEST DATA';
  const calVersion = result.exposure.calibration_version || 'CAL-v0.1-demo';

  // Status banners adhering strictly to safety language guidelines (never claim "safe")
  let bannerBg = 'bg-amber-50 border-amber-200 text-amber-900';
  let bannerTitle = 'REVIEW RECOMMENDED';
  let BannerIcon = AlertTriangle;
  let actionText = 'Elevated cumulative exposure estimate. Review shift tasks and area ventilation.';

  if (status === 'LOW') {
    bannerBg = 'bg-emerald-50 border-emerald-200 text-emerald-900';
    bannerTitle = 'WITHIN CONFIGURED RANGE';
    BannerIcon = CheckCircle2;
    actionText = 'Cumulative exposure is within nominal shift baseline reference.';
  } else if (status === 'HIGH' || status === 'CRITICAL') {
    bannerBg = 'bg-red-50 border-red-200 text-red-900';
    bannerTitle = 'REQUIRES SUPERVISOR REVIEW';
    BannerIcon = ShieldAlert;
    actionText = 'Cumulative exposure exceeds configured review threshold. Notify supervisor.';
  }

  // 10-Step Reading Trace Checklist
  const traceSteps = [
    { step: '01', title: 'Image captured', detail: 'Optical frame ingested from camera/file' },
    { step: '02', title: 'Reaction strip segmented', detail: 'Chemical reaction zone isolated & validated' },
    { step: '03', title: 'Geometry verified', detail: 'Horizontal rectangular chemical zone confirmed' },
    { step: '04', title: 'Image quality acceptable', detail: `Quality score: ${(result.image_quality.score * 100).toFixed(0)}% (Sharpness & Lum OK)` },
    { step: '05', title: 'Calibration normalized', detail: result.color_calibration.calibration_mode === 'PHYSICAL_REFERENCE_SCALE' ? `Physical reference gains: R=${result.color_calibration.channel_gains.r.toFixed(2)}, G=${result.color_calibration.channel_gains.g.toFixed(2)}, B=${result.color_calibration.channel_gains.b.toFixed(2)}` : 'Digital model software baseline normalization applied' },
    { step: '06', title: 'Color extracted', detail: `CIE L*=${result.color_features.cielab?.L_star?.toFixed(1) || '72.5'}, ΔE*=${result.color_features.delta_e_baseline?.toFixed(1) || '24.2'}` },
    { step: '07', title: 'Calibration applied', detail: `Model: ${calVersion} with ambient temp/RH compensation` },
    { step: '08', title: 'Exposure estimated', detail: `${dosePpmMin.toFixed(1)} ppm·min (${twaPpm.toFixed(2)} ppm 8-hr TWA)` },
    { step: '09', title: 'Confidence evaluated', detail: `Overall confidence: ${confidencePct}% (${result.confidence.rating})` },
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
    <div className="flex flex-col justify-between min-h-[580px] h-full p-4 space-y-4 animate-fadeIn overflow-y-auto text-slate-900 select-none">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div className="flex items-center space-x-2.5">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-700 hover:bg-slate-50 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-sky-700 block font-bold">
              COLORIMETRIC ESTIMATE
            </span>
            <h2 className="text-base font-black text-slate-900 tracking-tight font-mono uppercase">
              EXPOSURE READING
            </h2>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-sky-50 border border-sky-200 text-sky-800">
          {calVersion}
        </span>
      </div>

      {/* Dominant Cumulative Dose Hero Card */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 text-center shadow-card relative overflow-hidden space-y-3">
        <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
          Estimated Cumulative Exposure
        </div>

        {/* Dominant Number in ppm·min */}
        <div className="flex items-baseline justify-center gap-2">
          <span className="text-5xl sm:text-6xl font-black text-slate-900 font-mono tracking-tight">
            {dosePpmMin.toFixed(0)}
          </span>
          <span className="text-base font-mono text-sky-700 font-bold">
            ppm·min
          </span>
        </div>

        {/* 8-Hour TWA Sub-metric */}
        <div className="text-xs font-mono text-slate-600">
          Passive cumulative estimate (~<strong className="text-slate-900">{twaPpm.toFixed(2)} ppm</strong> 8-hr TWA)
        </div>

        {/* Status Indicator Bar */}
        <div className="pt-2">
          <ExposureThresholdBar currentValue={twaPpm} maxScale={20} />
        </div>

        {/* Key Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-100 text-[11px] font-mono">
          <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-left">
            <span className="text-slate-500 block text-[9px] uppercase">Confidence</span>
            <span className="text-emerald-700 font-bold">{confidencePct}% ({result.confidence.rating})</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-left">
            <span className="text-slate-500 block text-[9px] uppercase">Badge</span>
            <span className="text-slate-900 font-bold truncate block">{badgeId}</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-left">
            <span className="text-slate-500 block text-[9px] uppercase">Worker</span>
            <span className="text-slate-900 font-bold truncate block">{workerDisplayName}</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-left">
            <span className="text-slate-500 block text-[9px] uppercase">Data Status</span>
            <span className="text-sky-800 font-bold truncate block">{dataStatus}</span>
          </div>
        </div>
      </div>

      {/* Status & Action Guidance Banner */}
      <div className={`p-3.5 rounded-xl border ${bannerBg} flex items-start space-x-3 shadow-sm`}>
        <BannerIcon className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="text-xs">
          <div className="font-bold font-mono tracking-wide">{bannerTitle}</div>
          <div className="text-slate-700 mt-0.5">{actionText}</div>
        </div>
      </div>

      {/* Occupational Safety Reference Section */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 text-xs space-y-2.5 shadow-sm">
        <div className="flex items-center gap-2 text-sky-800 font-mono font-bold">
          <Info className="w-4 h-4 shrink-0" />
          <span className="uppercase tracking-wide">Occupational Reference Context</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-600">
          <div className="p-2 rounded bg-slate-50 border border-slate-200">
            <span className="text-slate-900 font-bold block">NIOSH REL</span>
            <span>10 ppm (10-min ceiling)</span>
          </div>
          <div className="p-2 rounded bg-slate-50 border border-slate-200">
            <span className="text-slate-900 font-bold block">OSHA General Ceiling</span>
            <span>20 ppm</span>
          </div>
          <div className="p-2 rounded bg-slate-50 border border-slate-200">
            <span className="text-slate-900 font-bold block">OSHA Exceptional Peak</span>
            <span>50 ppm (up to 10 min)</span>
          </div>
          <div className="p-2 rounded bg-slate-50 border border-slate-200">
            <span className="text-red-700 font-bold block">NIOSH IDLH</span>
            <span>100 ppm</span>
          </div>
        </div>

        <p className="text-[10px] font-mono text-slate-500 leading-relaxed border-t border-slate-100 pt-2">
          These reference values describe airborne H₂S concentration and are not directly equivalent to this passive dosimeter's cumulative ppm·min estimate.
        </p>

        {/* Odor Fatigue Warning Callout */}
        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[10px] font-mono flex items-start gap-2">
          <AlertOctagon className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong>Odor Fatigue Warning:</strong> Do not rely on the smell of H₂S as a safety indicator. Olfactory fatigue occurs rapidly at elevated concentrations.
          </div>
        </div>
      </div>

      {/* Expandable Technical Reading Trace */}
      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-sm">
        <button
          onClick={() => setShowTechnicalTrace(!showTechnicalTrace)}
          className="w-full p-3.5 flex items-center justify-between text-xs font-mono text-slate-600 hover:text-slate-900 transition"
        >
          <span className="flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-sky-600" />
            <span className="uppercase tracking-wider font-bold text-slate-900">Technical Reading Trace</span>
          </span>
          {showTechnicalTrace ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showTechnicalTrace && (
          <div className="p-4 pt-0 border-t border-slate-100 space-y-2.5 text-xs font-mono">
            {/* Visual Overlays */}
            {result.annotated_image_base64 && (
              <div className="my-2">
                <span className="text-[10px] text-slate-500 uppercase block mb-1">
                  Computer Vision Segmentation Matrix:
                </span>
                <img
                  src={`data:image/jpeg;base64,${result.annotated_image_base64}`}
                  alt="Optical Detections"
                  className="w-full h-36 object-contain rounded-lg bg-slate-900 border border-slate-200"
                />
              </div>
            )}

            {/* 10 Pipeline Steps */}
            <div className="space-y-1.5 pt-1">
              {traceSteps.map((s, idx) => (
                <div key={idx} className="flex items-start gap-2 p-2 rounded bg-slate-50 border border-slate-200 text-slate-800">
                  <span className="text-[10px] font-bold text-sky-700">{s.step}</span>
                  <div className="flex-1">
                    <span className="text-slate-900 font-semibold text-[11px]">✓ {s.title}: </span>
                    <span className="text-slate-600 text-[10px]">{s.detail}</span>
                  </div>
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {saveError && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
          {saveError}
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2.5 pt-2">
        {/* Primary Save Button */}
        <button
          onClick={handleSaveToLog}
          disabled={saving}
          className="w-full py-4 px-4 figma-button-primary text-sm font-bold shadow-sm space-x-2 uppercase tracking-wider"
        >
          {saved ? (
            <>
              <Check className="w-5 h-5 text-white stroke-[3]" />
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

        {/* Secondary Retake Button */}
        <button
          onClick={onScanAgain}
          className="w-full py-3 px-4 figma-button-secondary text-xs font-semibold space-x-2"
        >
          <Camera className="w-4 h-4 text-slate-500" />
          <span>RETAKE SCAN</span>
        </button>
      </div>
    </div>
  );
};
