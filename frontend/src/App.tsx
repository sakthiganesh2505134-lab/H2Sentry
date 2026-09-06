import { useState, useEffect, useCallback } from 'react';
import { WorkerLayout } from './components/worker/WorkerLayout';
import { SupervisorSidebar } from './components/supervisor/SupervisorSidebar';
import { DashboardView } from './components/DashboardView';
import { WorkforceView } from './components/WorkforceView';
import { CalibrationLabView } from './components/CalibrationLabView';
import { SettingsView } from './components/SettingsView';
import { ReadingDetailModal } from './components/ReadingDetailModal';
import { LandingView } from './components/public/LandingView';
import { SplashView } from './components/public/SplashView';
import { LoginView } from './components/public/LoginView';
import type { 
  DashboardStats, 
  DemoBadgeItem, 
  Worker, 
  Reading,
  AuthUser,
  LoginCredentials
} from './types';
import { 
  fetchDashboardStats, 
  fetchDemoBadges, 
  fetchWorkers,
  fetchReadings,
  resetDatabase,
  seedDemoData,
  loginUser,
  fetchCurrentUser,
  logoutUser,
  getStoredToken
} from './services/api';
import { 
  ShieldCheck, 
  RotateCcw, 
  Database,
  CheckCircle2,
  Menu,
  X,
  LogOut,
  ArrowLeft
} from 'lucide-react';

