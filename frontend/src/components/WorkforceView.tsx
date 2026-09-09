import React, { useState, useEffect, useCallback } from 'react';
import { 
  Download, 
  Watch, 
  User, 
  Plus, 
  KeyRound, 
  X, 
  Calendar, 
  History,
  Activity,
  Info
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart,
  Bar,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ReferenceLine 
} from 'recharts';
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
  const [selectedPeriod, setSelectedPeriod] = useState<7 | 15 | 30>(30); // Default 30 Days (Section 6)
  
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

  const loadWorkerDetail = useCallback(async (id: string, days: number = selectedPeriod) => {
    try {
      const data = await fetchWorkerDetail(id, days);
      setWorkerDetail(data);
    } catch (err) {
      console.error('Failed to load worker detail', err);
    }
  }, [selectedPeriod]);

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
      loadWorkerDetail(activeWorkerId, selectedPeriod);
    }
  }, [activeWorkerId, selectedPeriod, loadWorkerDetail]);

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
      if (activeWorkerId) loadWorkerDetail(activeWorkerId, selectedPeriod);
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
  const readings = workerDetail?.readings_history || [];

  // Filter readings for the selected period
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - selectedPeriod);
  
  const periodReadings = readings.filter(r => r.timestamp && new Date(r.timestamp) >= cutoffDate);
  const periodCumulativeDose = workerDetail?.period_cumulative_dose !== undefined 
    ? workerDetail.period_cumulative_dose 
    : periodReadings.reduce((sum, r) => sum + r.estimated_dose, 0);

  const latestReading = readings.length > 0 ? readings[0] : currentWorker?.latest_reading;
  const firstReadingInPeriod = periodReadings.length > 0 ? periodReadings[periodReadings.length - 1] : null;

  const firstReadingDateStr = firstReadingInPeriod?.timestamp 
    ? new Date(firstReadingInPeriod.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : 'No scans in period';
  const latestReadingDateStr = latestReading?.timestamp
    ? new Date(latestReading.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : 'No scans recorded';

  // Daily exposure dataset from backend DB aggregation (Section 7 & 8)
  const dailyExposureData = workerDetail?.daily_exposure && workerDetail.daily_exposure.length > 0
    ? workerDetail.daily_exposure
    : [];

  const hasDailyReadings = dailyExposureData.length > 0 && dailyExposureData.some(d => d.exposure_ppm_min > 0);

  const getStatusBadge = (status?: string) => {
    const s = String(status || 'LOW').toUpperCase();
    if (s === 'DANGER' || s === 'HIGH' || s === 'CRITICAL') {
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-red-50 text-red-700 border border-red-200">Action Required</span>;
    }
    if (s === 'ELEVATED' || s === 'MODERATE' || s === 'WARNING') {
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">Review Recommended</span>;
    }
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Within Range</span>;
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div className="flex items-center space-x-2 text-xs font-mono text-slate-500">
          <button 
            onClick={onNavigateBackToDashboard}
            className="hover:text-slate-900 transition-colors font-semibold"
          >
            Dashboard
          </button>
          <span>/</span>
          <span className="text-slate-500">Personnel Directory</span>
          <span>/</span>
          <span className="text-slate-900 font-bold">{currentWorker?.name || 'Worker Detail'}</span>
        </div>

        {/* Action Buttons Right */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowAddWorkerModal(true)}
            className="py-2 px-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5 text-sky-600" />
            <span>Add Worker</span>
          </button>

          <button
            onClick={() => setShowAssignBadgeModal(true)}
            disabled={!currentWorker}
            className="py-2 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center space-x-1.5 shadow-xs transition disabled:opacity-50"
          >
            <KeyRound className="w-3.5 h-3.5 text-sky-400" />
            <span>Assign Badge</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={readings.length === 0}
            className="py-2 px-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center space-x-2 shadow-xs transition disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Operator Metadata Header Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
          {/* Worker Avatar & Name */}
          <div className="flex items-center space-x-3.5 md:col-span-1">
            <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
              <User className="w-6 h-6 text-sky-600" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 font-sans">
                {currentWorker?.name || 'No worker selected'}
              </h2>
              <div className="text-xs font-mono text-slate-500 font-semibold">
                EMP ID: {currentWorker?.employee_id || 'N/A'}
              </div>
            </div>
          </div>

          {/* Zone & Unit */}
          <div className="space-y-0.5">
            <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block font-semibold">
              DEPARTMENT & UNIT
            </span>
            <span className="text-sm font-bold text-slate-900 font-sans">
              {currentWorker?.department || 'Operations'} {currentWorker?.unit ? `(${currentWorker.unit})` : ''}
            </span>
          </div>

          {/* Active Shift */}
          <div className="space-y-0.5">
            <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block font-semibold">
              ACTIVE SHIFT
            </span>
            <span className="text-sm font-bold text-slate-900 font-sans">
              {currentWorker?.shift || 'Shift A (06:00 - 14:00)'}
            </span>
          </div>

          {/* Assigned Sensor Badge */}
          <div className="space-y-0.5">
            <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block font-semibold">
              CURRENT BADGE
            </span>
            <span className="text-sm font-bold text-slate-900 font-sans flex items-center space-x-1.5">
              <Watch className="w-3.5 h-3.5 text-sky-600" />
              <span className="font-mono text-sky-700">{currentWorker?.active_badge_id || 'Unassigned'}</span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ml-1 ${
                currentWorker?.badge_status === 'VALID' || !currentWorker?.badge_status
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {currentWorker?.badge_status || 'ACTIVE'}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Selector List (4 cols) | Right Detail Dashboard (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Worker Directory List */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-mono font-bold uppercase text-slate-700">
              Personnel Register ({filteredWorkers.length})
            </span>
            <div className="relative w-36">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs font-sans placeholder:text-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1">
            {filteredWorkers.length > 0 ? (
              filteredWorkers.map((w) => {
                const w30d = w.cumulative_30d_dose !== undefined && w.cumulative_30d_dose !== null 
                  ? w.cumulative_30d_dose 
                  : (w.latest_reading?.estimated_dose || 0);

                return (
                  <div
                    key={w.id}
                    onClick={() => setActiveWorkerId(w.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition ${
                      activeWorkerId === w.id
                        ? 'bg-sky-50 border-sky-300 shadow-xs'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 font-sans">{w.name}</span>
                      <span className="text-[10px] font-mono font-semibold text-sky-700">{w.employee_id}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                      <span className="truncate max-w-[130px]">{w.department}</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {w30d > 0 ? `${Number(w30d).toLocaleString('en-US')} ppm·min` : '0 ppm·min'}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 font-mono">
                No workers found.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Active Worker Exposure Dossier */}
        <div className="lg:col-span-8 space-y-6">
          {/* Prominent Cumulative Summary Card with 7D / 15D / 30D Period Selector (Section 6) */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white border border-slate-700 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/80">
              <div>
                <div className="text-[10px] font-mono text-sky-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-sky-400" />
                  <span>CUMULATIVE H₂S EXPOSURE INTELLIGENCE</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight font-sans mt-0.5">
                  {currentWorker?.name || 'Ravi Kumar'}
                </h2>
                <div className="text-xs font-mono text-slate-300">
                  EMP ID: <strong className="text-white">{currentWorker?.employee_id || 'EMP1024'}</strong> • {currentWorker?.department}
                </div>
              </div>

              {/* Period Selector: 7 DAYS | 15 DAYS | 30 DAYS (Default 30 DAYS) */}
              <div className="flex items-center space-x-1 p-1 bg-slate-800/90 rounded-xl border border-slate-700">
                {([7, 15, 30] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setSelectedPeriod(period)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                      selectedPeriod === period
                        ? 'bg-sky-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    {period} DAYS
                  </button>
                ))}
              </div>
            </div>

            {/* Cumulative Exposure Value & Period Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <div className="md:col-span-7 space-y-1">
                <div className="text-[10px] font-mono text-sky-400 uppercase tracking-widest font-bold">
                  {selectedPeriod}-DAY CUMULATIVE H₂S EXPOSURE
                </div>
                <div className="flex items-baseline space-x-2">
                  <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white">
                    {Number(periodCumulativeDose).toLocaleString('en-US')}
                  </span>
                  <span className="text-base font-mono text-slate-300 font-normal">
                    ppm·min
                  </span>
                </div>
                <div className="text-xs text-slate-300 font-sans">
                  Recorded cumulative exposure over the selected {selectedPeriod}-day window.
                </div>
                <div className="text-[11px] text-slate-400 font-sans">
                  Sum of recorded passive exposure estimates during the selected period.
                </div>
              </div>

              <div className="md:col-span-5 grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 font-mono text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] block">Last Reading:</span>
                  <span className="font-bold text-white">
                    {latestReading ? `${latestReading.estimated_dose.toFixed(0)} ppm·min` : '0 ppm·min'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Period Readings:</span>
                  <span className="font-bold text-white">
                    {periodReadings.length} recorded
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">First in Period:</span>
                  <span className="text-slate-300 text-[10px] truncate block" title={firstReadingDateStr}>
                    {firstReadingDateStr}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Latest in Period:</span>
                  <span className="text-slate-300 text-[10px] truncate block" title={latestReadingDateStr}>
                    {latestReadingDateStr}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Supervisor Exposure Graph (Section 7 & 8) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 gap-2">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-sky-600" />
                  <h3 className="text-sm font-bold text-slate-900 font-sans">
                    Recorded Exposure by Day ({selectedPeriod}-Day View)
                  </h3>
                </div>
                <p className="text-[11px] text-slate-500">
                  Daily passive cumulative exposure integrals (<span className="font-mono">ppm·min</span>) from database records.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                  {selectedPeriod}-DAY TOTAL:{' '}
                  <span className="text-sky-800">{Number(periodCumulativeDose).toLocaleString('en-US')} ppm·min</span>
                </span>
              </div>
            </div>

            {/* Render Real DB Graph or Clean Empty State */}
            {hasDailyReadings ? (
              <div className="h-56 w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyExposureData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis 
                      dataKey="day_label" 
                      stroke="#64748B" 
                      tick={{ fontSize: 10, fill: '#64748B', fontWeight: 600 }} 
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
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                        color: '#0F172A'
                      }}
                      formatter={(val: any) => [`${val} ppm·min`, 'Recorded Cumulative Exposure']}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <ReferenceLine y={600} stroke="#F59E0B" strokeDasharray="4 4" label={{ value: 'Review Threshold (600 ppm·min)', fill: '#D97706', fontSize: 10, position: 'insideTopRight' }} />
                    <Bar 
                      dataKey="exposure_ppm_min" 
                      radius={[6, 6, 0, 0]}
                    >
                      {dailyExposureData.map((entry, index) => {
                        const color = entry.exposure_ppm_min >= 700 ? '#DC2626' : entry.exposure_ppm_min >= 550 ? '#D97706' : '#0284C7';
                        return <Cell key={`cell-${index}`} fill={color} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-2 rounded-xl bg-slate-50 border border-dashed border-slate-200">
                <Info className="w-6 h-6 text-slate-400" />
                <div className="text-xs font-mono font-bold text-slate-700">
                  No recorded exposure readings for this period.
                </div>
                <p className="text-[11px] text-slate-500 max-w-sm">
                  Zero exposure readings have been logged for {currentWorker?.name || 'this operator'} in the last {selectedPeriod} days.
                </p>
              </div>
            )}

            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
              <Info className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span>
                <strong>Metrology Notice:</strong> Values represent sum of recorded passive exposure estimates during the selected period. They do not represent air concentration or instantaneous ppm.
              </span>
            </div>
          </div>

          {/* Bottom Card: Shift Exposure Log Table */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <History className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-bold text-slate-900 font-sans">
                  Detailed Occupational Exposure Log
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-500">
                {readings.length} reading(s) recorded
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-mono text-slate-500 uppercase tracking-wider bg-slate-50/50">
                    <th className="py-2.5 px-3 font-semibold">TIMESTAMP</th>
                    <th className="py-2.5 px-3 font-semibold">CUMULATIVE DOSE</th>
                    <th className="py-2.5 px-3 font-semibold">8H TWA</th>
                    <th className="py-2.5 px-3 font-semibold">CONFIDENCE</th>
                    <th className="py-2.5 px-3 font-semibold">STATUS</th>
                    <th className="py-2.5 px-3 font-semibold">DATA TYPE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {readings.length > 0 ? (
                    readings.map((reading) => (
                      <tr
                        key={reading.id}
                        onClick={() => onSelectReading(reading)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-3 font-mono text-slate-900 font-bold">
                          {new Date(reading.timestamp).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-900 font-bold">
                          {reading.estimated_dose.toFixed(0)} <span className="text-[10px] font-normal text-slate-500">ppm·min</span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600">
                          {reading.equivalent_8h_twa_ppm.toFixed(2)} ppm
                        </td>
                        <td className="py-3 px-3 font-mono text-emerald-700 font-semibold">
                          {reading.confidence_pct}%
                        </td>
                        <td className="py-3 px-3">
                          {getStatusBadge(reading.status)}
                        </td>
                        <td className="py-3 px-3 font-mono text-[10px] text-sky-700">
                          {reading.data_status || 'SIMULATED'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-xs font-mono text-slate-400">
                        No recorded exposure readings for this worker.
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="text-base font-bold text-slate-900 font-sans flex items-center gap-2">
                <User className="w-4 h-4 text-sky-600" />
                Add New Industrial Worker
              </h3>
              <button
                onClick={() => setShowAddWorkerModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWorker} className="space-y-3.5 text-xs">
              {modalError && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700">
                  {modalError}
                </div>
              )}
              {modalSuccess && (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
                  {modalSuccess}
                </div>
              )}

              <div>
                <label className="text-slate-600 block mb-1 font-semibold">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Arun Kumar"
                  value={newWorkerName}
                  onChange={(e) => setNewWorkerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs font-sans focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="text-slate-600 block mb-1 font-semibold">Employee ID *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MRPL-EMP-4091"
                  value={newWorkerEmpId}
                  onChange={(e) => setNewWorkerEmpId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-600 block mb-1 font-semibold">Department</label>
                  <input
                    type="text"
                    value={newWorkerDept}
                    onChange={(e) => setNewWorkerDept(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs font-sans focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block mb-1 font-semibold">Unit / Area</label>
                  <input
                    type="text"
                    value={newWorkerUnit}
                    onChange={(e) => setNewWorkerUnit(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs font-sans focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-600 block mb-1 font-semibold">Shift</label>
                <select
                  value={newWorkerShift}
                  onChange={(e) => setNewWorkerShift(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs font-sans focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                >
                  <option value="Shift A (Morning 06:00 - 14:00)">Shift A (Morning 06:00 - 14:00)</option>
                  <option value="Shift B (Afternoon 14:00 - 22:00)">Shift B (Afternoon 14:00 - 22:00)</option>
                  <option value="Shift C (Night 22:00 - 06:00)">Shift C (Night 22:00 - 06:00)</option>
                  <option value="General Shift (09:00 - 17:30)">General Shift (09:00 - 17:30)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-600 block mb-1 font-semibold">Contact Phone (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. +91 98450 12041"
                  value={newWorkerPhone}
                  onChange={(e) => setNewWorkerPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs font-sans focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddWorkerModal(false)}
                  className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="text-base font-bold text-slate-900 font-sans flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-sky-600" />
                Assign Physical Badge ID
              </h3>
              <button
                onClick={() => setShowAssignBadgeModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignBadge} className="space-y-3.5 text-xs">
              {modalError && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700">
                  {modalError}
                </div>
              )}
              {modalSuccess && (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
                  {modalSuccess}
                </div>
              )}

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
                Assigning to operator: <strong className="text-slate-900 font-mono">{currentWorker?.name} ({currentWorker?.employee_id})</strong>
              </div>

              <div>
                <label className="text-slate-600 block mb-1 font-semibold">Badge ID (QR Code Content) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. H2S-BDG-2026-000381"
                  value={badgeIdInput}
                  onChange={(e) => setBadgeIdInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-600 block mb-1 font-semibold">Batch Number</label>
                  <input
                    type="text"
                    value={badgeBatchNo}
                    onChange={(e) => setBadgeBatchNo(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block mb-1 font-semibold">Shelf Validity (Days)</label>
                  <input
                    type="number"
                    value={badgeExpiryDays}
                    onChange={(e) => setBadgeExpiryDays(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 text-[11px] font-mono text-slate-500">
                Calibration Model: <span className="text-sky-700 font-semibold">CAL-v0.1-demo</span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAssignBadgeModal(false)}
                  className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
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
