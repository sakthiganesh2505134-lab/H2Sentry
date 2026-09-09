import React, { useState } from 'react';
import { ChevronRight, Clock, Layers } from 'lucide-react';
import type { Reading, Worker } from '../../types';

interface WorkerHistoryViewProps {
  readings: Reading[];
  currentWorker: Worker | null;
  onSelectReading: (reading: Reading) => void;
}

export const WorkerHistoryView: React.FC<WorkerHistoryViewProps> = ({
  readings,
  currentWorker,
  onSelectReading,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Filter readings
  const filteredReadings = readings.filter((r) => {
    if (statusFilter === 'REVIEW') {
      return r.status === 'HIGH' || r.status === 'CRITICAL' || r.status === 'MODERATE';
    }
    if (statusFilter === 'NOMINAL') {
      return r.status === 'LOW' || (r.status as string) === 'SAFE';
    }
    return true;
  });

  const getStatusDisplay = (status: string) => {
    const s = (status || 'LOW').toUpperCase();
    if (s === 'DANGER' || s === 'CRITICAL' || s === 'HIGH') {
      return { 
        text: 'Action level review recommended', 
        badgeBg: 'bg-red-50 border-red-200 text-red-700',
        dotColor: 'bg-red-500'
      };
    }
    if (s === 'ELEVATED' || s === 'MODERATE' || s === 'WARNING') {
      return { 
        text: 'Review recommended', 
        badgeBg: 'bg-amber-50 border-amber-200 text-amber-700',
        dotColor: 'bg-amber-500'
      };
    }
    return { 
      text: 'Within configured range', 
      badgeBg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      dotColor: 'bg-emerald-500'
    };
  };

  const formatTimestamp = (ts?: string) => {
    if (!ts) return { day: 'Today', time: '16:42' };
    try {
      const date = new Date(ts);
      const isToday = new Date().toDateString() === date.toDateString();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday = yesterday.toDateString() === date.toDateString();

      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (isToday) return { day: 'Today', time: timeStr };
      if (isYesterday) return { day: 'Yesterday', time: timeStr };
      
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return { day: `${date.getDate().toString().padStart(2, '0')} ${monthNames[date.getMonth()]}`, time: timeStr };
    } catch {
      return { day: '08 Sep', time: '16:42' };
    }
  };

  return (
    <div className="flex flex-col min-h-[580px] h-full p-4 space-y-4 animate-fadeIn overflow-y-auto text-slate-900 select-none">
      {/* Top Title */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-sky-700 font-bold block">
            PASSIVE COLORIMETRIC RECORD
          </span>
          <h1 className="text-xl font-black text-slate-900 font-mono">
            H₂S Exposure History
          </h1>
          <span className="text-xs font-mono text-slate-500">
            Worker: {currentWorker?.name || 'Ravi'} ({currentWorker?.employee_id || 'EMP1024'})
          </span>
        </div>
        <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-sm text-sky-600">
          <Clock className="w-5 h-5" />
        </div>
      </div>

      {/* Scientifically Honest Disclaimer Callout */}
      <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-900 font-mono space-y-1">
        <div className="flex items-center gap-1.5 font-bold">
          <Layers className="w-3.5 h-3.5 text-sky-600" />
          <span>Passive Cumulative Estimate</span>
        </div>
        <p className="text-[11px] text-slate-600 leading-relaxed font-sans">
          Values are expressed in <strong>ppm·min</strong> (estimated cumulative passive exposure). These measurements represent integrated shift dose, not instantaneous airborne peaks.
        </p>
      </div>

      {/* Filter Status Chips */}
      <div className="flex items-center space-x-2 overflow-x-auto scrollbar-none py-0.5">
        {[
          { id: 'ALL', label: 'All Records' },
          { id: 'NOMINAL', label: 'Within Configured Range' },
          { id: 'REVIEW', label: 'Review Recommended' }
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setStatusFilter(f.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-mono transition-colors ${
              statusFilter === f.id
                ? 'bg-sky-600 text-white font-bold shadow-sm'
                : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200 shadow-sm'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Chronological Reading List */}
      <div className="space-y-2.5 flex-1 overflow-y-auto pr-0.5">
        {filteredReadings.length === 0 ? (
          <div className="text-center py-12 text-xs font-mono text-slate-500 bg-white rounded-xl border border-slate-200 p-6">
            No exposure readings recorded yet for this filter.
          </div>
        ) : (
          filteredReadings.map((item) => {
            const statusInfo = getStatusDisplay(item.status);
            const formatted = formatTimestamp(item.timestamp);
            const badgeId = item.badge_id || currentWorker?.active_badge_id || 'H2S-BDG-2026-000381';
            const calVer = item.calibration_version || 'CAL-v0.1-demo';

            return (
              <div
                key={item.id}
                onClick={() => onSelectReading(item)}
                className="p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 shadow-card hover:shadow-card-hover cursor-pointer transition-all flex items-center justify-between group active:scale-[0.99]"
              >
                <div className="space-y-1.5 flex-1 pr-3">
                  <div className="flex items-center space-x-2 text-xs font-mono">
                    <span className="font-bold text-slate-900">{formatted.day}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500">{formatted.time}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-sky-800 font-semibold">{badgeId}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${statusInfo.badgeBg} flex items-center gap-1`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotColor}`} />
                      <span>{statusInfo.text}</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {item.shift || 'Current shift'}
                    </span>
                  </div>

                  <div className="text-[10px] font-mono text-slate-400">
                    Calibration: {calVer} • Conf: {(item.confidence * 100).toFixed(0)}%
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <div className="text-right">
                    <div className="text-xl font-black text-slate-900 font-mono tracking-tight">
                      {item.estimated_dose.toFixed(0)} <span className="text-xs font-mono text-sky-700 font-normal">ppm·min</span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">
                      ~{item.equivalent_8h_twa_ppm.toFixed(2)} ppm 8h TWA
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600 transition-colors" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
