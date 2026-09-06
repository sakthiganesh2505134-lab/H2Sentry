import React from 'react';
import { Shield } from 'lucide-react';

interface WorkerSplashViewProps {
  onEnter: () => void;
}

export const WorkerSplashView: React.FC<WorkerSplashViewProps> = ({ onEnter }) => {
  return (
    <div 
      onClick={onEnter}
      className="flex flex-col items-center justify-between min-h-[580px] h-full py-10 px-6 cursor-pointer select-none bg-figma-bg animate-fadeIn"
    >
      <div className="w-full flex justify-end">
        <span className="text-[11px] font-mono text-figma-accent uppercase tracking-widest animate-pulse">
          Tap anywhere to continue
        </span>
      </div>

      {/* Center Brand Block */}
      <div className="flex flex-col items-center text-center space-y-6">
        <div className="w-24 h-24 rounded-2xl bg-gradient-to-b from-amber-500/20 via-industrial-900 to-industrial-950 border-2 border-figma-accent flex items-center justify-center shadow-2xl shadow-figma-accent/20">
          <Shield className="w-12 h-12 text-figma-accent stroke-[1.75]" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white font-sans">
            H<sub className="text-2xl font-bold text-figma-accent">2</sub>Sentry
          </h1>
          <p className="text-xs font-mono tracking-[0.25em] text-figma-textMuted uppercase font-semibold">
            PASSIVE EXPOSURE INTELLIGENCE
          </p>
        </div>
      </div>

      {/* Bottom Footer & Dots */}
      <div className="flex flex-col items-center space-y-4">
        {/* 3 Pagination Dots */}
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-figma-accent shadow-sm shadow-figma-accent" />
          <div className="w-2 h-2 rounded-full bg-figma-border" />
          <div className="w-2 h-2 rounded-full bg-figma-border" />
        </div>

        <p className="text-[10px] font-mono tracking-[0.2em] text-figma-textMuted/70 uppercase">
          OCCUPATIONAL INDUSTRIAL GRADE
        </p>
      </div>
    </div>
  );
};
