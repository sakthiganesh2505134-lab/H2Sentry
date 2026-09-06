import React, { useState, useEffect, useCallback } from 'react';
import { 
  Download, 
  Watch, 
  User,
  Plus,
  KeyRound,
  X
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ReferenceLine 
} from 'recharts';
import { CircularTwaGauge } from './common/CircularTwaGauge';
import type { Worker, WorkerDetail, Reading, WorkerCreatePayload, BadgeCreatePayload } from '../types';
import { fetchWorkers, fetchWorkerDetail, createWorker, createOrAssignBadge } from '../services/api';

interface WorkforceViewProps {
  onSelectReading: (reading: Reading) => void;
  selectedWorkerId?: string | null;
  onNavigateBackToDashboard?: () => void;
}

export const WorkforceView: React.FC<WorkforceViewProps> = ({
  onSelectReading,
  selectedWorkerId: initialSelectedWorkerId,
  onNavigateBackToDashboard,
}) => {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeWorkerId, setActiveWorkerId] = useState<string | null>(initialSelectedWorkerId || null);
  const [workerDetail, setWorkerDetail] = useState<WorkerDetail | null>(null);
  
  // Modals
  const [showAddWorkerModal, setShowAddWorkerModal] = useState<boolean>(false);
  const [showAssignBadgeModal, setShowAssignBadgeModal] = useState<boolean>(false);
  
  // Worker Form State
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newWorkerEmpId, setNewWorkerEmpId] = useState('');
  const [newWorkerDept, setNewWorkerDept] = useState('Sulfur Recovery Unit (SRU-1)');
  const [newWorkerUnit, setNewWorkerUnit] = useState('SRU-1');
  const [newWorkerShift, setNewWorkerShift] = useState('Shift A (Morning 06:00 - 14:00)');
  const [newWorkerPhone, setNewWorkerPhone] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

  // Badge Form State
  const [badgeIdInput, setBadgeIdInput] = useState('');
  const [badgeBatchNo, setBadgeBatchNo] = useState('BATCH-2026-Q3-A');
  const [badgeExpiryDays, setBadgeExpiryDays] = useState(90);

  const loadWorkers = useCallback(async () => {
    try {
      const data = await fetchWorkers();
      setWorkers(data);
      if (data.length > 0 && !activeWorkerId) {
        setActiveWorkerId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load workers', err);
    }
  }, [activeWorkerId]);

  const loadWorkerDetail = useCallback(async (id: string) => {
    try {
      const data = await fetchWorkerDetail(id);
      setWorkerDetail(data);
    } catch (err) {
      console.error('Failed to load worker detail', err);
    }
  }, []);

  useEffect(() => {
    loadWorkers();
  }, [loadWorkers]);

  useEffect(() => {
    if (initialSelectedWorkerId) {
      setActiveWorkerId(initialSelectedWorkerId);
    }
  }, [initialSelectedWorkerId]);

  useEffect(() => {
    if (activeWorkerId) {
      loadWorkerDetail(activeWorkerId);
    }
  }, [activeWorkerId, loadWorkerDetail]);

  const handleCreateWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!newWorkerName.trim() || !newWorkerEmpId.trim()) {
      setModalError('Name and Employee ID are required.');
      return;
    }

    try {
      const payload: WorkerCreatePayload = {
        name: newWorkerName.trim(),
        employee_id: newWorkerEmpId.trim(),
        department: newWorkerDept.trim(),
        unit: newWorkerUnit.trim(),
        shift: newWorkerShift.trim(),
        contact_phone: newWorkerPhone.trim() || undefined
      };
      const created = await createWorker(payload);
      setModalSuccess(`Worker ${created.name} created successfully.`);
      await loadWorkers();
      setActiveWorkerId(created.id);
      setTimeout(() => {
        setShowAddWorkerModal(false);
        setModalSuccess(null);
        setNewWorkerName('');
        setNewWorkerEmpId('');
      }, 1000);
    } catch (err: any) {
      setModalError(err.message || 'Failed to create worker.');
    }
  };

  const handleAssignBadge = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!badgeIdInput.trim() || !activeWorkerId) {
      setModalError('Badge ID is required.');
      return;
    }

    try {
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + Number(badgeExpiryDays));

      const payload: BadgeCreatePayload = {
        badge_id: badgeIdInput.trim(),
        worker_id: activeWorkerId,
        batch_no: badgeBatchNo.trim(),
        expires_at: expDate.toISOString(),
        status: 'VALID',
        calibration_version: 'CAL-v0.1-demo'
      };

      await createOrAssignBadge(payload);
      setModalSuccess(`Badge ${badgeIdInput} assigned to ${currentWorker?.name}.`);
      await loadWorkers();
      if (activeWorkerId) loadWorkerDetail(activeWorkerId);
      setTimeout(() => {
        setShowAssignBadgeModal(false);
        setModalSuccess(null);
        setBadgeIdInput('');
      }, 1000);
    } catch (err: any) {
      setModalError(err.message || 'Failed to assign badge.');
    }
  };

  const currentWorker = workerDetail?.worker || workers.find((w) => w.id === activeWorkerId) || null;
  const currentTwa = currentWorker?.latest_reading?.equivalent_8h_twa_ppm ?? 0.0;
  const currentStatus = currentWorker?.latest_reading?.status || 'LOW';
  const readings = workerDetail?.readings_history || [];

  // Chart data from actual readings or clean baseline
  const chartData = readings.length > 0 
    ? readings.map((r) => ({
        time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        twa: r.equivalent_8h_twa_ppm,
        dose: r.estimated_dose
      })).reverse()
    : [
        { time: 'Shift Start', twa: 0.0, dose: 0.0 }
      ];

  const getStatusDot = (status?: string) => {
    const s = String(status || 'LOW').toUpperCase();
    if (s === 'DANGER' || s === 'HIGH' || s === 'CRITICAL') {
      return <span className="w-2 h-2 rounded-full bg-figma-danger shrink-0" />;
    }
    if (s === 'ELEVATED' || s === 'MODERATE' || s === 'WARNING') {
      return <span className="w-2 h-2 rounded-full bg-figma-warning shrink-0" />;
    }
    return <span className="w-2 h-2 rounded-full bg-figma-safe shrink-0" />;
  };

  const getStatusText = (status?: string) => {
    const s = String(status || 'LOW').toUpperCase();
    if (s === 'DANGER' || s === 'HIGH' || s === 'CRITICAL') {
      return <span className="text-figma-danger font-bold font-mono">HIGH EXPOSURE</span>;
    }
    if (s === 'ELEVATED' || s === 'MODERATE' || s === 'WARNING') {
      return <span className="text-figma-warning font-bold font-mono">MODERATE</span>;
    }
    return <span className="text-figma-safe font-bold font-mono">SAFE</span>;
  };

  const handleExportCsv = () => {
    if (!workerDetail || readings.length === 0) {
      alert('No readings recorded yet to export for this worker.');
      return;
    }
    const rows = [
      ['Timestamp', 'Worker Name', 'Employee ID', 'Badge ID', 'Department', 'Shift', 'Estimated Cumulative Dose (ppm*min)', '8h TWA (ppm)', 'Confidence (%)', 'Status', 'Badge Validity', 'Data Status', 'Calibration Version'],
      ...readings.map((r) => [
        r.timestamp,
        currentWorker?.name || '',
        currentWorker?.employee_id || '',
        r.badge_id || currentWorker?.active_badge_id || '',
        currentWorker?.department || '',
        r.shift,
        r.estimated_dose,
        r.equivalent_8h_twa_ppm,
        r.confidence_pct,
        r.status,
        r.expiry_status,
        r.data_status,
        r.calibration_version
      ])
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `H2Sentry_${currentWorker?.name.replace(/\s+/g, '_')}_Exposure_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredWorkers = workers.filter((w) => 
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.employee_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Breadcrumb & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-figma-border/60">
        <div className="flex items-center space-x-2 text-xs font-mono text-figma-textMuted">
          <button 
            onClick={onNavigateBackToDashboard}
            className="hover:text-white transition-colors"
          >
            Dashboard
          </button>
          <span>/</span>
          <span className="text-figma-textSecondary">Personnel Directory</span>
          <span>/</span>
          <span className="text-white font-bold">{currentWorker?.name || 'Worker Detail'}</span>
        </div>

        {/* Action Buttons Right */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowAddWorkerModal(true)}
            className="figma-button-secondary py-2 px-3.5 text-xs font-semibold space-x-1.5"
          >
            <Plus className="w-3.5 h-3.5 text-figma-accent" />
            <span>Add Worker</span>
          </button>

          <button
            onClick={() => setShowAssignBadgeModal(true)}
            disabled={!currentWorker}
            className="figma-button-primary py-2 px-3.5 text-xs font-bold space-x-1.5"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Assign Badge</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={readings.length === 0}
            className="figma-button-secondary py-2 px-3.5 text-xs font-semibold space-x-2 disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5 text-figma-textMuted" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Operator Metadata Header Card */}
      <div className="figma-card p-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
          {/* Worker Avatar & Name */}
          <div className="flex items-center space-x-3.5 md:col-span-1">
            <div className="w-12 h-12 rounded-full bg-figma-card border border-figma-border flex items-center justify-center text-figma-textMuted shrink-0">
              <User className="w-6 h-6 text-figma-textSecondary" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white font-sans">
                {currentWorker?.name || 'No worker selected'}
              </h2>
              <div className="text-xs font-mono text-figma-textMuted">
                EMP ID: {currentWorker?.employee_id || 'N/A'}
              </div>
            </div>
          </div>

          {/* Zone & Unit */}
          <div className="space-y-0.5">
            <span className="text-[11px] font-mono text-figma-textMuted uppercase tracking-wider block">
              DEPARTMENT & UNIT
            </span>
            <span className="text-sm font-bold text-white font-sans">
              {currentWorker?.department || 'Operations'} {currentWorker?.unit ? `(${currentWorker.unit})` : ''}
            </span>
          </div>

          {/* Active Shift */}
          <div className="space-y-0.5">
            <span className="text-[11px] font-mono text-figma-textMuted uppercase tracking-wider block">
              ACTIVE SHIFT
            </span>
            <span className="text-sm font-bold text-white font-sans">
              {currentWorker?.shift || 'Shift A'}
            </span>
          </div>

          {/* Sensor Badge */}
          <div className="space-y-0.5">
            <span className="text-[11px] font-mono text-figma-textMuted uppercase tracking-wider block">
              ASSIGNED BADGE
            </span>
            <span className="text-sm font-bold text-figma-accent font-sans flex items-center space-x-1.5">
              <Watch className="w-3.5 h-3.5" />
              <span>{currentWorker?.active_badge_id || 'Unassigned'}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ml-1 ${currentWorker?.badge_status === 'VALID' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                {currentWorker?.badge_status || 'VALID'}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Selector List (4 cols) | Right Detail Dashboard (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Worker Directory List */}
        <div className="lg:col-span-4 figma-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase text-white">
              Operators ({filteredWorkers.length})
            </span>
            <div className="relative w-36">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-2 py-1 rounded bg-black/40 border border-figma-border text-white text-[11px] font-mono focus:outline-none focus:border-figma-accent"
              />
            </div>
          </div>

          <div className="space-y-1.5 max-h-[440px] overflow-y-auto pr-1">
            {filteredWorkers.length > 0 ? (
              filteredWorkers.map((w) => (
                <div
                  key={w.id}
                  onClick={() => setActiveWorkerId(w.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition ${
                    activeWorkerId === w.id
                      ? 'bg-figma-accent/10 border-figma-accent shadow-md'
                      : 'bg-figma-card/50 border-figma-border/70 hover:bg-figma-card hover:border-figma-border'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white font-sans">{w.name}</span>
                    <span className="text-[10px] font-mono text-figma-accent">{w.employee_id}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[11px] text-figma-textSecondary">
                    <span className="truncate max-w-[140px]">{w.department}</span>
                    <span className="font-mono text-white">
                      {w.latest_reading ? `${w.latest_reading.estimated_dose} ppm·min` : '0 readings'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-figma-textMuted font-mono">
                No workers found. Click "+ Add Worker" above.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Active Worker Exposure Dossier */}
        <div className="lg:col-span-8 space-y-6">
          {/* Middle Row: Left 8-HR TWA Status Radial Ring | Right Shift Exposure Timeline (TWA) Chart */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* TWA Status Gauge (5 cols) */}
            <div className="md:col-span-5 figma-card p-6 flex flex-col items-center justify-center space-y-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-figma-textMuted">
                LATEST EXPOSURE GAUGE
              </span>

              <div className="my-auto py-2">
                <CircularTwaGauge
                  value={currentTwa}
                  status={currentStatus}
                  unit="ppm"
                  size={190}
                  strokeWidth={13}
                  sublabel="8-HR TWA"
                  showIcon={true}
                />
              </div>

              <div className="text-center text-xs font-mono text-figma-textSecondary">
                Cumulative Dose: <strong className="text-white">{currentWorker?.latest_reading?.estimated_dose || 0} ppm·min</strong>
              </div>
            </div>

            {/* Shift Exposure Timeline Chart (7 cols) */}
            <div className="md:col-span-7 figma-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white font-sans">
                  Shift Exposure Timeline
                </h3>
                <span className="text-[10px] font-mono text-figma-accent px-2 py-0.5 rounded bg-figma-accent/10 border border-figma-accent/20">
                  CAL-v0.1-demo
                </span>
              </div>

              {/* Recharts Timeline Graph */}
              <div className="h-44 w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#243047" vertical={false} />
                    <XAxis 
                      dataKey="time" 
                      stroke="#64748B" 
                      tick={{ fontSize: 10, fill: '#94A3B8' }} 
                      axisLine={{ stroke: '#243047' }}
                    />
                    <YAxis 
                      stroke="#64748B" 
                      tick={{ fontSize: 10, fill: '#94A3B8' }} 
                      axisLine={{ stroke: '#243047' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#111622',
                        borderColor: '#243047',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                      }}
                      itemStyle={{ color: '#00f0ff' }}
                    />
                    <ReferenceLine y={5} stroke="#EF4444" strokeDasharray="4 4" />
                    <Line
                      type="monotone"
                      dataKey="twa"
                      stroke="#00f0ff"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#00f0ff', stroke: '#111622', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Bottom Card: Shift Exposure Log */}
          <div className="figma-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white font-sans">
                Occupational Exposure Log
              </h3>
              <span className="text-xs font-mono text-figma-textMuted">
                {readings.length} reading{readings.length === 1 ? '' : 's'} recorded
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="border-b border-figma-border text-[11px] font-mono text-figma-textMuted uppercase tracking-wider">
                    <th className="pb-3 font-semibold">TIMESTAMP</th>
                    <th className="pb-3 font-semibold">CUMULATIVE DOSE</th>
                    <th className="pb-3 font-semibold">8H TWA</th>
                    <th className="pb-3 font-semibold">CONFIDENCE</th>
                    <th className="pb-3 font-semibold">STATUS</th>
                    <th className="pb-3 font-semibold">DATA TYPE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-figma-border/40">
                  {readings.length > 0 ? (
                    readings.map((reading) => (
                      <tr
                        key={reading.id}
                        onClick={() => onSelectReading(reading)}
                        className="hover:bg-figma-card/80 cursor-pointer transition-colors"
                      >
                        <td className="py-3.5 font-mono text-white font-bold">
                          {new Date(reading.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3.5 font-mono text-white font-bold">
                          {reading.estimated_dose.toFixed(1)} ppm·min
                        </td>
                        <td className="py-3.5 font-mono text-figma-textSecondary">
                          {reading.equivalent_8h_twa_ppm.toFixed(2)} ppm
                        </td>
                        <td className="py-3.5 font-mono text-emerald-400">
                          {reading.confidence_pct}%
                        </td>
                        <td className="py-3.5">
                          <div className="flex items-center space-x-1.5">
                            {getStatusDot(reading.status)}
                            {getStatusText(reading.status)}
                          </div>
                        </td>
                        <td className="py-3.5 font-mono text-[10px] text-figma-accent">
                          {reading.data_status || 'SIMULATED'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-xs font-mono text-figma-textMuted">
                        No exposure readings recorded yet for this operator.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Add Worker Modal */}
      {showAddWorkerModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-figma-surface border border-figma-border rounded-2xl max-w-md w-full p-6 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-figma-border mb-4">
              <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <User className="w-4 h-4 text-figma-accent" />
                Add New Industrial Worker
              </h3>
              <button
                onClick={() => setShowAddWorkerModal(false)}
                className="text-figma-textMuted hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWorker} className="space-y-3.5 text-xs">
              {modalError && (
                <div className="p-2.5 rounded bg-red-950/80 border border-red-500 text-red-300">
                  {modalError}
                </div>
              )}
              {modalSuccess && (
                <div className="p-2.5 rounded bg-emerald-950/80 border border-emerald-500 text-emerald-300">
                  {modalSuccess}
                </div>
              )}

              <div>
                <label className="text-figma-textMuted block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Arun Kumar"
                  value={newWorkerName}
                  onChange={(e) => setNewWorkerName(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-black/40 border border-figma-border text-white text-xs font-mono focus:outline-none focus:border-figma-accent"
                />
              </div>

              <div>
                <label className="text-figma-textMuted block mb-1">Employee ID *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MRPL-W-001"
                  value={newWorkerEmpId}
                  onChange={(e) => setNewWorkerEmpId(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-black/40 border border-figma-border text-white text-xs font-mono focus:outline-none focus:border-figma-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-figma-textMuted block mb-1">Department</label>
                  <input
                    type="text"
                    value={newWorkerDept}
                    onChange={(e) => setNewWorkerDept(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-black/40 border border-figma-border text-white text-xs font-mono focus:outline-none focus:border-figma-accent"
                  />
                </div>
                <div>
                  <label className="text-figma-textMuted block mb-1">Unit / Area</label>
                  <input
                    type="text"
                    value={newWorkerUnit}
                    onChange={(e) => setNewWorkerUnit(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-black/40 border border-figma-border text-white text-xs font-mono focus:outline-none focus:border-figma-accent"
                  />
                </div>
              </div>

              <div>
                <label className="text-figma-textMuted block mb-1">Shift</label>
                <select
                  value={newWorkerShift}
                  onChange={(e) => setNewWorkerShift(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-black/40 border border-figma-border text-white text-xs font-mono focus:outline-none focus:border-figma-accent"
                >
                  <option value="Shift A (Morning 06:00 - 14:00)">Shift A (Morning 06:00 - 14:00)</option>
                  <option value="Shift B (Afternoon 14:00 - 22:00)">Shift B (Afternoon 14:00 - 22:00)</option>
                  <option value="Shift C (Night 22:00 - 06:00)">Shift C (Night 22:00 - 06:00)</option>
                  <option value="General Shift (09:00 - 17:30)">General Shift (09:00 - 17:30)</option>
                </select>
              </div>

              <div>
                <label className="text-figma-textMuted block mb-1">Contact Phone (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. +91 98765 43210"
                  value={newWorkerPhone}
                  onChange={(e) => setNewWorkerPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-black/40 border border-figma-border text-white text-xs font-mono focus:outline-none focus:border-figma-accent"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddWorkerModal(false)}
                  className="px-4 py-2 rounded bg-figma-card border border-figma-border text-figma-textSecondary hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded bg-figma-accent text-black font-bold hover:bg-figma-accent/90"
                >
                  Create Worker
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Badge Modal */}
      {showAssignBadgeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-figma-surface border border-figma-border rounded-2xl max-w-md w-full p-6 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-figma-border mb-4">
              <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-figma-accent" />
                Assign Physical Badge ID
              </h3>
              <button
                onClick={() => setShowAssignBadgeModal(false)}
                className="text-figma-textMuted hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignBadge} className="space-y-3.5 text-xs">
              {modalError && (
                <div className="p-2.5 rounded bg-red-950/80 border border-red-500 text-red-300">
                  {modalError}
                </div>
              )}
              {modalSuccess && (
                <div className="p-2.5 rounded bg-emerald-950/80 border border-emerald-500 text-emerald-300">
                  {modalSuccess}
                </div>
              )}

              <div className="p-3 rounded bg-black/40 border border-figma-border text-figma-textSecondary">
                Assigning to operator: <strong className="text-white font-mono">{currentWorker?.name} ({currentWorker?.employee_id})</strong>
              </div>

              <div>
                <label className="text-figma-textMuted block mb-1">Badge ID (QR Code Content) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. H2S-BDG-000001"
                  value={badgeIdInput}
                  onChange={(e) => setBadgeIdInput(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-black/40 border border-figma-border text-white text-xs font-mono focus:outline-none focus:border-figma-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-figma-textMuted block mb-1">Batch Number</label>
                  <input
                    type="text"
                    value={badgeBatchNo}
                    onChange={(e) => setBadgeBatchNo(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-black/40 border border-figma-border text-white text-xs font-mono focus:outline-none focus:border-figma-accent"
                  />
                </div>
                <div>
                  <label className="text-figma-textMuted block mb-1">Shelf Validity (Days)</label>
                  <input
                    type="number"
                    value={badgeExpiryDays}
                    onChange={(e) => setBadgeExpiryDays(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded bg-black/40 border border-figma-border text-white text-xs font-mono focus:outline-none focus:border-figma-accent"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded bg-figma-card text-[11px] font-mono text-figma-textMuted">
                Calibration Model: <span className="text-figma-accent">CAL-v0.1-demo</span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAssignBadgeModal(false)}
                  className="px-4 py-2 rounded bg-figma-card border border-figma-border text-figma-textSecondary hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded bg-figma-accent text-black font-bold hover:bg-figma-accent/90"
                >
                  Assign Badge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
