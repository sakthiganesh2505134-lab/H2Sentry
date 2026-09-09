import React from 'react';
import { 
  ShieldCheck, 
  LayoutDashboard, 
  Users, 
  Bell, 
  FlaskConical, 
  Settings, 
  User, 
  LogOut 
} from 'lucide-react';
import type { AuthUser } from '../../types';

interface SupervisorSidebarProps {
  activeTab: 'dashboard' | 'team' | 'alerts' | 'calibration' | 'settings';
  setActiveTab: (tab: 'dashboard' | 'team' | 'alerts' | 'calibration' | 'settings') => void;
  currentUser?: AuthUser | null;
  onSignOut: () => void;
  unreadAlertsCount?: number;
}

interface NavItem {
  id: 'dashboard' | 'team' | 'alerts' | 'calibration' | 'settings';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export const SupervisorSidebar: React.FC<SupervisorSidebarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onSignOut,
  unreadAlertsCount = 1,
}) => {
  const supervisorName = currentUser?.name || 'Arun Nair';
  const supervisorRole = currentUser?.department || 'Refinery Safety & HSE Lead';
  const employeeId = currentUser?.employee_id || 'MRPL-SUP-001';

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Operations Dashboard', icon: LayoutDashboard },
    { id: 'team', label: 'Workforce & Dossiers', icon: Users },
    { id: 'alerts', label: 'Safety Review Queue', icon: Bell, badge: unreadAlertsCount },
    { id: 'calibration', label: 'Calibration Lab', icon: FlaskConical },
    { id: 'settings', label: 'Thresholds & Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 h-screen sticky top-0 select-none z-30 shadow-sm">
      {/* Brand Header */}
      <div>
        <div className="p-5 border-b border-slate-200">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shadow-md shadow-slate-900/10 border border-slate-800 shrink-0">
              <ShieldCheck className="w-5 h-5 text-sky-400 stroke-[2.4]" />
            </div>
            <div>
              <div className="text-base font-black tracking-tight text-slate-900 font-mono flex items-center">
                <span>H<sub className="text-xs font-bold text-sky-600">2</sub>Sentry</span>
              </div>
              <div className="text-[10px] font-mono tracking-wider text-slate-500 uppercase font-bold">
                Supervisor Portal
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3.5 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-sky-50 text-sky-700 border border-sky-200 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-sky-600' : 'text-slate-400'}`} />
                  <span className="font-sans">{item.label}</span>
                </div>
                {item.badge ? (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-500 text-white shadow-sm">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Authenticated Supervisor Profile Card & Sign Out */}
      <div className="p-4 space-y-3 border-t border-slate-200 bg-slate-50/50">
        {/* Supervisor User Details */}
        <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
            <User className="w-4 h-4 text-sky-600" />
          </div>
          <div className="overflow-hidden flex-1">
            <div className="text-xs font-bold text-slate-900 font-sans truncate">
              {supervisorName}
            </div>
            <div className="text-[10px] font-mono text-slate-500 truncate">
              {employeeId} • {supervisorRole}
            </div>
          </div>
        </div>

        {/* Sign Out Action */}
        <button
          onClick={onSignOut}
          className="w-full py-2 px-3 rounded-xl bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 text-xs font-mono text-slate-700 hover:text-red-700 transition-all flex items-center justify-center space-x-2 shadow-xs"
        >
          <LogOut className="w-3.5 h-3.5 text-red-500" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

