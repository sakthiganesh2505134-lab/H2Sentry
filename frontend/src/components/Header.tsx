import React from 'react';
import { Shield, Activity, Scan, Users, FlaskConical, Settings as SettingsIcon, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import type { SystemHealth } from '../types';

interface HeaderProps {
  activeTab: 'dashboard' | 'scanner' | 'workforce' | 'calibration' | 'settings';
  setActiveTab: (tab: 'dashboard' | 'scanner' | 'workforce' | 'calibration' | 'settings') => void;
  health: SystemHealth | null;
  onRefreshHealth: () => void;
  onOpenQuickScan: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  health,
  onRefreshHealth,
  onOpenQuickScan
}) => {
  const isHealthy = health?.status === 'HEALTHY';

  const navItems = [
    { id: 'dashboard', label: 'Hygiene Dashboard', icon: Activity },
    { id: 'scanner', label: 'Dosimeter Scanner', icon: Scan },
    { id: 'workforce', label: 'Workforce Dossier', icon: Users },
    { id: 'calibration', label: 'Calibration Lab', icon: FlaskConical },
    { id: 'settings', label: 'Plant Thresholds', icon: SettingsIcon },
  ] as const;

  return (
    <header className="border-b border-industrial-700/80 bg-industrial-900/95 sticky top-0 z-40 backdrop-blur-md">
      {/* Top Industrial Banner */}
      <div className="px-4 py-2 border-b border-industrial-800 flex items-center justify-between text-xs font-mono text-industrial-400 bg-industrial-950/60">
        <div className="flex items-center space-x-3">
          <span className="inline-flex items-center text-amber-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse mr-1.5" />
            SIH 2026 • SIH26118
          </span>
          <span className="text-industrial-600">|</span>
          <span className="text-slate-300">Mangalore Refinery and Petrochemicals Limited (MRPL)</span>
          <span className="hidden md:inline text-industrial-600">|</span>
          <span className="hidden md:inline text-industrial-400">Area IV — Sulfur Recovery & Treatment Block</span>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={onRefreshHealth}
            title="Refresh System Diagnostic Health"
            className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-industrial-800/80 hover:bg-industrial-700 text-slate-300 transition-colors"
          >
            {isHealthy ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300 font-medium">CV Core Ready</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-300 font-medium">Connecting...</span>
              </>
            )}
            <RefreshCw className="w-3 h-3 text-industrial-400 hover:text-industrial-200 ml-1" />
          </button>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 via-industrial-800 to-amber-500/20 border border-cyan-500/40 flex items-center justify-center shadow-lg shadow-cyan-500/10">
              <Shield className="w-5 h-5 text-safety-cyan" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-white font-sans">
                  H<sub className="text-sm font-semibold text-safety-cyan">2</sub>Sentry
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                  Dosimetry AI
                </span>
              </div>
              <p className="text-[11px] text-industrial-400 font-mono tracking-tight">
                Passive Optical Cumulative Exposure Engine
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-md text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-industrial-800 text-safety-cyan border border-safety-cyan/40 shadow-sm shadow-cyan-500/10'
                      : 'text-industrial-300 hover:text-white hover:bg-industrial-800/60 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-safety-cyan' : 'text-industrial-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Quick Action Button */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onOpenQuickScan}
              className="flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-semibold bg-gradient-to-r from-safety-cyan to-blue-600 text-industrial-950 hover:from-cyan-400 hover:to-blue-500 shadow-md shadow-cyan-500/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Scan className="w-4 h-4" />
              <span>Scan Dosimeter</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Tabs */}
      <div className="md:hidden flex overflow-x-auto px-4 py-2 border-t border-industrial-800 space-x-1 scrollbar-none">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-industrial-800 text-safety-cyan border border-safety-cyan/40'
                  : 'text-industrial-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
