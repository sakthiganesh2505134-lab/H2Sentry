import React, { useState } from 'react';
import { User, Watch, PhoneCall, LogOut } from 'lucide-react';
import type { Worker } from '../../types';

interface WorkerProfileViewProps {
  currentWorker: Worker | null;
  onSignOut: () => void;
}

export const WorkerProfileView: React.FC<WorkerProfileViewProps> = ({
  currentWorker,
  onSignOut,
}) => {
  const [highContrast, setHighContrast] = useState<boolean>(true);
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
      <h2 className="text-2xl font-bold text-white tracking-tight font-sans">
        Worker Profile & Shift
      </h2>

      {/* Operator Profile Card */}
      <div className="figma-card p-4 flex items-center space-x-4">
        <div className="w-14 h-14 rounded-full bg-figma-card border border-figma-border flex items-center justify-center text-figma-textMuted shrink-0">
          <User className="w-7 h-7 text-figma-textSecondary" />
        </div>
        <div className="space-y-0.5 overflow-hidden">
          <h3 className="text-lg font-bold text-white font-sans truncate">
            {name}
          </h3>
          <div className="text-xs font-mono text-figma-textMuted">
            EMPLOYEE ID: {employeeId}
          </div>
          <div className="text-[11px] font-mono font-bold text-figma-accent uppercase tracking-wider truncate">
            {department.toUpperCase()} • {unit.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Assigned Disposable Badge Card */}
      <div className="figma-card p-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Watch className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white font-mono">
              Badge: {activeBadgeId}
            </div>
            <div className="text-[10px] font-mono text-figma-textMuted">
              {shift}
            </div>
          </div>
        </div>

        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-950 text-emerald-400 border border-emerald-500/40">
          ASSIGNED
        </span>
      </div>

      {/* Device Settings Section Matching Figma */}
      <div className="space-y-3">
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-figma-textMuted block px-1">
          Device Settings
        </span>

        <div className="figma-card divide-y divide-figma-border/50">
          {/* Toggle 1: High Contrast */}
          <div className="p-3.5 flex items-center justify-between">
            <span className="text-xs sm:text-sm font-medium text-white">
              High-Contrast Dark Mode
            </span>
            <button
              onClick={() => setHighContrast(!highContrast)}
              className={`w-12 h-6 rounded-full p-0.5 transition-colors ${
                highContrast ? 'bg-figma-accent' : 'bg-figma-border'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-black shadow-md transform transition-transform ${
                  highContrast ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Toggle 2: Safety Push Notifications */}
          <div className="p-3.5 flex items-center justify-between">
            <span className="text-xs sm:text-sm font-medium text-white">
              Safety Push Notifications
            </span>
            <button
              onClick={() => setPushNotifications(!pushNotifications)}
              className={`w-12 h-6 rounded-full p-0.5 transition-colors ${
                pushNotifications ? 'bg-figma-accent' : 'bg-figma-border'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-black shadow-md transform transition-transform ${
                  pushNotifications ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Toggle 3: Haptic Alerts */}
          <div className="p-3.5 flex items-center justify-between">
            <span className="text-xs sm:text-sm font-medium text-white">
              Haptic Alerts (Gloves On)
            </span>
            <button
              onClick={() => setHapticAlerts(!hapticAlerts)}
              className={`w-12 h-6 rounded-full p-0.5 transition-colors ${
                hapticAlerts ? 'bg-figma-accent' : 'bg-figma-border'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-black shadow-md transform transition-transform ${
                  hapticAlerts ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Emergency Site Contact Card Matching Figma */}
      <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 space-y-1">
        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-red-400 block">
          EMERGENCY SITE CONTACT
        </span>
        <div className="flex items-center justify-between">
          <span className="text-sm sm:text-base font-black text-white font-mono tracking-wider">
            CONTROL ROOM: EXT. 9110
          </span>
          <a
            href="tel:9110"
            className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
          >
            <PhoneCall className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Sign Out Button Matching Figma */}
      <div className="pt-2">
        <button
          onClick={onSignOut}
          className="w-full py-3.5 px-4 figma-button-danger text-sm font-bold space-x-2"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out of Shift</span>
        </button>
      </div>
    </div>
  );
};
