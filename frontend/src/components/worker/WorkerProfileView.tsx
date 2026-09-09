import React, { useState } from 'react';
import { User, Watch, PhoneCall, LogOut, Bell, Vibrate, Eye } from 'lucide-react';
import type { Worker } from '../../types';

interface WorkerProfileViewProps {
  currentWorker: Worker | null;
  onSignOut: () => void;
}

export const WorkerProfileView: React.FC<WorkerProfileViewProps> = ({
  currentWorker,
  onSignOut,
}) => {
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [pushNotifications, setPushNotifications] = useState<boolean>(true);
  const [hapticAlerts, setHapticAlerts] = useState<boolean>(true);

  const name = currentWorker?.name || 'Rajesh Kumar';
  const employeeId = currentWorker?.employee_id || 'MRPL-EMP-4091';
  const department = currentWorker?.department || 'Sulfur Recovery Unit (SRU-1)';
  const unit = currentWorker?.unit || 'SRU-1';
  const shift = currentWorker?.shift || 'Shift A (Morning 06:00 - 14:00)';
  const activeBadgeId = currentWorker?.active_badge_id || 'MRPL-H2S-8821';

  return (
    <div className="flex flex-col justify-between min-h-[580px] h-full p-5 space-y-4 animate-fadeIn overflow-y-auto">
      {/* Title */}
      <h2 className="text-2xl font-black text-slate-900 tracking-tight font-sans">
        Worker Profile & Shift
      </h2>

      {/* Operator Profile Card */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center space-x-4">
        <div className="w-14 h-14 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700 shrink-0">
          <User className="w-7 h-7 text-sky-700" />
        </div>
        <div className="space-y-0.5 overflow-hidden">
          <h3 className="text-lg font-bold text-slate-900 font-sans truncate">
            {name}
          </h3>
          <div className="text-xs font-mono font-medium text-slate-500">
            EMPLOYEE ID: <span className="text-slate-800 font-semibold">{employeeId}</span>
          </div>
          <div className="text-[11px] font-mono font-bold text-sky-700 uppercase tracking-wider truncate">
            {department.toUpperCase()} • {unit.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Assigned Disposable Badge Card */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <Watch className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 font-mono">
              Badge: {activeBadgeId}
            </div>
            <div className="text-[11px] font-mono text-slate-500">
              {shift}
            </div>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
          ASSIGNED
        </span>
      </div>

      {/* Device Settings Section */}
      <div className="space-y-2.5">
        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 block px-1">
          Device Settings
        </span>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
          {/* Toggle 1: High Contrast */}
          <div className="p-3.5 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <Eye className="w-4 h-4 text-slate-400" />
              <span className="text-xs sm:text-sm font-semibold text-slate-800">
                High-Contrast Mode
              </span>
            </div>
            <button
              type="button"
              onClick={() => setHighContrast(!highContrast)}
              className={`w-11 h-6 rounded-full p-0.5 transition-colors ${
                highContrast ? 'bg-sky-600' : 'bg-slate-200'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${
                  highContrast ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Toggle 2: Safety Push Notifications */}
          <div className="p-3.5 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <Bell className="w-4 h-4 text-slate-400" />
              <span className="text-xs sm:text-sm font-semibold text-slate-800">
                Safety Push Notifications
              </span>
            </div>
            <button
              type="button"
              onClick={() => setPushNotifications(!pushNotifications)}
              className={`w-11 h-6 rounded-full p-0.5 transition-colors ${
                pushNotifications ? 'bg-sky-600' : 'bg-slate-200'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${
                  pushNotifications ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Toggle 3: Haptic Alerts */}
          <div className="p-3.5 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <Vibrate className="w-4 h-4 text-slate-400" />
              <span className="text-xs sm:text-sm font-semibold text-slate-800">
                Haptic Alerts (Gloves On)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setHapticAlerts(!hapticAlerts)}
              className={`w-11 h-6 rounded-full p-0.5 transition-colors ${
                hapticAlerts ? 'bg-sky-600' : 'bg-slate-200'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${
                  hapticAlerts ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Emergency Site Contact Card */}
      <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 shadow-sm space-y-1.5">
        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-rose-700 block">
          EMERGENCY SITE CONTACT
        </span>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm sm:text-base font-black text-rose-900 font-mono tracking-wide block">
              CONTROL ROOM: EXT. 9110
            </span>
            <span className="text-[10px] font-mono text-rose-600">
              Emergency H₂S Incident Team
            </span>
          </div>
          <a
            href="tel:9110"
            className="p-2.5 rounded-xl bg-rose-600 text-white hover:bg-rose-700 shadow-sm transition-colors flex items-center justify-center"
            title="Call Emergency Control Room"
          >
            <PhoneCall className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Sign Out Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onSignOut}
          className="w-full py-3.5 px-4 rounded-2xl bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 hover:border-rose-300 font-bold text-sm flex items-center justify-center space-x-2 shadow-sm transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out of Shift</span>
        </button>
      </div>
    </div>
  );
};
