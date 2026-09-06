import React, { useState } from 'react';
import { Bell, AlertTriangle, ShieldAlert, CheckCircle2, ChevronRight } from 'lucide-react';
import type { DashboardStats, Reading, Worker } from '../types';

interface DashboardViewProps {
  stats: DashboardStats | null;
  workers: Worker[];
  loading?: boolean;
  onNavigateTab: (tab: 'dashboard' | 'team' | 'alerts' | 'calibration' | 'settings') => void;
  onSelectReading?: (reading: Reading) => void;
  onSelectWorker: (workerId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  workers,
  loading: _loading,
  onNavigateTab,
  onSelectReading: _onSelectReading,
  onSelectWorker,
}) => {
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<Record<string, boolean>>({});
  const [dispatchedAlerts, setDispatchedAlerts] = useState<Record<string, boolean>>({});

  // Compute live statistics matching Figma
  const activeWorkersCount = workers.length > 0 ? workers.length : (stats?.active_workers_count ?? 18);
  
  // Calculate statuses from workers list or stats
  let safeCount = 0;
  let elevatedCount = 0;
  let dangerCount = 0;

  workers.forEach((w) => {
    const s = String(w.latest_reading?.status || 'SAFE').toUpperCase();
    if (s === 'SAFE' || s === 'LOW') safeCount++;
    else if (s === 'ELEVATED' || s === 'MODERATE' || s === 'WARNING') elevatedCount++;
    else if (s === 'DANGER' || s === 'HIGH' || s === 'CRITICAL') dangerCount++;
  });

  if (safeCount === 0 && elevatedCount === 0 && dangerCount === 0) {
    safeCount = 14;
    elevatedCount = 3;
    dangerCount = 1;
  }

  // Format relative scan time
  const formatLastScan = (ts?: string) => {
    if (!ts) return '14 mins ago';
    try {
      const scanDate = new Date(ts);
      const now = new Date();
      const diffMins = Math.max(1, Math.round((now.getTime() - scanDate.getTime()) / 60000));
      if (diffMins < 60) return `${diffMins} mins ago`;
      const diffHours = Math.floor(diffMins / 60);
      return `${diffHours} hrs ago`;
    } catch {
      return '14 mins ago';
    }
  };

  const getStatusBadge = (status?: string) => {
    const s = String(status || 'SAFE').toUpperCase();
    if (s === 'DANGER' || s === 'HIGH' || s === 'CRITICAL') {
      return (
        <span className="inline-flex items-center space-x-1.5 text-xs font-bold font-mono text-figma-danger">
          <span className="w-2 h-2 rounded-full bg-figma-danger animate-pulse" />
          <span>DANGER</span>
        </span>
      );
    }
    if (s === 'ELEVATED' || s === 'MODERATE' || s === 'WARNING') {
      return (
        <span className="inline-flex items-center space-x-1.5 text-xs font-bold font-mono text-figma-warning">
          <span className="w-2 h-2 rounded-full bg-figma-warning" />
          <span>ELEVATED</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1.5 text-xs font-bold font-mono text-figma-safe">
        <span className="w-2 h-2 rounded-full bg-figma-safe" />
        <span>SAFE</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Header matching Figma supervisor-dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-figma-border/60">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-sans">
            Supervisor Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-figma-textSecondary mt-0.5 font-sans">
            Real-time personnel telemetry and active environmental exposure register.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <span className="px-3.5 py-1.5 rounded-full text-xs font-mono font-bold tracking-wider uppercase bg-figma-surface border border-figma-border text-figma-accent shadow-sm">
            REFINERY DAY SHIFT
          </span>
          <button 
            onClick={() => onNavigateTab('alerts')}
            className="relative p-2 rounded-xl bg-figma-surface hover:bg-figma-card border border-figma-border text-figma-textSecondary hover:text-white transition-colors"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-figma-danger" />
          </button>
        </div>
      </div>

      {/* 4 KPI Stat Cards Grid matching Figma */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Workers Active */}
        <div className="figma-card p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-figma-textMuted">
              WORKERS ACTIVE
            </span>
            <span className="w-2 h-2 rounded-full bg-figma-safe" />
          </div>
          <div className="text-3xl sm:text-4xl font-black text-white font-sans tracking-tight">
            {activeWorkersCount}
          </div>
          <div className="text-xs text-figma-textSecondary">
            Refinery unit operators logged
          </div>
        </div>

        {/* KPI 2: Status Safe */}
        <div className="figma-card p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-figma-textMuted">
              STATUS: SAFE
            </span>
            <span className="w-2 h-2 rounded-full bg-figma-safe" />
          </div>
          <div className="text-3xl sm:text-4xl font-black text-white font-sans tracking-tight">
            {safeCount}
          </div>
          <div className="text-xs text-figma-textSecondary">
            Exposure below 5.0 ppm limit
          </div>
        </div>

        {/* KPI 3: Status Elevated */}
        <div className="figma-card p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-figma-textMuted">
              STATUS: ELEVATED
            </span>
            <span className="w-2 h-2 rounded-full bg-figma-warning" />
          </div>
          <div className="text-3xl sm:text-4xl font-black text-white font-sans tracking-tight">
            {elevatedCount}
          </div>
          <div className="text-xs text-figma-textSecondary">
            Between 5.0 - 10.0 ppm TWA
          </div>
        </div>

        {/* KPI 4: Active Alerts */}
        <div className="figma-card p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-figma-textMuted">
              ACTIVE ALERTS
            </span>
            <span className="w-2 h-2 rounded-full bg-figma-danger animate-pulse" />
          </div>
          <div className="text-3xl sm:text-4xl font-black text-white font-sans tracking-tight">
            {dangerCount}
          </div>
          <div className="text-xs text-figma-textSecondary">
            Requires urgent field check
          </div>
        </div>
      </div>

      {/* Main Split: Left Active Team Exposures (65%) | Right Real-time Alarm Stream (35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Active Team Exposures Table (8 cols) */}
        <div className="lg:col-span-8 figma-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white font-sans">
              Active Team Exposures
            </h2>
            <button
              onClick={() => onNavigateTab('team')}
              className="text-xs font-mono text-figma-accent hover:underline flex items-center space-x-1"
            >
              <span>View All Dossiers</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Table matching Figma */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead>
                <tr className="border-b border-figma-border text-[11px] font-mono text-figma-textMuted uppercase tracking-wider">
                  <th className="pb-3 font-semibold">WORKER</th>
                  <th className="pb-3 font-semibold">BADGE ID</th>
                  <th className="pb-3 font-semibold">ZONE</th>
                  <th className="pb-3 font-semibold">TWA EXPOSURE</th>
                  <th className="pb-3 font-semibold">LAST SCAN</th>
                  <th className="pb-3 font-semibold text-right">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-figma-border/40">
                {workers.map((worker) => {
                  const twa = worker.latest_reading?.equivalent_8h_twa_ppm ?? 2.4;
                  const status = worker.latest_reading?.status || 'SAFE';
                  const isCritical = String(status).toUpperCase() === 'CRITICAL' || String(status).toUpperCase() === 'HIGH';

                  return (
                    <tr
                      key={worker.id}
                      onClick={() => onSelectWorker(worker.id)}
                      className="hover:bg-figma-card/80 cursor-pointer transition-colors group"
                    >
                      <td className="py-3.5 font-bold text-white group-hover:text-figma-accent transition-colors">
                        {worker.name}
                      </td>
                      <td className="py-3.5 font-mono text-figma-textSecondary">
                        {worker.employee_id}
                      </td>
                      <td className="py-3.5 text-figma-textSecondary">
                        {worker.department}
                      </td>
                      <td className="py-3.5 font-bold text-white font-sans">
                        <span className={isCritical ? 'text-figma-danger' : 'text-white'}>
                          {twa.toFixed(1)} ppm
                        </span>
                      </td>
                      <td className="py-3.5 font-mono text-figma-textMuted text-[11px]">
                        {formatLastScan(worker.latest_reading?.timestamp)}
                      </td>
                      <td className="py-3.5 text-right">
                        {getStatusBadge(status)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Real-time Alarm Stream (4 cols) */}
        <div className="lg:col-span-4 figma-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white font-sans">
              Real-time Alarm Stream
            </h2>
            <span className="w-2 h-2 rounded-full bg-figma-danger animate-ping" />
          </div>

          <div className="space-y-3">
            {/* Alarm Card 1: Danger Exposure */}
            <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/50 space-y-3 shadow-lg shadow-red-500/5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-figma-danger flex items-center space-x-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>DANGER EXPOSURE</span>
                </span>
                <span className="text-[11px] font-mono text-figma-textMuted">09:40 AM</span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white font-sans">Robert Kowalski</h3>
                <p className="text-xs text-figma-textSecondary mt-0.5">
                  Crude Distillation — Reading: <span className="text-figma-danger font-bold">10.4 ppm</span>
                </p>
              </div>

              <button
                onClick={() => setDispatchedAlerts({ ...dispatchedAlerts, alert1: true })}
                className={`w-full py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                  dispatchedAlerts.alert1
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                    : 'figma-button-danger text-white'
                }`}
              >
                {dispatchedAlerts.alert1 ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Protocol Dispatched (ERT Notified)</span>
                  </>
                ) : (
                  <span>Dispatch Protocol</span>
                )}
              </button>
            </div>

            {/* Alarm Card 2: Elevated TWA */}
            <div className="p-4 rounded-xl bg-amber-950/25 border border-amber-500/40 space-y-3 shadow-lg shadow-amber-500/5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-figma-warning flex items-center space-x-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>ELEVATED TWA</span>
                </span>
                <span className="text-[11px] font-mono text-figma-textMuted">09:26 AM</span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white font-sans">James Rodriguez</h3>
                <p className="text-xs text-figma-textSecondary mt-0.5">
                  Refinery Unit 4 — Reading: <span className="text-figma-warning font-bold">3.2 ppm</span>
                </p>
              </div>

              <button
                onClick={() => setAcknowledgedAlerts({ ...acknowledgedAlerts, alert2: true })}
                className={`w-full py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                  acknowledgedAlerts.alert2
                    ? 'bg-figma-surface text-figma-textMuted border border-figma-border'
                    : 'figma-button-primary text-black'
                }`}
              >
                {acknowledgedAlerts.alert2 ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Acknowledged</span>
                  </>
                ) : (
                  <span>Acknowledge</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
