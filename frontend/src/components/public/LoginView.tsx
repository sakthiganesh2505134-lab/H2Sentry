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
  const [showDemoAccordion, setShowDemoAccordion] = useState<boolean>(false);
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
    <div className="min-h-screen w-full flex flex-col justify-between bg-figma-bg text-white px-5 py-6 sm:py-10 max-w-md mx-auto select-none animate-fadeIn">
      {/* Top Header & Branding */}
      <div className="flex flex-col items-center text-center pt-2 sm:pt-6">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-figma-accent to-blue-600 flex items-center justify-center shadow-2xl shadow-figma-accent/20 border border-white/15 mb-4">
          <ShieldCheck className="w-9 h-9 sm:w-11 sm:h-11 text-black stroke-[2.2]" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-mono">
          H<sub className="text-xl font-bold text-figma-accent">2</sub>Sentry
        </h1>
        <p className="text-[11px] font-mono tracking-widest text-figma-accent uppercase font-bold mt-1">
          Passive H₂S Exposure Intelligence
        </p>
      </div>

      {/* Main Login Card Form */}
      <div className="w-full my-auto py-4">
        <div className="p-6 rounded-2xl bg-figma-card border border-figma-border shadow-2xl space-y-5">
          <div className="border-b border-figma-border/60 pb-3">
            <h2 className="text-base font-bold text-white tracking-wide">Sign in to continue</h2>
            <p className="text-xs text-figma-textMuted mt-0.5">
              Enter your occupational safety ID and authorization PIN.
            </p>
          </div>

          {displayError && (
            <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-500/50 flex items-start space-x-2.5 text-xs text-red-200 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="leading-snug">{displayError}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Employee ID / Username Input */}
            <div>
              <label className="block text-[11px] font-mono text-figma-textMuted uppercase tracking-wider mb-1.5 font-semibold">
                Employee ID / Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-figma-textMuted">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. EMP1024 or MRPL-EMP-4091"
                  disabled={loading}
                  autoComplete="username"
                  className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-black/50 border border-figma-border text-white text-sm font-mono placeholder:text-figma-textMuted/60 focus:outline-none focus:border-figma-accent focus:ring-1 focus:ring-figma-accent transition"
                />
              </div>
            </div>

            {/* PIN / Password Input */}
            <div>
              <label className="block text-[11px] font-mono text-figma-textMuted uppercase tracking-wider mb-1.5 font-semibold">
                PIN / Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-figma-textMuted">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter 4-digit PIN (default: 1234)"
                  disabled={loading}
                  autoComplete="current-password"
                  className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-black/50 border border-figma-border text-white text-sm font-mono placeholder:text-figma-textMuted/60 focus:outline-none focus:border-figma-accent focus:ring-1 focus:ring-figma-accent transition"
                />
              </div>
            </div>

            {/* Primary Sign In CTA */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 figma-button-primary text-sm font-bold shadow-lg shadow-figma-accent/20 flex items-center justify-center space-x-2 uppercase tracking-wider transition active:scale-[0.99]"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
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

          {/* Judge Demo Access Expandable Section */}
          <div className="pt-2 border-t border-figma-border/40">
            <button
              type="button"
              onClick={() => setShowDemoAccordion(!showDemoAccordion)}
              className="w-full flex items-center justify-between text-xs font-mono text-figma-textMuted hover:text-figma-accent py-1.5 transition"
            >
              <span className="flex items-center space-x-1.5 font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-figma-accent" />
                <span>Judge Demo Access Credentials</span>
              </span>
              {showDemoAccordion ? (
                <ChevronUp className="w-4 h-4 text-figma-textMuted" />
              ) : (
                <ChevronDown className="w-4 h-4 text-figma-textMuted" />
              )}
            </button>

            {showDemoAccordion && (
              <div className="mt-2.5 p-3 rounded-xl bg-black/40 border border-figma-border/60 space-y-2 text-xs font-mono animate-fadeIn">
                <p className="text-[11px] text-figma-textMuted">
                  Click a demonstration credential below to auto-fill. You must still press <strong>Sign In</strong> to authenticate through the backend.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {/* Worker Demo Quick Fill */}
                  <button
                    type="button"
                    onClick={() => handleSelectDemo('EMP1024', '1234')}
                    className="p-2.5 rounded-lg bg-figma-bg border border-figma-border hover:border-figma-accent/60 text-left transition flex items-start space-x-2 group"
                  >
                    <Briefcase className="w-4 h-4 text-figma-accent shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-white group-hover:text-figma-accent transition text-[11px]">
                        Worker Demo
                      </div>
                      <div className="text-[10px] text-figma-textMuted">
                        ID: <span className="text-white font-mono">EMP1024</span>
                      </div>
                      <div className="text-[9px] text-emerald-400 font-sans">Role: Worker</div>
                    </div>
                  </button>

                  {/* Supervisor Demo Quick Fill */}
                  <button
                    type="button"
                    onClick={() => handleSelectDemo('SUP001', '1234')}
                    className="p-2.5 rounded-lg bg-figma-bg border border-figma-border hover:border-blue-400/60 text-left transition flex items-start space-x-2 group"
                  >
                    <ShieldAlert className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-white group-hover:text-blue-400 transition text-[11px]">
                        Supervisor Demo
                      </div>
                      <div className="text-[10px] text-figma-textMuted">
                        ID: <span className="text-white font-mono">SUP001</span>
                      </div>
                      <div className="text-[9px] text-blue-300 font-sans">Role: Supervisor</div>
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
            className="text-xs text-figma-textMuted hover:text-figma-accent flex items-center space-x-1.5 transition py-1"
          >
            <Info className="w-3.5 h-3.5" />
            <span>How H2Sentry Works & Scientific Limitations</span>
          </button>
        )}
        <div className="text-[10px] font-mono text-figma-textMuted/60">
          SIH 2026 • Problem Statement SIH26118 • MRPL
        </div>
      </div>
    </div>
  );
};
