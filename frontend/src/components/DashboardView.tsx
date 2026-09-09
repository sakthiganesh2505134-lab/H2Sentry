import React, { useState } from 'react';
import { 
  Bell, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  ChevronRight, 
  Calendar, 
  Users, 
  Watch, 
  Activity,
  Sparkles,
  Info,
  CheckCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell
} from 'recharts';
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
  const [selectedTimelineMetric, setSelectedTimelineMetric] = useState<'avg' | 'peak'>('avg');

  // Compute live statistics matching industrial dashboard
  const activeWorkersCount = workers.length > 0 ? workers.length : (stats?.active_workers_count ?? 12);
  const activeBadgesCount = stats?.valid_badges_count ?? (workers.length > 0 ? workers.length - 1 : 11);
  const weeklyReadingsCount = stats?.readings_today_count ? stats.readings_today_count * 5 + 7 : 42;
  const reviewRequiredCount = stats?.review_required_count ?? 3;
  const expiredBadgesCount = stats?.expired_badges_count ?? 1;

  // Calculate statuses from workers list or stats
  let withinRangeCount = 0;
  let reviewCount = 0;
  let actionLevelCount = 0;

  workers.forEach((w) => {
    const s = String(w.latest_reading?.status || 'LOW').toUpperCase();
    if (s === 'SAFE' || s === 'LOW') withinRangeCount++;
    else if (s === 'ELEVATED' || s === 'MODERATE' || s === 'WARNING') reviewCount++;
    else if (s === 'DANGER' || s === 'HIGH' || s === 'CRITICAL') actionLevelCount++;
  });

  if (withinRangeCount === 0 && reviewCount === 0 && actionLevelCount === 0) {
    withinRangeCount = 9;
    reviewCount = 2;
    actionLevelCount = 1;
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
    const s = String(status || 'LOW').toUpperCase();
    if (s === 'DANGER' || s === 'HIGH' || s === 'CRITICAL') {
      return (
        <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-red-50 text-red-700 border border-red-200">
          <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
          <span>Action Required</span>
        </span>
      );
    }
    if (s === 'ELEVATED' || s === 'MODERATE' || s === 'WARNING') {
      return (
        <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          <span>Review Recommended</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        <span>Within Range</span>
      </span>
    );
  };

  // Deterministic 7-Day Exposure Timeline Data (Phase 5 & Phase 8)
  const weeklyExposureData = [
    { day: 'Mon', date: '03 Sep', doseAvg: 420, dosePeak: 540, readings: 6, status: 'Within range' },
    { day: 'Tue', date: '04 Sep', doseAvg: 510, dosePeak: 620, readings: 6, status: 'Within range' },
    { day: 'Wed', date: '05 Sep', doseAvg: 680, dosePeak: 790, readings: 6, status: 'Review recommended' },
    { day: 'Thu', date: '06 Sep', doseAvg: 390, dosePeak: 480, readings: 6, status: 'Within range' },
    { day: 'Fri', date: '07 Sep', doseAvg: 742, dosePeak: 910, readings: 6, status: 'Action level (Ravi - SRU)' },
    { day: 'Sat', date: '08 Sep', doseAvg: 560, dosePeak: 680, readings: 6, status: 'Within range' },
    { day: 'Sun', date: '09 Sep', doseAvg: 610, dosePeak: 750, readings: 6, status: 'Within range' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-sans">
              Supervisor Operations Dashboard
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-sky-50 text-sky-700 border border-sky-200">
              <Sparkles className="w-3 h-3 mr-1 text-sky-600" />
              DEMO DATASET
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-sans">
            MRPL Refinery Unit Dosimetry Command • Real-time personnel telemetry & 7-day exposure register.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <span className="px-3.5 py-1.5 rounded-full text-xs font-mono font-bold tracking-wider uppercase bg-white border border-slate-200 text-slate-700 shadow-xs">
            Shift A (06:00 - 14:00)
          </span>
          <button 
            onClick={() => onNavigateTab('alerts')}
            className="relative p-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors shadow-xs"
          >
            <Bell className="w-4 h-4" />
            {reviewRequiredCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500" />
            )}
          </button>
        </div>
      </div>

      {/* 4 Primary KPI Stat Cards (Phase 6) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Weekly Readings */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-sky-600" />
              WEEKLY READINGS
            </span>
            <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-sky-50 text-sky-700">
              7-Day Total
            </span>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-slate-900 font-sans tracking-tight">
            {weeklyReadingsCount}
          </div>
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>Dosimeter strips analyzed</span>
            <span className="text-emerald-600 font-semibold">100% verified</span>
          </div>
        </div>

        {/* KPI 2: Active Workers */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-600" />
              ACTIVE WORKERS
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <div className="text-3xl sm:text-4xl font-black text-slate-900 font-sans tracking-tight">
            {activeWorkersCount}
          </div>
          <div className="text-xs text-slate-500">
            Across SRU, DCU, CDU & Flare units
          </div>
        </div>

        {/* KPI 3: Active Badges */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Watch className="w-3.5 h-3.5 text-sky-600" />
              ACTIVE BADGES
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {expiredBadgesCount} expired
            </span>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-slate-900 font-sans tracking-tight">
            {activeBadgesCount}
          </div>
          <div className="text-xs text-slate-500">
            Validated optical dosimeters
          </div>
        </div>

        {/* KPI 4: Requires Review */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              REQUIRES REVIEW
            </span>
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          </div>
          <div className="text-3xl sm:text-4xl font-black text-amber-600 font-sans tracking-tight">
            {reviewRequiredCount}
          </div>
          <div className="text-xs text-slate-500">
            Elevated cumulative dose or expired
          </div>
        </div>
      </div>

      {/* 7-DAY EXPOSURE TIMELINE (Phase 5 & Phase 8) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-sky-600" />
              <h2 className="text-base font-bold text-slate-900 font-sans">
                7-Day Workforce Exposure Timeline
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Passive cumulative estimates (<span className="font-mono font-semibold">ppm·min</span>) averaged across refinery units over the previous 7 days.
            </p>
          </div>

          {/* Metric Toggle */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono text-slate-500">Metric:</span>
            <div className="flex p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-xs">
              <button
                onClick={() => setSelectedTimelineMetric('avg')}
                className={`px-3 py-1 rounded-md font-semibold transition ${
                  selectedTimelineMetric === 'avg'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Daily Mean Dose
              </button>
              <button
                onClick={() => setSelectedTimelineMetric('peak')}
                className={`px-3 py-1 rounded-md font-semibold transition ${
                  selectedTimelineMetric === 'peak'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Daily Peak Dose
              </button>
            </div>
          </div>
        </div>

        {/* 7-Day Chart Component */}
        <div className="h-56 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyExposureData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis 
                dataKey="day" 
                stroke="#64748B" 
                tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} 
                axisLine={{ stroke: '#E2E8F0' }}
              />
              <YAxis 
                stroke="#64748B" 
                tick={{ fontSize: 10, fill: '#64748B' }} 
                axisLine={{ stroke: '#E2E8F0' }}
                unit=" ppm·min"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#CBD5E1',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  color: '#0F172A',
                }}
                formatter={(value: any) => [`${value} ppm·min`, selectedTimelineMetric === 'avg' ? 'Average Exposure' : 'Peak Exposure']}
                labelFormatter={(label) => {
                  const match = weeklyExposureData.find(d => d.day === label);
                  return `${label} (${match?.date || ''}) — ${match?.status || ''}`;
                }}
              />
              <ReferenceLine y={600} stroke="#F59E0B" strokeDasharray="4 4" label={{ value: 'Review Threshold (600 ppm·min)', fill: '#D97706', fontSize: 10, position: 'insideTopRight' }} />
              <Bar 
                dataKey={selectedTimelineMetric === 'avg' ? 'doseAvg' : 'dosePeak'} 
                radius={[6, 6, 0, 0]}
              >
                {weeklyExposureData.map((entry, index) => {
                  const val = selectedTimelineMetric === 'avg' ? entry.doseAvg : entry.dosePeak;
                  const color = val >= 700 ? '#DC2626' : val >= 550 ? '#D97706' : '#0284C7';
                  return <Cell key={`cell-${index}`} fill={color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 7-Day Day-by-Day Summary Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-2 border-t border-slate-100">
          {weeklyExposureData.map((item) => (
            <div key={item.day} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center space-y-0.5">
              <div className="text-[11px] font-mono text-slate-500 font-semibold">
                {item.day} • {item.date}
              </div>
              <div className="text-sm font-black font-mono text-slate-900">
                {item.doseAvg} <span className="text-[10px] font-normal text-slate-500">ppm·min</span>
              </div>
              <div className="text-[10px] font-mono text-slate-500">
                {item.readings} readings
              </div>
            </div>
          ))}
        </div>

        {/* Scientific / Disclosure Note */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
          <Info className="w-4 h-4 text-sky-600 shrink-0" />
          <span>
            <strong>Passive Cumulative Metrology Notice:</strong> Values represent estimated cumulative dose (<span className="font-mono">ppm·min</span>) integrated over work shifts. They do not reconstruct instantaneous peak concentrations.
          </span>
        </div>
      </div>

      {/* Main Split: Left Active Team Exposures (65%) | Right Real-time Alarm Stream (35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Active Team Exposures Table (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-sans">
                Active Workforce Personnel Register
              </h2>
              <p className="text-xs text-slate-500">
                Select an operator to inspect complete 7-day dossier and badge history.
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('team')}
              className="text-xs font-mono text-sky-700 hover:text-sky-900 font-bold flex items-center space-x-1"
            >
              <span>View All Dossiers</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-mono text-slate-500 uppercase tracking-wider bg-slate-50/50">
                  <th className="py-2.5 px-3 font-semibold">WORKER</th>
                  <th className="py-2.5 px-3 font-semibold">EMPLOYEE ID</th>
                  <th className="py-2.5 px-3 font-semibold">DEPARTMENT</th>
                  <th className="py-2.5 px-3 font-semibold">LAST READING</th>
                  <th className="py-2.5 px-3 font-semibold text-sky-800">30-DAY CUMULATIVE EXPOSURE</th>
                  <th className="py-2.5 px-3 font-semibold text-right">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {workers.map((worker) => {
                  const lastDose = worker.latest_reading?.estimated_dose ?? (worker.cumulative_shift_dose || 0);
                  const cum30d = worker.cumulative_30d_dose !== undefined && worker.cumulative_30d_dose !== null 
                    ? worker.cumulative_30d_dose 
                    : lastDose;
                  const status = worker.latest_reading?.status || 'LOW';

                  return (
                    <tr
                      key={worker.id}
                      onClick={() => onSelectWorker(worker.id)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-3 font-bold text-slate-900 group-hover:text-sky-700 transition-colors">
                        <div>{worker.name}</div>
                        <div className="text-[10px] font-mono text-slate-400 font-normal">{worker.active_badge_id || 'No Badge'}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700 font-semibold">
                        {worker.employee_id}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {worker.department}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700">
                        {lastDose > 0 ? `${lastDose.toFixed(0)} ppm·min` : '0 ppm·min'}
                        <div className="text-[10px] text-slate-400">{formatLastScan(worker.latest_reading?.timestamp)}</div>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 bg-sky-50/40">
                        <span className="text-sky-950 font-black text-xs">
                          {Number(cum30d).toLocaleString('en-US')}
                        </span>{' '}
                        <span className="text-[10px] font-normal text-slate-500">ppm·min</span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {getStatusBadge(status)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Real-time Attention Stream (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-sans">
                Safety Review Queue
              </h2>
              <p className="text-xs text-slate-500">Priority review events</p>
            </div>
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          </div>

          <div className="space-y-3">
            {/* Alarm Card 1: Elevated Cumulative Dose */}
            <div className="p-4 rounded-xl bg-red-50/70 border border-red-200 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-red-700 flex items-center space-x-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                  <span>ACTION THRESHOLD</span>
                </span>
                <span className="text-[11px] font-mono text-slate-500">09:40 AM</span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 font-sans">Rajesh Kumar</h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Sulfur Recovery (SRU-1) — Dose: <strong className="text-red-700 font-mono">742 ppm·min</strong>
                </p>
              </div>

              <button
                onClick={() => setDispatchedAlerts({ ...dispatchedAlerts, alert1: true })}
                className={`w-full py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 shadow-xs ${
                  dispatchedAlerts.alert1
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {dispatchedAlerts.alert1 ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Area Inspection Dispatched</span>
                  </>
                ) : (
                  <span>Dispatch Field Check</span>
                )}
              </button>
            </div>

            {/* Alarm Card 2: Expired Badge Alert */}
            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-700 flex items-center space-x-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>EXPIRED DOSIMETER BADGE</span>
                </span>
                <span className="text-[11px] font-mono text-slate-500">08:15 AM</span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 font-sans">Manoj Mendon</h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Bitumen Blowing Unit — Badge <strong className="font-mono text-slate-800">MRPL-H2S-4019</strong> expired 15 days ago.
                </p>
              </div>

              <button
                onClick={() => setAcknowledgedAlerts({ ...acknowledgedAlerts, alert2: true })}
                className={`w-full py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 shadow-xs ${
                  acknowledgedAlerts.alert2
                    ? 'bg-slate-100 text-slate-600 border border-slate-200'
                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                }`}
              >
                {acknowledgedAlerts.alert2 ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Replacement Badge Queued</span>
                  </>
                ) : (
                  <span>Issue New Badge</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
