import React from 'react';
import { X, ShieldAlert, CheckCircle2, AlertTriangle, Gauge, Info, AlertOctagon } from 'lucide-react';
import { ExposureThresholdBar } from './common/ExposureThresholdBar';
import type { Reading } from '../types';

interface ReadingDetailModalProps {
  reading: Reading | null;
  onClose: () => void;
  onOpenWorkerDossier?: (workerId: string) => void;
}

export const ReadingDetailModal: React.FC<ReadingDetailModalProps> = ({
  reading,
  onClose,
  onOpenWorkerDossier,
}) => {
  if (!reading) return null;

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'LOW':
      case 'SAFE':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-cyan-950/80 text-cyan-400 border border-cyan-500/40">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> NORMAL BASELINE ({reading.estimated_dose.toFixed(0)} ppm·min)
          </span>
        );
      case 'MODERATE':
      case 'ELEVATED':
      case 'WARNING':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-amber-950/80 text-amber-400 border border-amber-500/40">
            <AlertTriangle className="w-3.5 h-3.5 mr-1" /> ATTENTION REQUIRED ({reading.estimated_dose.toFixed(0)} ppm·min)
          </span>
        );
      case 'HIGH':
      case 'CRITICAL':
      case 'DANGER':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-red-950/80 text-red-400 border border-red-500/40 animate-pulse">
            <ShieldAlert className="w-3.5 h-3.5 mr-1" /> REQUIRES REVIEW ({reading.estimated_dose.toFixed(0)} ppm·min)
          </span>
        );
      default:
        return null;
    }
  };

  const getExpiryBadge = (status: string) => {
    switch (status) {
      case 'VALID':
        return <span className="text-emerald-400 font-mono text-xs bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">VALID</span>;
      case 'EXPIRING_SOON':
        return <span className="text-amber-400 font-mono text-xs bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">EXPIRING SOON</span>;
      case 'EXPIRED':
        return <span className="text-red-400 font-mono text-xs bg-red-950/60 px-2 py-0.5 rounded border border-red-800 font-semibold">EXPIRED</span>;
      default:
        return <span className="text-slate-400 font-mono text-xs">{status}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="figma-card max-w-2xl w-full max-h-[90vh] overflow-y-auto border-figma-border">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-figma-border/70">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-figma-card border border-figma-border flex items-center justify-center text-cyan-400">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white font-mono uppercase">
                Exposure Scan Dossier
              </h3>
              <p className="text-xs font-mono text-figma-textMuted">Record ID: {reading.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-figma-textMuted hover:text-white rounded-lg hover:bg-figma-card transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          {/* Main Verdict Card */}
          <div className="p-5 rounded-xl bg-figma-card border border-figma-border/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono text-figma-textMuted uppercase tracking-wider">Estimated Cumulative Exposure</span>
              <div className="flex items-baseline space-x-2 mt-1">
                <span className="text-3xl font-extrabold text-white tracking-tight font-mono">
                  {reading.estimated_dose.toFixed(0)}
                </span>
                <span className="text-sm font-semibold text-cyan-400 font-mono">{reading.dose_unit}</span>
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <span className="text-xs text-figma-textSecondary font-mono">
                  Equivalent 8-hour TWA: <strong className="text-white">{reading.equivalent_8h_twa_ppm.toFixed(2)} ppm</strong>
                </span>
              </div>
            </div>

            <div className="flex flex-col items-start md:items-end space-y-2">
              {getStatusBadge(reading.status)}
              <span className="text-xs font-mono text-figma-textMuted">
                Confidence: <strong className="text-emerald-400">{(reading.confidence * 100).toFixed(0)}%</strong>
              </span>
            </div>
          </div>

          {/* Threshold Comparison Bar */}
          <div className="figma-card p-4">
            <ExposureThresholdBar currentValue={reading.equivalent_8h_twa_ppm} maxScale={25} />
          </div>

          {/* Worker & Environmental Metadata */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 rounded-lg bg-figma-card border border-figma-border/50">
              <span className="text-figma-textMuted block text-[10px] uppercase">Worker</span>
              <span className="font-bold text-white block truncate">{reading.worker_name || 'Rajesh Kumar'}</span>
              <span className="text-figma-textMuted text-[10px]">{reading.worker_employee_id || '#8841-A'}</span>
            </div>

            <div className="p-3 rounded-lg bg-figma-card border border-figma-border/50">
              <span className="text-figma-textMuted block text-[10px] uppercase">Dosimeter ID</span>
              <span className="font-bold text-cyan-400 block truncate">{reading.badge_id || 'H2S-BDG-2026-000381'}</span>
              <div className="mt-0.5">{getExpiryBadge(reading.expiry_status)}</div>
            </div>

            <div className="p-3 rounded-lg bg-figma-card border border-figma-border/50">
              <span className="text-figma-textMuted block text-[10px] uppercase">Shift & Time</span>
              <span className="font-bold text-white block">{reading.shift || 'Shift A'}</span>
              <span className="text-figma-textMuted text-[10px]">
                {reading.timestamp ? new Date(reading.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '09:26 AM'}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-figma-card border border-figma-border/50">
              <span className="text-figma-textMuted block text-[10px] uppercase">Environment</span>
              <span className="font-bold text-white block">{reading.temperature_c}°C</span>
              <span className="text-figma-textMuted text-[10px]">{reading.humidity_pct}% RH</span>
            </div>
          </div>

          {/* Occupational Reference Information Box */}
          <div className="p-4 rounded-xl bg-black/40 border border-figma-border text-xs space-y-2">
            <div className="flex items-center gap-1.5 text-cyan-400 font-mono font-bold">
              <Info className="w-3.5 h-3.5" />
              <span>Occupational Airborne Reference Thresholds</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-figma-textSecondary">
              <div>• NIOSH REL: 10 ppm (10-min ceiling)</div>
              <div>• OSHA General Ceiling: 20 ppm</div>
              <div>• OSHA Exceptional Peak: 50 ppm</div>
              <div className="text-red-400 font-bold">• NIOSH IDLH: 100 ppm</div>
            </div>
            <p className="text-[10px] font-mono text-figma-textMuted pt-1 leading-relaxed">
              These reference values describe airborne H₂S concentration and are not directly equivalent to this passive dosimeter's cumulative ppm·min estimate.
            </p>
            <div className="p-2 rounded bg-amber-950/40 border border-amber-500/30 text-amber-200 text-[10px] font-mono flex items-center gap-2">
              <AlertOctagon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Do not rely on the rotten-egg odor of H₂S as a safety indicator (rapid olfactory fatigue).</span>
            </div>
          </div>

          {/* Optical Images / Annotated Overlay */}
          {(reading.annotated_image_path || reading.image_path) && (
            <div className="space-y-2">
              <span className="text-xs font-mono text-figma-textMuted uppercase tracking-wider block">
                Normalized Optical Reference Matrix
              </span>
              <div className="rounded-xl overflow-hidden bg-black border border-figma-border flex items-center justify-center p-2">
                <img
                  src={reading.annotated_image_path || reading.image_path || ''}
                  alt="Reading Optical Analysis"
                  className="max-h-56 object-contain"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-figma-border/70 flex items-center justify-between bg-figma-surface">
          <button
            onClick={onClose}
            className="figma-button-secondary py-2 px-4 text-xs font-mono"
          >
            Close Dossier
          </button>
          {reading.worker_id && onOpenWorkerDossier && (
            <button
              onClick={() => {
                onClose();
                onOpenWorkerDossier(reading.worker_id!);
              }}
              className="figma-button-primary py-2 px-4 text-xs font-bold"
            >
              Open Full Worker Dossier →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
