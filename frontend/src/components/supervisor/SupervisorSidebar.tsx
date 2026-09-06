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
    <aside className="w-64 bg-figma-surface border-r border-figma-border flex flex-col justify-between shrink-0 h-screen sticky top-0 select-none z-30">
      {/* Brand Header */}
      <div>
        <div className="p-5 border-b border-figma-border/60">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-figma-accent to-blue-600 flex items-center justify-center shadow-lg shadow-figma-accent/15 border border-white/10 shrink-0">
              <ShieldCheck className="w-5 h-5 text-black stroke-[2.4]" />
            </div>
            <div>
              <div className="text-base font-black tracking-tight text-white font-mono flex items-center">
                <span>H<sub className="text-xs font-bold text-figma-accent">2</sub>Sentry</span>
              </div>
              <div className="text-[10px] font-mono tracking-wider text-figma-accent uppercase font-bold">
                Supervisor Portal
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3.5 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-figma-card text-figma-accent border border-figma-accent/40 shadow-sm shadow-figma-accent/10'
                    : 'text-figma-textSecondary hover:text-white hover:bg-figma-card/60 border border-transparent'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-figma-accent' : 'text-figma-textMuted'}`} />
                  <span className="font-sans">{item.label}</span>
                </div>
                {item.badge ? (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-figma-danger text-white">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Authenticated Supervisor Profile Card & Sign Out */}
      <div className="p-4 space-y-3 border-t border-figma-border/60">
        {/* Supervisor User Details */}
        <div className="p-3 rounded-xl bg-figma-card border border-figma-border/70 flex items-center space-x-3">
          <div className="w-9 h-9 rounded-full bg-figma-surface border border-figma-border flex items-center justify-center text-figma-textMuted shrink-0">
            <User className="w-4 h-4 text-figma-accent" />
          </div>
          <div className="overflow-hidden flex-1">
            <div className="text-xs font-bold text-white font-sans truncate">
              {supervisorName}
            </div>
            <div className="text-[10px] font-mono text-figma-textMuted truncate">
              {employeeId} • {supervisorRole}
            </div>
          </div>
        </div>

        {/* Sign Out Action */}
        <button
          onClick={onSignOut}
          className="w-full py-2 px-3 rounded-xl bg-red-950/40 hover:bg-red-950/70 border border-red-500/30 text-xs font-mono text-red-300 hover:text-white transition-all flex items-center justify-center space-x-2"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
