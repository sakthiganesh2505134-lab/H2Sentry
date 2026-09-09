import React from 'react';
import { Camera, Clock, ChevronDown, KeyRound, Sparkles, Activity, AlertTriangle, RefreshCw } from 'lucide-react';
import type { Worker, Reading } from '../../types';

interface WorkerHomeViewProps {
  currentWorker: Worker | null;
  workers: Worker[];
  onSelectWorker: (worker: Worker) => void;
  latestReading: Reading | null;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onNavigateScan: () => void;
  onNavigateHistory: () => void;
}

export const WorkerHomeView: React.FC<WorkerHomeViewProps> = ({
  currentWorker,
  workers,
  onSelectWorker,
  latestReading,
  isLoading = false,
  isError = false,
  onRetry,
  onNavigateScan,
  onNavigateHistory,
}) => {
  const workerName = currentWorker?.name || (workers.length > 0 ? workers[0].name : 'Unassigned Operator');
  const employeeId = currentWorker?.employee_id || 'MRPL-EMP-4091';
  const shiftName = currentWorker?.shift || 'Shift A (Morning)';
  const badgeId = currentWorker?.active_badge_id || 'H2S-BDG-2026-000381';
  const badgeStatus = currentWorker?.badge_status || 'VALID';

  // Determine if we have any actual reading for this worker from backend / state
  const activeReading = latestReading || currentWorker?.latest_reading;
  const hasReading = !!activeReading;

  const currentTwa = activeReading ? activeReading.equivalent_8h_twa_ppm : 0.0;
  const currentDose = activeReading ? activeReading.estimated_dose : 0.0;
  const cumulative30d = currentWorker?.cumulative_30d_dose !== undefined && currentWorker?.cumulative_30d_dose !== null
    ? currentWorker.cumulative_30d_dose
    : (hasReading ? currentDose : 0.0);
  const rawStatus = activeReading ? activeReading.status : 'LOW';
  const confidencePct = activeReading ? activeReading.confidence_pct : 0;
  const dataStatus = activeReading?.data_status || 'SIMULATED';

  // Format status badge & text preserving backend classification
  const getStatusInfo = (statusStr?: string) => {
    const s = String(statusStr || 'LOW').toUpperCase();
    if (s === 'HIGH' || s === 'CRITICAL' || s === 'DANGER') {
      return {
        label: s === 'CRITICAL' ? 'Critical' : (s === 'HIGH' ? 'High' : 'Action Required'),
        badgeClass: 'bg-red-50 text-red-700 border-red-200',
        dotClass: 'bg-red-500 animate-pulse',
      };
    }
    if (s === 'MODERATE' || s === 'ELEVATED' || s === 'WARNING') {
      return {
        label: s === 'MODERATE' ? 'Elevated' : (s === 'WARNING' ? 'Warning' : 'Elevated'),
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
        dotClass: 'bg-amber-500',
      };
    }
    if (s === 'REVIEW') {
      return {
        label: 'Review',
        badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
        dotClass: 'bg-sky-500',
      };
    }
    return {
      label: 'Normal',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      dotClass: 'bg-emerald-500',
    };
  };

  const statusInfo = getStatusInfo(rawStatus);

  // Format time since last scan
  const formatLastScanDate = (isoStr?: string | null) => {
    if (!isoStr) return '09 Sep 2026, 10:42 AM';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      const day = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      return `${day}, ${time}`;
    } catch {
      return isoStr;
    }
  };

  const formatTimeSince = () => {
    if (!activeReading?.timestamp) return null;
    try {
      const scanDate = new Date(activeReading.timestamp);
      const now = new Date();
      const diffMinutes = Math.max(1, Math.round((now.getTime() - scanDate.getTime()) / 60000));
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      const diffHours = Math.floor(diffMinutes / 60);
      const remMinutes = diffMinutes % 60;
      return `${diffHours}h ${remMinutes}m ago`;
    } catch {
      return null;
    }
  };

  const timeSinceStr = formatTimeSince();
  const lastScanFormatted = formatLastScanDate(activeReading?.timestamp);

  return (
    <div className="flex flex-col justify-between min-h-[580px] h-full p-5 space-y-4 animate-fadeIn">
      {/* Top Header */}
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block font-semibold">
            Good morning,
          </span>
          {/* Worker Switcher dropdown */}
          <div className="relative group inline-block">
            <button className="flex items-center space-x-1.5 text-xl sm:text-2xl font-black text-slate-900 font-sans tracking-tight hover:text-sky-700 transition-colors">
              <span>{workerName}</span>
              {workers.length > 1 && (
                <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-sky-700 transition-colors" />
              )}
            </button>
            {workers.length > 1 && (
              <div className="absolute left-0 top-full mt-2 w-60 bg-white border border-slate-200 rounded-2xl shadow-2xl p-2 hidden group-hover:block z-50 animate-fadeIn">
                <div className="text-[10px] font-mono text-slate-400 px-2 py-1 uppercase font-semibold">Switch Operator:</div>
                {workers.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => onSelectWorker(w)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors ${
                      currentWorker?.id === w.id ? 'bg-sky-50 text-sky-800 font-bold' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span className="truncate">{w.name}</span>
                    <span className="text-[10px] font-mono text-slate-400">{w.employee_id}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Assigned Badge & Employee Info */}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] font-mono text-slate-600 font-semibold">
              {employeeId}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
              <KeyRound className="w-3 h-3 text-sky-600" />
              {badgeId}
            </span>
            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${badgeStatus === 'VALID' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {badgeStatus}
            </span>
          </div>
        </div>

        {/* Shift Badge */}
        <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-white border border-slate-200 text-sky-700 shadow-xs">
          {shiftName.toUpperCase().includes('SHIFT') ? shiftName.toUpperCase() : `${shiftName.toUpperCase()} SHIFT`}
        </span>
      </div>

      {/* 30-Day Cumulative Exposure Card (Section 10 - Kept Distinct from Latest Exposure) */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md border border-slate-700/80 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-widest text-sky-400 font-bold flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-sky-400" />
            30-DAY CUMULATIVE EXPOSURE
          </span>
          <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-400/30 font-semibold">
            Last 30 days
          </span>
        </div>

        <div className="flex items-baseline space-x-2">
          <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white">
            {Number(cumulative30d).toLocaleString('en-US')}
          </span>
          <span className="text-sm font-mono text-slate-300 font-normal">
            ppm·min
          </span>
        </div>

        <div className="text-[11px] text-slate-300 font-sans leading-tight">
          Sum of recorded passive exposure estimates during the selected period.
        </div>
      </div>

      {/* PRIMARY LATEST H2S EXPOSURE CARD (Section 3, 4, 5, 6, 7, 8, 11) */}
      {isLoading && !hasReading ? (
        /* Loading State */
        <div className="flex flex-col items-center justify-center py-8 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-3 text-center">
          <div className="w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin" />
          <div className="text-sm font-bold font-mono text-slate-800">
            Loading exposure…
          </div>
          <p className="text-xs text-slate-400 font-sans">
            Retrieving latest passive dosimetry telemetry
          </p>
        </div>
      ) : isError && !hasReading ? (
        /* Error State */
        <div className="flex flex-col items-center justify-center py-8 bg-white rounded-2xl border border-amber-200 shadow-xs p-6 space-y-3 text-center">
          <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="text-sm font-bold font-mono text-slate-900">
            Exposure reading unavailable
          </div>
          <p className="text-xs text-slate-500 font-sans max-w-xs">
            Unable to connect to the dosimetry service. Please check your connection.
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-1 px-4 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-mono font-bold rounded-xl border border-sky-200 transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Try again</span>
            </button>
          )}
        </div>
      ) : hasReading ? (
        /* Active Reading Present: Primary Metric is Numerical ppm·min Value */
        <div className="flex flex-col items-center justify-center text-center py-4 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3.5">
          <div className="w-full flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-sky-600" />
              H₂S EXPOSURE
            </span>
            <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
              Latest Reading
            </span>
          </div>

          {/* Primary Numerical Measurement */}
          <div className="space-y-1">
            <div className="flex items-baseline justify-center space-x-1.5">
              <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-slate-900">
                {Number(currentDose).toLocaleString('en-US', { maximumFractionDigits: 1 })}
              </span>
              <span className="text-base sm:text-lg font-mono font-semibold text-slate-600">
                ppm·min
              </span>
            </div>
            <div className="text-xs font-medium text-slate-500 tracking-tight">
              Estimated cumulative exposure
            </div>
          </div>

          {/* Status & Timestamp (Separated from Value) */}
          <div className="w-full pt-2 border-t border-slate-100 flex flex-col items-center space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-500 font-medium">Status</span>
              <span className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${statusInfo.badgeClass}`}>
                <span className={`w-2 h-2 rounded-full ${statusInfo.dotClass}`} />
                <span>{statusInfo.label}</span>
              </span>
            </div>

            <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Last checked: <strong className="text-slate-700 font-semibold">{lastScanFormatted}</strong></span>
              {timeSinceStr && <span className="text-slate-400">({timeSinceStr})</span>}
            </div>
          </div>

          {/* Secondary Dosimetry Metadata Grid */}
          <div className="w-full pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-center">
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-mono text-slate-400 block uppercase">8-Hr TWA Equivalent</span>
              <span className="text-xs font-mono font-bold text-slate-800">{currentTwa.toFixed(2)} ppm</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-mono text-slate-400 block uppercase">Trust Score</span>
              <span className="text-xs font-mono font-bold text-slate-800">{confidencePct}%</span>
            </div>
          </div>

          <div className="text-[9px] font-mono text-slate-400 uppercase tracking-wider text-center">
            {dataStatus === 'SIMULATED' ? 'SIMULATED / SOFTWARE TEST DATA' : dataStatus}
          </div>
        </div>
      ) : (
        /* Zero Readings Initial State: No reading in database */
        <div className="flex flex-col items-center justify-center py-8 text-center px-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 mb-1 shadow-xs">
            <Camera className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-slate-900 font-mono">
              No exposure reading yet
            </h2>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed font-sans">
              Scan the wristband to record the first reading.
            </p>
          </div>
          <div className="inline-flex items-center gap-1 text-[11px] font-mono text-sky-700 pt-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Badge {badgeId} Ready</span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2 pt-1">
        {/* Primary Scan Button */}
        <button
          onClick={onNavigateScan}
          className="w-full py-3.5 px-4 figma-button-primary text-sm font-bold shadow-md space-x-2 uppercase tracking-wider flex items-center justify-center"
        >
          <Camera className="w-4 h-4 stroke-[2.2]" />
          <span>SCAN BADGE</span>
        </button>

        {/* Secondary View History Button */}
        <button
          onClick={onNavigateHistory}
          className="w-full py-2.5 px-4 figma-button-secondary text-xs font-semibold space-x-1.5 flex items-center justify-center"
        >
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>View Exposure History</span>
        </button>
      </div>
    </div>
  );
};
