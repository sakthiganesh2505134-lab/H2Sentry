import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Wrench, 
  Check, 
  Bell 
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
    { id: '#247', operator: 'James Rodriguez', lastCalib: 'Oct 12, 2026', status: 'ACTIVE' },
    { id: '#512', operator: 'Sarah Jenkins', lastCalib: 'Oct 24, 2026', status: 'ACTIVE' },
    { id: '#389', operator: 'None — In Storage', lastCalib: 'Aug 15, 2025', status: 'CALIBRATION DUE' },
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
      {/* Top Header matching Figma calibration-admin */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-figma-border/60">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-sans">
            System Administration
          </h1>
          <p className="text-xs sm:text-sm text-figma-textSecondary mt-0.5 font-sans">
            Hardware calibration fleet status and software threshold registers.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <span className="px-3.5 py-1.5 rounded-full text-xs font-mono font-bold tracking-wider uppercase bg-figma-surface border border-figma-border text-figma-accent shadow-sm">
            REFINERY DAY SHIFT
          </span>
          <button className="relative p-2 rounded-xl bg-figma-surface hover:bg-figma-card border border-figma-border text-figma-textSecondary hover:text-white transition-colors">
            <Bell className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main 2-Column Split: Left Fleet Register & Maintenance | Right Shift Threshold Tuning */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Fleet Register & Maintenance Queue (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Wristband Dosimeter Register Card matching Figma */}
          <div className="figma-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white font-sans">
                Wristband Dosimeter Register
              </h2>
              <button
                onClick={() => setShowAddHardwareModal(true)}
                className="figma-button-secondary py-1.5 px-3 text-xs font-semibold space-x-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-figma-accent" />
                <span>Add Hardware</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="border-b border-figma-border text-[11px] font-mono text-figma-textMuted uppercase tracking-wider">
                    <th className="pb-3 font-semibold">DEVICE ID</th>
                    <th className="pb-3 font-semibold">ASSIGNED OPERATOR</th>
                    <th className="pb-3 font-semibold">LAST CALIBRATION</th>
                    <th className="pb-3 font-semibold text-right">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-figma-border/40">
                  {hardwareFleet.map((dev) => (
                    <tr key={dev.id} className="hover:bg-figma-card/80 transition-colors">
                      <td className="py-3.5 font-mono text-white font-bold">
                        {dev.id}
                      </td>
                      <td className="py-3.5 text-figma-textSecondary">
                        {dev.operator}
                      </td>
                      <td className="py-3.5 font-mono text-figma-textMuted text-[11px]">
                        {dev.lastCalib}
                      </td>
                      <td className="py-3.5 text-right">
                        {dev.status === 'ACTIVE' ? (
                          <span className="inline-flex items-center space-x-1.5 text-xs font-bold font-mono text-figma-safe">
                            <span className="w-2 h-2 rounded-full bg-figma-safe" />
                            <span>ACTIVE</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1.5 text-xs font-bold font-mono text-figma-warning">
                            <span className="w-2 h-2 rounded-full bg-figma-warning" />
                            <span>CALIBRATION DUE</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Scheduled Hardware Maintenance Queue matching Figma */}
          <div className="figma-card p-5 space-y-3">
            <h2 className="text-base font-bold text-white font-sans">
              Scheduled Hardware Maintenance Queue
            </h2>

            <div className="p-4 rounded-xl bg-amber-950/25 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-amber-500/5">
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-lg bg-amber-500/20 text-figma-warning shrink-0 mt-0.5">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white font-sans">
                    Dosimeter #109
                  </h3>
                  <p className="text-xs text-figma-textSecondary mt-0.5 max-w-md">
                    Colorimetric element degradation threshold exceeded (90 days since last exposure cycle)
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setRecalibratedSuccess(true);
                  setTimeout(() => setRecalibratedSuccess(false), 2500);
                }}
                className="figma-button-primary py-2 px-4 text-xs font-bold shrink-0 self-end sm:self-center"
              >
                {recalibratedSuccess ? 'Recalibrated ✓' : 'Recalibrate'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Shift Threshold Tuning (5 cols) matching Figma */}
        <div className="lg:col-span-5 figma-card p-5 space-y-5">
          <h2 className="text-base font-bold text-white font-sans">
            Shift Threshold Tuning
          </h2>

          <div className="space-y-4">
            {/* Input 1: 8-HR TWA Caution */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white">
                  8-HR TWA Caution Threshold
                </label>
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    step="0.5"
                    value={cautionThreshold}
                    onChange={(e) => setCautionThreshold(parseFloat(e.target.value) || 0)}
                    className="w-16 py-1 px-2 rounded bg-figma-card border border-figma-border text-right font-mono text-xs text-figma-accent font-bold"
                  />
                  <span className="text-xs font-mono text-figma-textMuted">ppm</span>
                </div>
              </div>
              <p className="text-[11px] text-figma-textMuted leading-relaxed">
                Triggers warning alerts on worker dashboard page and triggers average exposure calculations.
              </p>
            </div>

            {/* Input 2: STEL Absolute Safety Limit */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white">
                  STEL Absolute Safety Limit
                </label>
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    step="0.5"
                    value={stelLimit}
                    onChange={(e) => setStelLimit(parseFloat(e.target.value) || 0)}
                    className="w-16 py-1 px-2 rounded bg-figma-card border border-figma-border text-right font-mono text-xs text-figma-warning font-bold"
                  />
                  <span className="text-xs font-mono text-figma-textMuted">ppm</span>
                </div>
              </div>
              <p className="text-[11px] text-figma-textMuted leading-relaxed">
                Instant site warning alert pushed to safety officer monitor for field checks.
              </p>
            </div>

            {/* Input 3: IDLH Critical Gas Alert */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white">
                  IDLH Critical Gas Alert
                </label>
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    step="1.0"
                    value={idlhAlert}
                    onChange={(e) => setIdlhAlert(parseFloat(e.target.value) || 0)}
                    className="w-16 py-1 px-2 rounded bg-figma-card border border-figma-border text-right font-mono text-xs text-figma-danger font-bold"
                  />
                  <span className="text-xs font-mono text-figma-textMuted">ppm</span>
                </div>
              </div>
              <p className="text-[11px] text-figma-textMuted leading-relaxed">
                Direct immediate danger to life & health threshold limit.
              </p>
            </div>

            {/* Input 4: Maintenance Intervals */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white">
                  Maintenance Intervals
                </label>
                <select
                  value={maintenanceInterval}
                  onChange={(e) => setMaintenanceInterval(e.target.value)}
                  className="py-1 px-2.5 rounded bg-figma-card border border-figma-border font-mono text-xs text-white"
                >
                  <option value="Every 30 Days">Every 30 Days</option>
                  <option value="Every 60 Days">Every 60 Days</option>
                  <option value="Every 90 Days">Every 90 Days</option>
                  <option value="Every 180 Days">Every 180 Days</option>
                </select>
              </div>
              <p className="text-[11px] text-figma-textMuted leading-relaxed">
                Automatic recalibration warnings.
              </p>
            </div>
          </div>

          {/* Action Buttons matching Figma */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-figma-border/50">
            <button
              onClick={handleResetDefaults}
              className="text-xs font-mono text-figma-textMuted hover:text-white px-3 py-2"
            >
              Reset Defaults
            </button>

            <button
              onClick={handleApplyRules}
              disabled={saving}
              className="figma-button-primary py-2 px-4 text-xs font-bold space-x-1.5"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="figma-card max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-white font-sans">
              Register New Wristband Dosimeter
            </h3>
            <form onSubmit={handleAddHardware} className="space-y-3">
              <div>
                <label className="text-xs font-mono text-figma-textMuted block mb-1">
                  Device Hardware ID
                </label>
                <input
                  type="text"
                  placeholder="#682"
                  value={newDeviceNumber}
                  onChange={(e) => setNewDeviceNumber(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-figma-card border border-figma-border text-white text-xs font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-mono text-figma-textMuted block mb-1">
                  Assigned Operator (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Michael Chang"
                  value={newDeviceOperator}
                  onChange={(e) => setNewDeviceOperator(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-figma-card border border-figma-border text-white text-xs"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddHardwareModal(false)}
                  className="figma-button-secondary py-2 px-3 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="figma-button-primary py-2 px-4 text-xs font-bold"
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
