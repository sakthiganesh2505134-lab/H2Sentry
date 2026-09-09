import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  ArrowRight, 
  Sparkles, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp,
  Briefcase,
  ShieldAlert,
  Info
} from 'lucide-react';
import type { LoginCredentials } from '../../types';

interface LoginViewProps {
  onLogin: (credentials: LoginCredentials) => Promise<void>;
  loading?: boolean;
  errorMessage?: string | null;
  onOpenAbout?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLogin,
  loading = false,
  errorMessage = null,
  onOpenAbout,
}) => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showDemoAccordion, setShowDemoAccordion] = useState<boolean>(true);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!username.trim()) {
      setLocalError('Please enter your Employee ID or Username.');
      return;
    }
    if (!password.trim()) {
      setLocalError('Please enter your PIN or Password.');
      return;
    }

    try {
      await onLogin({
        username: username.trim(),
        password: password.trim(),
      });
    } catch (err: any) {
      setLocalError(err.message || 'Authentication failed. Please check your credentials.');
    }
  };

  const handleSelectDemo = (demoUser: string, demoPin: string) => {
    setUsername(demoUser);
    setPassword(demoPin);
    setLocalError(null);
  };

  const displayError = localError || errorMessage;

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-slate-50 text-slate-900 px-5 py-6 sm:py-10 max-w-md mx-auto select-none animate-fadeIn">
      {/* Top Header & Branding */}
      <div className="flex flex-col items-center text-center pt-2 sm:pt-6">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg shadow-slate-900/10 border border-slate-800 mb-4">
          <ShieldCheck className="w-9 h-9 sm:w-11 sm:h-11 text-sky-400 stroke-[2.2]" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 font-mono">
          H<sub className="text-xl font-bold text-sky-600">2</sub>Sentry
        </h1>
        <p className="text-[11px] font-mono tracking-widest text-slate-500 uppercase font-bold mt-1">
          Passive H₂S Exposure Intelligence
        </p>
      </div>

      {/* Main Login Card Form */}
      <div className="w-full my-auto py-4">
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-md space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 tracking-tight font-sans">Sign In</h2>
            <p className="text-xs text-slate-500 mt-0.5 font-sans">
              Enter your occupational safety ID and authorization PIN.
            </p>
          </div>

          {displayError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start space-x-2.5 text-xs text-red-700 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="leading-snug">{displayError}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Employee ID / Username Input */}
            <div>
              <label className="block text-[11px] font-mono text-slate-600 uppercase tracking-wider mb-1.5 font-semibold">
                Employee ID / Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. EMP1024 or SUP001"
                  disabled={loading}
                  autoComplete="username"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-mono placeholder:text-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
                />
              </div>
            </div>

            {/* PIN / Password Input */}
            <div>
              <label className="block text-[11px] font-mono text-slate-600 uppercase tracking-wider mb-1.5 font-semibold">
                PIN / Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter 4-digit PIN (default: 1234)"
                  disabled={loading}
                  autoComplete="current-password"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-mono placeholder:text-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
                />
              </div>
            </div>

            {/* Primary Sign In CTA */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold shadow-md shadow-slate-900/10 flex items-center justify-center space-x-2 tracking-wide transition active:scale-[0.99]"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </div>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>

          {/* Judge Demo Access Credentials */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowDemoAccordion(!showDemoAccordion)}
              className="w-full flex items-center justify-between text-xs font-mono text-slate-600 hover:text-slate-900 py-1 transition"
            >
              <span className="flex items-center space-x-1.5 font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                <span>Judge Demo Access Credentials</span>
              </span>
              {showDemoAccordion ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {showDemoAccordion && (
              <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs font-mono animate-fadeIn">
                <p className="text-[11px] text-slate-500 font-sans">
                  Click a demonstration credential to auto-fill, then press <strong>Sign In</strong>.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {/* Worker Demo Quick Fill */}
                  <button
                    type="button"
                    onClick={() => handleSelectDemo('EMP1024', '1234')}
                    className="p-2.5 rounded-lg bg-white border border-slate-200 hover:border-sky-400 text-left transition flex items-start space-x-2 shadow-xs group"
                  >
                    <Briefcase className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-slate-900 group-hover:text-sky-700 transition text-[11px] font-sans">
                        Worker Demo
                      </div>
                      <div className="text-[10px] text-slate-500">
                        ID: <span className="text-slate-900 font-mono font-semibold">EMP1024</span>
                      </div>
                      <div className="text-[9px] text-emerald-700 font-sans font-semibold">Role: Worker</div>
                    </div>
                  </button>

                  {/* Supervisor Demo Quick Fill */}
                  <button
                    type="button"
                    onClick={() => handleSelectDemo('SUP001', '1234')}
                    className="p-2.5 rounded-lg bg-white border border-slate-200 hover:border-sky-400 text-left transition flex items-start space-x-2 shadow-xs group"
                  >
                    <ShieldAlert className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-slate-900 group-hover:text-sky-700 transition text-[11px] font-sans">
                        Supervisor Demo
                      </div>
                      <div className="text-[10px] text-slate-500">
                        ID: <span className="text-slate-900 font-mono font-semibold">SUP001</span>
                      </div>
                      <div className="text-[9px] text-sky-700 font-sans font-semibold">Role: Supervisor</div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Footer & About Link */}
      <div className="flex flex-col items-center text-center space-y-2 pt-2">
        {onOpenAbout && (
          <button
            onClick={onOpenAbout}
            className="text-xs text-slate-500 hover:text-sky-700 flex items-center space-x-1.5 transition py-1 font-semibold"
          >
            <Info className="w-3.5 h-3.5" />
            <span>How H2Sentry Works & Scientific Disclosures</span>
          </button>
        )}
        <div className="text-[10px] font-mono text-slate-400">
          SIH 2026 • Problem Statement SIH26118 • MRPL Refinery Unit
        </div>
      </div>
    </div>
  );
};
