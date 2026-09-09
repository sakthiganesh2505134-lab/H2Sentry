import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';

interface SplashViewProps {
  onComplete: () => void;
}

export const SplashView: React.FC<SplashViewProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const duration = 1200; // 1.2s smooth splash

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(interval);
        setTimeout(onComplete, 100);
      }
    }, 20);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div 
      onClick={onComplete}
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-slate-50 text-slate-900 select-none px-6 py-12 cursor-pointer animate-fadeIn"
    >
      <div className="w-full text-right">
        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
          Tap to skip
        </span>
      </div>

      {/* Center Brand Block */}
      <div className="flex flex-col items-center text-center space-y-6 max-w-sm">
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl bg-slate-900 flex items-center justify-center shadow-xl shadow-slate-900/10 border border-slate-800 relative z-10">
            <ShieldCheck className="w-12 h-12 text-sky-400 stroke-[2.2]" />
          </div>
        </div>

        <div className="space-y-1.5">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 font-mono">
            H<sub className="text-2xl font-bold text-sky-600">2</sub>Sentry
          </h1>
          <p className="text-xs font-mono tracking-[0.2em] text-slate-500 uppercase font-bold">
            Passive H₂S Exposure Intelligence
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-48 h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-slate-900 rounded-full transition-all duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Bottom Subtitle */}
      <div className="text-center space-y-1">
        <div className="flex items-center justify-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-sky-500" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-semibold">
            CAL-v0.1-demo Active
          </span>
        </div>
        <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
          Industrial Occupational Dosimetry System • MRPL Unit
        </p>
      </div>
    </div>
  );
};
