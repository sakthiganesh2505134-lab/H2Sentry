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
  const [dataError, setDataError] = useState<string | null>(null);
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
    console.log('[HOME] latest exposure request started');
    setDataLoading(true);
    setDataError(null);
    try {
      const [s, b, w, r] = await Promise.all([
        fetchDashboardStats().catch(() => null),
        fetchDemoBadges().catch(() => []),
        fetchWorkers().catch((err) => {
          console.error('Fetch workers error', err);
          return [];
        }),
        fetchReadings({ limit: 50 }).catch((err) => {
          console.error('Fetch readings error', err);
          return [];
        }),
      ]);
      console.log('[HOME] latest exposure response received', { workersCount: w?.length, readingsCount: r?.length });
      setDashboardStats(s);
      setDemoBadges(b);
      setWorkers(w || []);
      setReadings(r || []);
      
      // Match active worker using functional update to avoid dependency loop
      setCurrentWorker((prevWorker) => {
        if (currentUser?.worker_id) {
          const match = (w || []).find(item => item.id === currentUser.worker_id);
          if (match) return match;
        }
        if (currentUser?.employee_id) {
          const match = (w || []).find(item => item.employee_id === currentUser.employee_id);
          if (match) return match;
        }
        if (prevWorker) {
          const matched = (w || []).find(item => item.id === prevWorker.id);
          if (matched) return matched;
        }
        return (w && w.length > 0) ? w[0] : null;
      });
      console.log('[HOME] latest exposure parsed');
    } catch (err: any) {
      console.error('[HOME] latest exposure request failed', err);
      setDataError(err.message || 'Unable to connect to service');
    } finally {
      setDataLoading(false);
      console.log('[HOME] latest exposure loading complete');
    }
  }, [currentUser?.id, currentUser?.worker_id, currentUser?.employee_id]);

  useEffect(() => {
    loadAllInitialData();
  }, [loadAllInitialData]);

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
    setDataLoading(true);
    setDataError(null);
    try {
      const [s, w, r] = await Promise.all([
        fetchDashboardStats().catch(() => null),
        fetchWorkers().catch(() => []),
        fetchReadings({ limit: 50 }).catch(() => []),
      ]);
      setDashboardStats(s);
      setWorkers(w || []);
      setReadings(r || []);
      setCurrentWorker((prevWorker) => {
        if (currentUser?.worker_id) {
          const match = (w || []).find(item => item.id === currentUser.worker_id);
          if (match) return match;
        }
        if (currentUser?.employee_id) {
          const match = (w || []).find(item => item.employee_id === currentUser.employee_id);
          if (match) return match;
        }
        if (prevWorker) {
          const match = (w || []).find(item => item.id === prevWorker.id);
          if (match) return match;
        }
        return (w && w.length > 0) ? w[0] : null;
      });
    } catch (err: any) {
      console.error('Failed to refresh data', err);
      setDataError(err.message || 'Failed to refresh telemetry');
    } finally {
      setDataLoading(false);
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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-sky-100 selection:text-sky-900 flex flex-col">
      {/* Toast Notification Banner */}
      {actionMessage && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs font-mono flex items-center gap-2 shadow-xl animate-fadeIn border border-slate-800">
          <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
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
          <div className="w-full bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs">
            <button
              onClick={() => {
                if (currentUser) {
                  setViewMode(currentUser.role === 'SUPERVISOR' ? 'supervisor' : 'worker');
                } else {
                  setViewMode('login');
                }
              }}
              className="flex items-center space-x-2 text-xs font-mono text-sky-700 hover:text-sky-900 transition font-bold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to {currentUser ? 'Application' : 'Sign In'}</span>
            </button>
            <div className="text-xs font-mono text-slate-500">
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
        <div className="w-full min-h-screen flex flex-col bg-slate-50">
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
            dataLoading={dataLoading}
            dataError={dataError}
            onRefreshData={handleRefreshData}
          />
        </div>
      )}

      {/* SUPERVISOR DASHBOARD (Responsive Desktop Operations Command Center) */}
      {viewMode === 'supervisor' && (
        <div className="min-h-screen flex flex-col bg-slate-50">
          {/* Top Supervisor Mobile App Bar */}
          <header className="lg:hidden sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
                <ShieldCheck className="w-4.5 h-4.5 text-sky-400 stroke-[2.5]" />
              </div>
              <div>
                <span className="font-bold text-slate-900 font-mono text-sm">H2Sentry</span>
                <span className="text-[10px] text-slate-500 font-mono block">Supervisor</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setMobileSupervisorMenuOpen(!mobileSupervisorMenuOpen)}
                className="p-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900"
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
              <div className="lg:hidden fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs p-4 flex flex-col justify-between">
                <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xl">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <span className="text-sm font-bold text-slate-900 font-mono">Navigation Menu</span>
                    <button
                      onClick={() => setMobileSupervisorMenuOpen(false)}
                      className="p-1 text-slate-400 hover:text-slate-700"
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
                          supervisorTab === tab.id ? 'bg-sky-50 text-sky-700 border border-sky-300 font-bold' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-slate-200">
                    <button
                      onClick={handleLogout}
                      className="w-full py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold flex items-center justify-center space-x-2"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Main Supervisor Content Area */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 overflow-y-auto">
              {/* Secondary Header Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-200">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight">
                    {supervisorTab === 'dashboard' && 'Occupational Exposure Operations'}
                    {supervisorTab === 'team' && 'Workforce Exposure Dossiers'}
                    {supervisorTab === 'alerts' && 'Safety Attention & Review Register'}
                    {supervisorTab === 'calibration' && 'Gas Chamber Calibration Benchmark'}
                    {supervisorTab === 'settings' && 'Refinery Safety Thresholds'}
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Mangalore Refinery and Petrochemicals Limited (MRPL) • Unit Dosimetry Command
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleResetDatabase}
                    title="Reset Database to 0-worker state"
                    className="px-3 py-1.5 rounded-lg text-xs font-mono text-slate-600 hover:text-red-700 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-300 transition flex items-center gap-1.5 shadow-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-500" />
                    <span className="hidden sm:inline">Clean State (0)</span>
                  </button>

                  <button
                    onClick={handleSeedDemoData}
                    title="Seed deterministic benchmark records"
                    className="px-3 py-1.5 rounded-lg text-xs font-mono text-sky-700 hover:text-sky-900 bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-300 transition flex items-center gap-1.5 shadow-xs font-semibold"
                  >
                    <Database className="w-3.5 h-3.5 text-sky-600" />
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
