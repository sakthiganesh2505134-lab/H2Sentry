import React from 'react';
import { Camera, Clock, ChevronDown, KeyRound, Sparkles } from 'lucide-react';
import { CircularTwaGauge } from '../common/CircularTwaGauge';
import type { Worker, Reading } from '../../types';

interface WorkerHomeViewProps {
  currentWorker: Worker | null;
  workers: Worker[];
  onSelectWorker: (worker: Worker) => void;
  latestReading: Reading | null;
  onNavigateScan: () => void;
  onNavigateHistory: () => void;
}

export const WorkerHomeView: React.FC<WorkerHomeViewProps> = ({
  currentWorker,
  workers,
  onSelectWorker,
  latestReading,
  onNavigateScan,
  onNavigateHistory,
}) => {
  const workerName = currentWorker?.name || (workers.length > 0 ? workers[0].name : 'Unassigned Operator');
  const shiftName = currentWorker?.shift || 'Shift A (Morning)';
  const badgeId = currentWorker?.active_badge_id || 'H2S-BDG-000001';
  const badgeStatus = currentWorker?.badge_status || 'VALID';

  // Determine if we have any actual reading for this worker
  const activeReading = latestReading || currentWorker?.latest_reading;
  const hasReading = !!activeReading;

  const currentTwa = activeReading ? activeReading.equivalent_8h_twa_ppm : 0.0;
  const currentDose = activeReading ? activeReading.estimated_dose : 0.0;
  const status = activeReading ? activeReading.status : 'LOW';
  const confidencePct = activeReading ? activeReading.confidence_pct : 0;
  const dataStatus = activeReading?.data_status || 'SIMULATED';

  // Format time since last scan
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

  return (
    <div className="flex flex-col justify-between min-h-[580px] h-full p-6 space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-mono text-figma-textMuted uppercase tracking-wider block">
            Good morning,
          </span>
          {/* Worker Switcher dropdown */}
          <div className="relative group inline-block">
            <button className="flex items-center space-x-1.5 text-xl sm:text-2xl font-bold text-white font-sans tracking-tight hover:text-figma-accent transition-colors">
              <span>{workerName}</span>
              {workers.length > 1 && (
                <ChevronDown className="w-4 h-4 text-figma-textMuted group-hover:text-figma-accent transition-colors" />
              )}
            </button>
            {workers.length > 1 && (
              <div className="absolute left-0 top-full mt-2 w-56 bg-figma-surface border border-figma-border rounded-xl shadow-2xl p-2 hidden group-hover:block z-50">
                <div className="text-[10px] font-mono text-figma-textMuted px-2 py-1 uppercase">Switch Operator:</div>
                {workers.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => onSelectWorker(w)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                      currentWorker?.id === w.id ? 'bg-figma-card text-figma-accent font-bold' : 'text-figma-textSecondary hover:bg-figma-card hover:text-white'
                    }`}
                  >
                    <span className="truncate">{w.name}</span>
                    <span className="text-[10px] font-mono text-figma-textMuted">{w.employee_id}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Assigned Badge Info */}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] font-mono text-figma-textMuted flex items-center gap-1">
              <KeyRound className="w-3 h-3 text-figma-accent" />
              {badgeId}
            </span>
            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${badgeStatus === 'VALID' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
              {badgeStatus}
            </span>
          </div>
        </div>

        {/* Shift Badge */}
        <span className="px-3 py-1 rounded-full text-[11px] font-mono font-bold tracking-wider uppercase bg-figma-card border border-figma-border text-figma-accent shadow-sm">
          {shiftName.toUpperCase().includes('SHIFT') ? shiftName.toUpperCase() : `${shiftName.toUpperCase()} SHIFT`}
        </span>
      </div>

      {/* Main Center Content */}
      {hasReading ? (
        /* When reading exists: Show Gauge & Dose Summary */
        <div className="flex flex-col items-center justify-center my-auto py-2">
          <div className="p-3 rounded-full bg-figma-surface/60 border border-figma-border/40 shadow-2xl relative">
            <CircularTwaGauge
              value={currentTwa}
              status={status}
              unit="ppm"
              size={200}
              strokeWidth={13}
              sublabel="8-HR TWA"
              showIcon={true}
            />
          </div>

          {/* Cumulative Dose Pill */}
          <div className="mt-4 text-center">
            <div className="text-2xl font-black text-white font-mono tracking-tight">
              {currentDose} <span className="text-xs font-normal text-figma-textMuted">ppm·min</span>
            </div>
            <div className="text-[11px] text-figma-textSecondary">
              Estimated Cumulative Dose
            </div>
          </div>

          {/* Badges Bar: Confidence, Validity, Last Scan */}
          <div className="mt-3 flex flex-wrap justify-center items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-figma-surface border border-figma-border text-[11px] font-mono text-figma-textSecondary">
              Confidence: <strong className="text-white">{confidencePct}%</strong>
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-figma-accent/10 text-figma-accent border border-figma-accent/20">
              {dataStatus}
            </span>
            {timeSinceStr && (
              <span className="px-2.5 py-1 rounded-full bg-figma-surface border border-figma-border text-[11px] font-mono text-figma-textMuted">
                {timeSinceStr}
              </span>
            )}
          </div>
        </div>
      ) : (
        /* Zero Readings Initial State */
        <div className="flex flex-col items-center justify-center my-auto py-8 text-center px-4 rounded-3xl bg-figma-card/40 border border-figma-border/60">
          <div className="w-16 h-16 rounded-2xl bg-figma-accent/10 border border-figma-accent/30 flex items-center justify-center text-figma-accent mb-4 shadow-lg shadow-figma-accent/10">
            <Camera className="w-8 h-8" />
          </div>
          <h2 className="text-base font-bold text-white font-mono mb-1.5">
            No Exposure Reading Recorded Yet
          </h2>
          <p className="text-xs text-figma-textSecondary max-w-xs leading-relaxed mb-4">
            Place your disposable colorimetric badge in front of the camera to perform optical cumulative dose estimation.
          </p>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-figma-accent">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Badge {badgeId} Ready</span>
          </div>
        </div>
      )}

      {/* Primary & Secondary Action Buttons */}
      <div className="space-y-3 pt-2">
        {/* Primary Scan Button */}
        <button
          onClick={onNavigateScan}
          className="w-full py-4 px-4 figma-button-primary text-base font-bold shadow-lg shadow-figma-accent/25 space-x-2.5 uppercase tracking-wider"
        >
          <Camera className="w-5 h-5 stroke-[2.2]" />
          <span>SCAN BADGE</span>
        </button>

        {/* Secondary View History Button */}
        {hasReading && (
          <button
            onClick={onNavigateHistory}
            className="w-full py-3 px-4 figma-button-secondary text-xs font-semibold space-x-2"
          >
            <Clock className="w-4 h-4 text-figma-textMuted" />
            <span>View Shift Exposure History</span>
          </button>
        )}
      </div>
    </div>
  );
};
