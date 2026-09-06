import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';

interface SplashViewProps {
  onComplete: () => void;
}

export const SplashView: React.FC<SplashViewProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const duration = 1400; // 1.4s smooth splash

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(interval);
        setTimeout(onComplete, 150);
      }
    }, 20);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div 
      onClick={onComplete}
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-figma-bg text-white select-none px-6 py-12 cursor-pointer animate-fadeIn"
    >
      <div className="w-full text-right">
        <span className="text-[10px] font-mono text-figma-textMuted uppercase tracking-wider">
          Tap to skip
        </span>
      </div>

      {/* Center Brand Block */}
      <div className="flex flex-col items-center text-center space-y-6 max-w-sm">
        <div className="relative">
          {/* Ambient Outer Pulse */}
          <div className="absolute -inset-4 bg-figma-accent/20 blur-xl rounded-full animate-ping-slow pointer-events-none" />
          
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-figma-accent to-blue-600 flex items-center justify-center shadow-2xl shadow-figma-accent/30 border border-white/20 relative z-10">
            <ShieldCheck className="w-12 h-12 text-black stroke-[2.2]" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white font-mono">
            H<sub className="text-2xl font-bold text-figma-accent">2</sub>Sentry
          </h1>
          <p className="text-xs font-mono tracking-[0.2em] text-figma-accent uppercase font-bold">
            Passive H₂S Exposure Intelligence
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-48 h-1.5 bg-figma-surface rounded-full overflow-hidden border border-figma-border/60">
          <div 
            className="h-full bg-gradient-to-r from-figma-accent to-blue-500 rounded-full transition-all duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Bottom Subtitle */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-figma-accent animate-pulse" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-figma-textMuted">
            CAL-v0.1-demo Active
          </span>
        </div>
        <p className="text-[10px] font-mono text-figma-textMuted/70 uppercase tracking-wider">
          Industrial Occupational Dosimetry System
        </p>
      </div>
    </div>
  );
};
