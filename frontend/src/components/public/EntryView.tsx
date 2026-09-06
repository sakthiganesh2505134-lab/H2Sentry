import {
  ShieldCheck,
  Smartphone,
  LayoutDashboard,
  Sparkles,
  ArrowRight,
  Info
} from 'lucide-react';

interface EntryViewProps {
  onSelectWorker: () => void;
  onSelectSupervisor: () => void;
  onSelectDemoMode: () => void;
  onOpenAbout: () => void;
}

export const EntryView: React.FC<EntryViewProps> = ({
  onSelectWorker,
  onSelectSupervisor,
  onSelectDemoMode,
  onOpenAbout,
}) => {
  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-figma-bg text-white px-5 py-8 sm:py-12 max-w-lg mx-auto select-none animate-fadeIn">
      {/* Top Brand Header */}
      <div className="flex flex-col items-center text-center pt-4 sm:pt-8">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-figma-accent to-blue-600 flex items-center justify-center shadow-xl shadow-figma-accent/20 border border-white/15 mb-4">
          <ShieldCheck className="w-9 h-9 sm:w-11 sm:h-11 text-black stroke-[2.2]" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-mono">
          H<sub className="text-xl font-bold text-figma-accent">2</sub>Sentry
        </h1>
        <p className="text-xs font-mono tracking-widest text-figma-accent uppercase font-bold mt-1">
          Passive H₂S Exposure Intelligence
        </p>
        <p className="text-xs text-figma-textMuted mt-2 max-w-xs">
          Select your operational role to begin cumulative dosimeter tracking
        </p>
      </div>

      {/* Primary Role Selection Cards */}
      <div className="space-y-3.5 my-8">
        {/* Worker Card */}
        <button
          onClick={onSelectWorker}
          className="w-full p-5 rounded-2xl bg-figma-card hover:bg-figma-cardHover border-2 border-figma-accent/60 hover:border-figma-accent text-left transition-all shadow-lg shadow-figma-accent/10 active:scale-[0.98] group flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-figma-accent text-black flex items-center justify-center font-bold shadow-md shadow-figma-accent/30 group-hover:scale-105 transition-transform">
              <Smartphone className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="text-base font-bold text-white font-mono flex items-center gap-2">
                I'm a Worker
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-figma-accent/20 text-figma-accent border border-figma-accent/40">
                  Mobile App
                </span>
              </div>
              <p className="text-xs text-figma-textSecondary mt-0.5">
                Scan your passive badge & record shift exposure
              </p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-figma-accent group-hover:translate-x-1 transition-transform" />
        </button>

        {/* Supervisor Card */}
        <button
          onClick={onSelectSupervisor}
          className="w-full p-5 rounded-2xl bg-figma-card hover:bg-figma-cardHover border border-figma-border hover:border-gray-500 text-left transition-all active:scale-[0.98] group flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-figma-surface border border-figma-border text-white flex items-center justify-center group-hover:scale-105 transition-transform">
              <LayoutDashboard className="w-6 h-6 text-figma-accent stroke-[1.8]" />
            </div>
            <div>
              <div className="text-base font-bold text-white font-mono flex items-center gap-2">
                I'm a Supervisor
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/5 text-gray-300 border border-white/10">
                  Portal
                </span>
              </div>
              <p className="text-xs text-figma-textSecondary mt-0.5">
                View team exposures, alerts & provision badges
              </p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-figma-textMuted group-hover:translate-x-1 group-hover:text-white transition-all" />
        </button>

        {/* Demo Mode Button */}
        <button
          onClick={onSelectDemoMode}
          className="w-full p-4 rounded-xl bg-figma-surface/80 hover:bg-figma-card border border-figma-border/70 hover:border-figma-accent/40 text-left transition-all active:scale-[0.98] flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="text-xs font-bold text-white font-mono block">
                Demo Benchmark Mode
              </span>
              <span className="text-[11px] text-figma-textMuted">
                Test 7 deterministic simulated exposure scenarios
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-1 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
            SIMULATED
          </span>
        </button>
      </div>

      {/* Clean Footer with Link to Educational / Science Content */}
      <div className="flex flex-col items-center text-center gap-3 pt-4 border-t border-figma-border/50">
        <button
          onClick={onOpenAbout}
          className="text-xs text-figma-textSecondary hover:text-figma-accent transition flex items-center gap-1.5 font-mono"
        >
          <Info className="w-3.5 h-3.5" />
          <span>How H2Sentry Works & Scientific Principles →</span>
        </button>

        <p className="text-[10px] font-mono text-figma-textMuted/60">
          SIH 2026 | Mangalore Refinery & Petrochemicals Limited (MRPL)
        </p>
      </div>
    </div>
  );
};