export function App() {
  // App Experience States: 'splash' | 'login' | 'worker' | 'supervisor' | 'about'
  const [viewMode, setViewMode] = useState<'splash' | 'login' | 'worker' | 'supervisor' | 'about'>('splash');
  
  // Authentication & Session
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [splashFinished, setSplashFinished] = useState<boolean>(false);

  // Supervisor active sub-tab: 'dashboard' | 'team' | 'alerts' | 'calibration' | 'settings'
  const [supervisorTab, setSupervisorTab] = useState<'dashboard' | 'team' | 'alerts' | 'calibration' | 'settings'>('dashboard');
  const [mobileSupervisorMenuOpen, setMobileSupervisorMenuOpen] = useState<boolean>(false);

  // Core Data States
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [demoBadges, setDemoBadges] = useState<DemoBadgeItem[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [dataLoading, setDataLoading] = useState<boolean>(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Selected Entities
  const [currentWorker, setCurrentWorker] = useState<Worker | null>(null);
  const [selectedReading, setSelectedReading] = useState<Reading | null>(null);
  const [selectedWorkerIdForDossier, setSelectedWorkerIdForDossier] = useState<string | null>(null);
  const [activePresetScenario, setActivePresetScenario] = useState<string | null>(null);

  // 1. Session Check & Initialization on App Launch
  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      const storedToken = getStoredToken();
      if (!storedToken) {
        if (isMounted && splashFinished) {
          setViewMode(window.location.hash === '#about' ? 'about' : 'login');
        }
        return;
      }

      try {
        const user = await fetchCurrentUser(storedToken);
        if (isMounted) {
          setCurrentUser(user);
          if (splashFinished) {
            if (user.role === 'SUPERVISOR') {
              setViewMode('supervisor');
            } else {
              setViewMode('worker');
            }
          }
        }
      } catch {
        if (isMounted && splashFinished) {
          setViewMode(window.location.hash === '#about' ? 'about' : 'login');
        }
      }
    }

    checkSession();

    return () => {
      isMounted = false;
    };
  }, [splashFinished]);

  // Transition from Splash when splash animation finishes
  const handleSplashComplete = () => {
    setSplashFinished(true);
    if (currentUser) {
      if (currentUser.role === 'SUPERVISOR') {
        setViewMode('supervisor');
        window.location.hash = 'supervisor';
      } else {
        setViewMode('worker');
        window.location.hash = 'worker';
      }
    } else {
      if (window.location.hash === '#about') {
        setViewMode('about');
      } else {
        setViewMode('login');
        window.location.hash = 'login';
      }
    }
  };

  // 2. Load Core Application Data
  const loadAllInitialData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [s, b, w, r] = await Promise.all([
        fetchDashboardStats().catch(() => null),
        fetchDemoBadges().catch(() => []),
        fetchWorkers().catch(() => []),
        fetchReadings({ limit: 50 }).catch(() => []),
      ]);
      setDashboardStats(s);
      setDemoBadges(b);
      setWorkers(w);
      setReadings(r);
      
      // Match active worker with logged in user if applicable
      if (currentUser?.worker_id) {
        const match = w.find(item => item.id === currentUser.worker_id);
        if (match) setCurrentWorker(match);
      } else if (w.length > 0 && !currentWorker) {
        setCurrentWorker(w[0]);
      }
    } catch (err) {
      console.error('Initial data load error', err);
    } finally {
      setDataLoading(false);
    }
  }, [currentUser, currentWorker]);

  useEffect(() => {
    loadAllInitialData();
  }, [loadAllInitialData]);

  // Sync currentWorker whenever workers list or currentUser changes
  useEffect(() => {
    if (currentUser && workers.length > 0) {
      const match = workers.find(
        w => w.employee_id === currentUser.employee_id || w.id === currentUser.worker_id
      );
      if (match) {
        setCurrentWorker(match);
      }
    }
  }, [currentUser, workers]);

  // 3. User Login Handler
  const handleLogin = async (credentials: LoginCredentials) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await loginUser(credentials);
      setCurrentUser(res.user);
      
      // Route based on role strictly determined by backend
      if (res.user.role === 'SUPERVISOR') {
        setViewMode('supervisor');
        setSupervisorTab('dashboard');
        window.location.hash = 'supervisor';
      } else {
        setViewMode('worker');
        window.location.hash = 'worker';
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed. Please verify credentials.');
      throw err;
    } finally {
      setAuthLoading(false);
    }
  };

  // 4. User Logout Handler
  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch {}
    setCurrentUser(null);
    setViewMode('login');
    window.location.hash = 'login';
    setActionMessage('Signed out successfully.');
    setTimeout(() => setActionMessage(null), 3000);
  };

  // 5. Data Refresh & Management
  const handleRefreshData = async () => {
    try {
      const [s, w, r] = await Promise.all([
        fetchDashboardStats().catch(() => null),
        fetchWorkers().catch(() => []),
        fetchReadings({ limit: 50 }).catch(() => []),
      ]);
      setDashboardStats(s);
      setWorkers(w);
      setReadings(r);
      if (currentUser?.worker_id) {
        const match = w.find(item => item.id === currentUser.worker_id);
        if (match) setCurrentWorker(match);
      }
    } catch (err) {
      console.error('Failed to refresh data', err);
    }
  };

  const handleResetDatabase = async () => {
    if (!window.confirm('Reset database to clean 0-worker state? All uncommitted demo data will be cleared.')) return;
    setDataLoading(true);
    try {
      await resetDatabase();
      await handleRefreshData();
      setActionMessage('Database cleared: Clean Mode active (0 workers, 0 readings).');
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      console.error('Reset error', err);
      setActionMessage('Failed to reset database: ' + err.message);
    } finally {
      setDataLoading(false);
    }
  };

  const handleSeedDemoData = async () => {
    setDataLoading(true);
    try {
      await seedDemoData();
      await handleRefreshData();
      setActionMessage('Demo mode seeded: Deterministic benchmark records populated.');
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      console.error('Seed error', err);
      setActionMessage('Failed to seed demo data: ' + err.message);
    } finally {
      setDataLoading(false);
    }
  };

  const handleOpenWorkerDossier = (workerId: string) => {
    setSelectedWorkerIdForDossier(workerId);
    setSupervisorTab('team');
  };

  return (
    <div className="min-h-screen bg-figma-bg text-figma-textPrimary font-sans selection:bg-figma-accent selection:text-black flex flex-col">
      {/* Toast Notification Banner */}
      {actionMessage && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 bg-cyan-950/95 border border-figma-accent/60 text-figma-accent px-4 py-2 rounded-xl text-xs font-mono flex items-center gap-2 shadow-2xl animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-figma-accent shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* SCREEN 1: SPLASH SCREEN */}
      {viewMode === 'splash' && (
        <SplashView onComplete={handleSplashComplete} />
      )}

      {/* SCREEN 2: LOGIN SCREEN */}
      {viewMode === 'login' && (
        <LoginView
          onLogin={handleLogin}
          loading={authLoading}
          errorMessage={authError}
          onOpenAbout={() => setViewMode('about')}
        />
      )}

      {/* EDUCATIONAL ABOUT & SCIENCE SCREEN */}
      {viewMode === 'about' && (
        <div className="w-full flex-1 flex flex-col">
          {/* Top Return Header */}
          <div className="w-full bg-figma-surface border-b border-figma-border px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => {
                if (currentUser) {
                  setViewMode(currentUser.role === 'SUPERVISOR' ? 'supervisor' : 'worker');
                } else {
                  setViewMode('login');
                }
              }}
              className="flex items-center space-x-2 text-xs font-mono text-figma-accent hover:text-white transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to {currentUser ? 'Application' : 'Sign In'}</span>
            </button>
            <div className="text-xs font-mono text-figma-textMuted">
              H2Sentry Documentation & Science
            </div>
          </div>

          <LandingView
            onLaunchWorker={() => {
              if (currentUser?.role === 'WORKER') setViewMode('worker');
              else setViewMode('login');
            }}
            onLaunchSupervisor={() => {
              if (currentUser?.role === 'SUPERVISOR') setViewMode('supervisor');
              else setViewMode('login');
            }}
            onLaunchDemoScenario={(presetId) => {
              setActivePresetScenario(presetId);
              if (currentUser) setViewMode('worker');
              else setViewMode('login');
            }}
          />
        </div>
      )}

      {/* WORKER APPLICATION (Mobile-First, Real Viewport, No Fake Phone Bezel) */}
      {viewMode === 'worker' && (
        <div className="w-full min-h-screen flex flex-col bg-figma-bg">
          <WorkerLayout
            workers={workers}
            currentWorker={currentWorker}
            onSelectWorker={(w) => setCurrentWorker(w)}
            demoBadges={demoBadges}
            readings={readings}
            onSelectReading={setSelectedReading}
            onReadingSaved={handleRefreshData}
            onSignOut={handleLogout}
            initialPresetScenario={activePresetScenario}
          />
        </div>
      )}

      {/* SUPERVISOR DASHBOARD (Responsive Desktop Operations Command Center) */}
      {viewMode === 'supervisor' && (
        <div className="min-h-screen flex flex-col bg-figma-bg">
          {/* Top Supervisor Mobile App Bar */}
          <header className="lg:hidden sticky top-0 z-40 bg-figma-surface/95 backdrop-blur-md border-b border-figma-border px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-figma-accent to-blue-600 flex items-center justify-center">
                <ShieldCheck className="w-4.5 h-4.5 text-black stroke-[2.5]" />
              </div>
              <div>
                <span className="font-bold text-white font-mono text-sm">H2Sentry</span>
                <span className="text-[10px] text-figma-accent font-mono block">Supervisor</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setMobileSupervisorMenuOpen(!mobileSupervisorMenuOpen)}
                className="p-2 rounded-lg bg-figma-card border border-figma-border text-white"
              >
                {mobileSupervisorMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </header>

          {/* Supervisor Layout with Sidebar & Content */}
          <div className="flex flex-1 w-full">
            {/* Desktop Sidebar */}
            <div className="hidden lg:block">
              <SupervisorSidebar
                activeTab={supervisorTab}
                setActiveTab={(tab) => {
                  setSupervisorTab(tab);
                }}
                currentUser={currentUser}
                onSignOut={handleLogout}
                unreadAlertsCount={1}
              />
            </div>

            {/* Mobile Navigation Drawer */}
            {mobileSupervisorMenuOpen && (
              <div className="lg:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-figma-border">
                    <span className="text-sm font-bold text-white font-mono">Navigation Menu</span>
                    <button
                      onClick={() => setMobileSupervisorMenuOpen(false)}
                      className="p-1 text-figma-textMuted hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-2 pt-2">
                    {[
                      { id: 'dashboard', label: 'Operations Dashboard' },
                      { id: 'team', label: 'Workforce & Dossiers' },
                      { id: 'alerts', label: 'Safety Review Queue' },
                      { id: 'calibration', label: 'Calibration Lab' },
                      { id: 'settings', label: 'Thresholds & Settings' }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setSupervisorTab(tab.id as any);
                          setMobileSupervisorMenuOpen(false);
                        }}
                        className={`p-3 rounded-xl text-left text-xs font-semibold ${
                          supervisorTab === tab.id ? 'bg-figma-card text-figma-accent border border-figma-accent' : 'text-gray-300'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-figma-border">
                  <button
                    onClick={handleLogout}
                    className="w-full py-3 rounded-xl bg-red-950 text-red-300 border border-red-500/40 text-xs font-bold flex items-center justify-center space-x-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}

            {/* Main Supervisor Content Area */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 overflow-y-auto">
              {/* Secondary Header Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-figma-border/60">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">
                    {supervisorTab === 'dashboard' && 'Occupational Exposure Operations'}
                    {supervisorTab === 'team' && 'Workforce Exposure Dossiers'}
                    {supervisorTab === 'alerts' && 'Safety Attention & Review Register'}
                    {supervisorTab === 'calibration' && 'Gas Chamber Calibration Benchmark'}
                    {supervisorTab === 'settings' && 'Refinery Safety Thresholds'}
                  </h1>
                  <p className="text-xs text-figma-textMuted mt-0.5">
                    Mangalore Refinery and Petrochemicals Limited (MRPL) • Unit Dosimetry Command
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleResetDatabase}
                    title="Reset Database to 0-worker state"
                    className="px-2.5 py-1.5 rounded-lg text-xs font-mono text-gray-400 hover:text-red-400 bg-figma-card hover:bg-red-950/30 border border-figma-border hover:border-red-800/40 transition flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Clean State (0)</span>
                  </button>

                  <button
                    onClick={handleSeedDemoData}
                    title="Seed deterministic benchmark records"
                    className="px-2.5 py-1.5 rounded-lg text-xs font-mono text-figma-accent bg-figma-card hover:bg-figma-accent/15 border border-figma-border hover:border-figma-accent/40 transition flex items-center gap-1.5"
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Seed Demo</span>
                  </button>
                </div>
              </div>

              {supervisorTab === 'dashboard' && (
                <DashboardView
                  stats={dashboardStats}
                  workers={workers}
                  loading={dataLoading}
                  onNavigateTab={(tab) => setSupervisorTab(tab)}
                  onSelectReading={setSelectedReading}
                  onSelectWorker={handleOpenWorkerDossier}
                />
              )}

              {supervisorTab === 'team' && (
                <WorkforceView
                  onSelectReading={setSelectedReading}
                  selectedWorkerId={selectedWorkerIdForDossier || currentWorker?.id}
                  onNavigateBackToDashboard={() => setSupervisorTab('dashboard')}
                />
              )}

              {supervisorTab === 'alerts' && (
                <DashboardView
                  stats={dashboardStats}
                  workers={workers}
                  loading={dataLoading}
                  onNavigateTab={(tab) => setSupervisorTab(tab)}
                  onSelectReading={setSelectedReading}
                  onSelectWorker={handleOpenWorkerDossier}
                />
              )}

              {supervisorTab === 'calibration' && (
                <CalibrationLabView />
              )}

              {supervisorTab === 'settings' && (
                <SettingsView />
              )}
            </main>
          </div>
        </div>
      )}

      {/* Reading Detail Dossier Modal */}
      {selectedReading && (
        <ReadingDetailModal
          reading={selectedReading}
          onClose={() => setSelectedReading(null)}
          onOpenWorkerDossier={handleOpenWorkerDossier}
        />
      )}
    </div>
  );
}

export default App;
