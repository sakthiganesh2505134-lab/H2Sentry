import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
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
  const [timeTab, setTimeTab] = useState<'today' | 'week' | 'month'>('week');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Filter readings
  const filteredReadings = readings.filter((r) => {
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    return true;
  });

  const getStatusDisplay = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'DANGER' || s === 'CRITICAL' || s === 'HIGH') {
      return { text: 'DANGER', dotColor: 'bg-figma-danger', textColor: 'text-figma-danger' };
    }
    if (s === 'ELEVATED' || s === 'MODERATE' || s === 'WARNING') {
      return { text: 'ELEVATED', dotColor: 'bg-figma-warning', textColor: 'text-figma-warning' };
    }
    return { text: 'SAFE', dotColor: 'bg-figma-safe', textColor: 'text-figma-safe' };
  };

  const formatTimestamp = (ts: string) => {
    try {
      const date = new Date(ts);
      const isToday = new Date().toDateString() === date.toDateString();
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (isToday) return `Today, ${timeStr}`;
      
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[date.getMonth()]} ${date.getDate()}, ${timeStr}`;
    } catch {
      return ts;
    }
  };

  return (
    <div className="flex flex-col min-h-[580px] h-full p-5 space-y-4 animate-fadeIn overflow-y-auto">
      {/* Top Title */}
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight font-sans">
          Exposure Log
        </h2>
        <span className="text-xs font-mono text-figma-textMuted">
          Operator: {currentWorker?.name || 'James Miller'} ({currentWorker?.employee_id || '#8841-A'})
        </span>
      </div>

      {/* Period Filter Tabs Matching Figma */}
      <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-figma-surface border border-figma-border">
        <button
          onClick={() => setTimeTab('today')}
          className={`py-2 text-xs font-bold font-sans rounded-lg transition-all ${
            timeTab === 'today'
              ? 'bg-figma-accent text-black shadow-md shadow-figma-accent/20'
              : 'text-figma-textMuted hover:text-white'
          }`}
        >
          Today
        </button>
        <button
          onClick={() => setTimeTab('week')}
          className={`py-2 text-xs font-bold font-sans rounded-lg transition-all ${
            timeTab === 'week'
              ? 'bg-figma-accent text-black shadow-md shadow-figma-accent/20'
              : 'text-figma-textMuted hover:text-white'
          }`}
        >
          This Week
        </button>
        <button
          onClick={() => setTimeTab('month')}
          className={`py-2 text-xs font-bold font-sans rounded-lg transition-all ${
            timeTab === 'month'
              ? 'bg-figma-accent text-black shadow-md shadow-figma-accent/20'
              : 'text-figma-textMuted hover:text-white'
          }`}
        >
          This Month
        </button>
      </div>

      {/* Filter Status Chips */}
      <div className="flex items-center space-x-2 overflow-x-auto scrollbar-none py-0.5">
        {['ALL', 'SAFE', 'MODERATE', 'CRITICAL'].map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-mono transition-colors ${
              statusFilter === f
                ? 'bg-figma-card text-figma-accent border border-figma-accent/50 font-bold'
                : 'text-figma-textMuted hover:text-white bg-figma-surface border border-figma-border'
            }`}
          >
            {f === 'ALL' ? 'All Logs' : f}
          </button>
        ))}
      </div>

      {/* Exposure History Card List Matching Figma */}
      <div className="space-y-2.5 flex-1 overflow-y-auto pr-0.5">
        {filteredReadings.length === 0 ? (
          <div className="text-center py-12 text-xs font-mono text-figma-textMuted">
            No exposure records logged for this period.
          </div>
        ) : (
          filteredReadings.map((item) => {
            const statusInfo = getStatusDisplay(item.status);
            return (
              <div
                key={item.id}
                onClick={() => onSelectReading(item)}
                className="figma-card p-4 hover:border-figma-borderLight cursor-pointer transition-all flex items-center justify-between group active:scale-[0.99]"
              >
                <div className="space-y-1">
                  <div className="text-xs font-mono text-white font-semibold">
                    {formatTimestamp(item.timestamp)}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`w-2 h-2 rounded-full ${statusInfo.dotColor}`} />
                    <span className={`text-[11px] font-bold font-mono tracking-wider uppercase ${statusInfo.textColor}`}>
                      {statusInfo.text}
                    </span>
                    <span className="text-[10px] text-figma-textMuted">
                      • {item.shift || 'Shift A'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="text-right">
                    <div className="text-lg sm:text-xl font-black text-white font-sans tracking-tight">
                      {item.equivalent_8h_twa_ppm.toFixed(1)} <span className="text-xs font-mono text-figma-textMuted font-normal">ppm</span>
                    </div>
                    <div className="text-[10px] font-mono text-figma-textMuted">
                      {item.estimated_dose.toFixed(0)} ppm·min
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-figma-textMuted group-hover:text-figma-accent transition-colors" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
