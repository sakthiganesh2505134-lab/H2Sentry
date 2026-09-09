import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Wrench, 
  Check, 
  X, 
  Sliders, 
  Watch 
} from 'lucide-react';
import type { SystemSettings } from '../types';
import { fetchSettings, updateSettings } from '../services/api';

export const SettingsView: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [_loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [recalibratedSuccess, setRecalibratedSuccess] = useState<boolean>(false);
  const [showAddHardwareModal, setShowAddHardwareModal] = useState<boolean>(false);

  // Form State
  const [cautionThreshold, setCautionThreshold] = useState<number>(5.0);
  const [stelLimit, setStelLimit] = useState<number>(10.0);
  const [idlhAlert, setIdlhAlert] = useState<number>(20.0);
  const [maintenanceInterval, setMaintenanceInterval] = useState<string>('Every 90 Days');

  // Wristband Hardware Fleet Register state
  const [hardwareFleet, setHardwareFleet] = useState([
    { id: '#247', operator: 'Rajesh Kumar', lastCalib: '08 Sep 2026', status: 'ACTIVE' },
    { id: '#512', operator: 'Ananya Sharma', lastCalib: '08 Sep 2026', status: 'ACTIVE' },
    { id: '#389', operator: 'Manoj Mendon', lastCalib: '15 Aug 2025', status: 'CALIBRATION DUE' },
  ]);

  const [newDeviceNumber, setNewDeviceNumber] = useState('');
  const [newDeviceOperator, setNewDeviceOperator] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const s = await fetchSettings();
        setSettings(s);
        if (s.thresholds) {
          setCautionThreshold(s.thresholds.acgih_stel_ppm || 5.0);
          setStelLimit(s.thresholds.niosh_ceiling_ppm || 10.0);
          setIdlhAlert(s.thresholds.osha_8hr_pel_ppm || 20.0);
        }
      } catch (err) {
        console.error('Failed to load settings', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleApplyRules = async () => {
    setSaving(true);
    setSavedSuccess(false);
    try {
      await updateSettings({
        thresholds: {
          ...(settings?.thresholds || {}),
          acgih_stel_ppm: cautionThreshold,
          niosh_ceiling_ppm: stelLimit,
          osha_8hr_pel_ppm: idlhAlert,
        }
      } as any);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update settings', err);
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setCautionThreshold(5.0);
    setStelLimit(10.0);
    setIdlhAlert(20.0);
    setMaintenanceInterval('Every 90 Days');
  };

  const handleAddHardware = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeviceNumber) return;
    const formattedId = newDeviceNumber.startsWith('#') ? newDeviceNumber : `#${newDeviceNumber}`;
    setHardwareFleet([
      ...hardwareFleet,
      {
        id: formattedId,
        operator: newDeviceOperator || 'None — In Storage',
        lastCalib: 'Today',
        status: 'ACTIVE',
      },
    ]);
    setNewDeviceNumber('');
    setNewDeviceOperator('');
    setShowAddHardwareModal(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-sans">
            Safety Administration & Thresholds
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-sans">
            Hardware dosimeter fleet register and airborne exposure action level configuration.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <span className="px-3.5 py-1.5 rounded-full text-xs font-mono font-bold tracking-wider uppercase bg-white border border-slate-200 text-slate-700 shadow-xs">
            Refinery Day Shift
          </span>
        </div>
      </div>

      {/* Main 2-Column Split: Left Fleet Register & Maintenance | Right Shift Threshold Tuning */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Fleet Register & Maintenance Queue (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Wristband Dosimeter Register Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 font-sans flex items-center gap-2">
                <Watch className="w-4 h-4 text-sky-600" />
                Wristband Dosimeter Fleet Register
              </h2>
              <button
                onClick={() => setShowAddHardwareModal(true)}
                className="py-1.5 px-3 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5 text-sky-600" />
                <span>Add Hardware</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-mono text-slate-500 uppercase tracking-wider bg-slate-50/50">
                    <th className="py-2.5 px-3 font-semibold">DEVICE ID</th>
                    <th className="py-2.5 px-3 font-semibold">ASSIGNED OPERATOR</th>
                    <th className="py-2.5 px-3 font-semibold">LAST CALIBRATION</th>
                    <th className="py-2.5 px-3 font-semibold text-right">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {hardwareFleet.map((dev) => (
                    <tr key={dev.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-mono text-slate-900 font-bold">
                        {dev.id}
                      </td>
                      <td className="py-3 px-3 text-slate-700 font-sans">
                        {dev.operator}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">
                        {dev.lastCalib}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {dev.status === 'ACTIVE' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ACTIVE
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            CALIBRATION DUE
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Scheduled Hardware Maintenance Queue */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
            <h2 className="text-base font-bold text-slate-900 font-sans">
              Scheduled Hardware Maintenance Queue
            </h2>

            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-lg bg-amber-100 text-amber-700 shrink-0 mt-0.5">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-sans">
                    Dosimeter #389 (Manoj Mendon)
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5 max-w-md">
                    Colorimetric element shelf validity expired (&gt;90 days since manufacture). Requires badge replacement.
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setRecalibratedSuccess(true);
                  setTimeout(() => setRecalibratedSuccess(false), 2500);
                }}
                className="py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shrink-0 self-end sm:self-center shadow-xs transition"
              >
                {recalibratedSuccess ? 'Queued ✓' : 'Queue Replacement'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Shift Threshold Tuning (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-5">
          <div className="pb-2 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900 font-sans flex items-center gap-2">
              <Sliders className="w-4 h-4 text-sky-600" />
              Exposure Action Levels & Limits
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              MRPL occupational health action levels for shift-long exposure dosimetry.
            </p>
          </div>

          <div className="space-y-4">
            {/* Input 1: 8-HR TWA Caution */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-900">
                  8-HR TWA Review Threshold
                </label>
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    step="0.5"
                    value={cautionThreshold}
                    onChange={(e) => setCautionThreshold(parseFloat(e.target.value) || 0)}
                    className="w-16 py-1 px-2 rounded-lg bg-slate-50 border border-slate-200 text-right font-mono text-xs text-slate-900 font-bold focus:outline-none focus:border-sky-500"
                  />
                  <span className="text-xs font-mono text-slate-500">ppm</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Triggers yellow review recommended indicator on worker dashboard (Default: 5.0 ppm).
              </p>
            </div>

            {/* Input 2: STEL Absolute Safety Limit */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-900">
                  Action Level Ceiling (STEL)
                </label>
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    step="0.5"
                    value={stelLimit}
                    onChange={(e) => setStelLimit(parseFloat(e.target.value) || 0)}
                    className="w-16 py-1 px-2 rounded-lg bg-slate-50 border border-slate-200 text-right font-mono text-xs text-amber-700 font-bold focus:outline-none focus:border-sky-500"
                  />
                  <span className="text-xs font-mono text-slate-500">ppm</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Mandatory field check dispatched to safety officer console (Default: 10.0 ppm).
              </p>
            </div>

            {/* Input 3: IDLH Critical Gas Alert */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-900">
                  Critical Emergency Action Threshold
                </label>
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    step="1.0"
                    value={idlhAlert}
                    onChange={(e) => setIdlhAlert(parseFloat(e.target.value) || 0)}
                    className="w-16 py-1 px-2 rounded-lg bg-slate-50 border border-slate-200 text-right font-mono text-xs text-red-700 font-bold focus:outline-none focus:border-sky-500"
                  />
                  <span className="text-xs font-mono text-slate-500">ppm</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Emergency evacuation alert trigger (Default: 20.0 ppm).
              </p>
            </div>

            {/* Input 4: Maintenance Intervals */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-900">
                  Dosimeter Shelf Life Check
                </label>
                <select
                  value={maintenanceInterval}
                  onChange={(e) => setMaintenanceInterval(e.target.value)}
                  className="py-1 px-2.5 rounded-lg bg-slate-50 border border-slate-200 font-mono text-xs text-slate-900 focus:outline-none focus:border-sky-500"
                >
                  <option value="Every 30 Days">Every 30 Days</option>
                  <option value="Every 60 Days">Every 60 Days</option>
                  <option value="Every 90 Days">Every 90 Days</option>
                  <option value="Every 180 Days">Every 180 Days</option>
                </select>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Automatic shelf expiration detection for chemical reaction strips.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              onClick={handleResetDefaults}
              className="text-xs font-mono text-slate-500 hover:text-slate-900 px-3 py-2 font-semibold"
            >
              Reset Defaults
            </button>

            <button
              onClick={handleApplyRules}
              disabled={saving}
              className="py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center space-x-1.5 shadow-xs transition"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-400" />
                  <span>Rules Applied!</span>
                </>
              ) : saving ? (
                <span>Applying...</span>
              ) : (
                <span>Apply Rules</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Add Hardware Modal */}
      {showAddHardwareModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl animate-fadeIn space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 font-sans flex items-center gap-2">
                <Watch className="w-4 h-4 text-sky-600" />
                Register New Wristband Dosimeter
              </h3>
              <button
                onClick={() => setShowAddHardwareModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddHardware} className="space-y-3">
              <div>
                <label className="text-xs text-slate-600 block mb-1 font-semibold">
                  Device Hardware ID
                </label>
                <input
                  type="text"
                  placeholder="#682"
                  value={newDeviceNumber}
                  onChange={(e) => setNewDeviceNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-600 block mb-1 font-semibold">
                  Assigned Operator (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rajesh Kumar"
                  value={newDeviceOperator}
                  onChange={(e) => setNewDeviceOperator(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs font-sans focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddHardwareModal(false)}
                  className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs"
                >
                  Register Device
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
