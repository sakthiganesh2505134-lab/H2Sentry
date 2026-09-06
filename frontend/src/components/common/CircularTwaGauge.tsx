import React from 'react';
import { Check, AlertTriangle, ShieldAlert } from 'lucide-react';

interface CircularTwaGaugeProps {
  value: number; // in ppm
  unit?: string;
  status: 'SAFE' | 'ELEVATED' | 'DANGER' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | string;
  maxScale?: number;
  size?: number;
  strokeWidth?: number;
  sublabel?: string;
  showIcon?: boolean;
}

export const CircularTwaGauge: React.FC<CircularTwaGaugeProps> = ({
  value,
  unit = 'ppm',
  status,
  maxScale = 15.0,
  size = 240,
  strokeWidth = 14,
  sublabel = '8-HR TWA',
  showIcon = true,
}) => {
  const normStatus = status.toUpperCase();
  const isSafe = normStatus === 'SAFE' || normStatus === 'LOW';
  const isElevated = normStatus === 'ELEVATED' || normStatus === 'MODERATE' || normStatus === 'WARNING';
  const isDanger = normStatus === 'DANGER' || normStatus === 'HIGH' || normStatus === 'CRITICAL';

  // Determine display color
  let colorHex = '#10B981'; // Green for safe
  let glowColor = 'rgba(16, 185, 129, 0.35)';
  let statusText = 'SAFE';

  if (isDanger) {
    colorHex = '#EF4444'; // Red for danger
    glowColor = 'rgba(239, 68, 68, 0.4)';
    statusText = 'DANGER';
  } else if (isElevated) {
    colorHex = '#F59E0B'; // Amber for elevated / warning
    glowColor = 'rgba(245, 158, 11, 0.4)';
    statusText = normStatus === 'WARNING' ? 'WARNING' : 'ELEVATED';
  }

  // Calculate arc parameters
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Arc coverage percentage (clamp between 5% and 100%)
  const pct = Math.min(Math.max((value / maxScale), 0.05), 1);
  const strokeDashoffset = circumference - pct * circumference;

  return (
    <div 
      className="relative flex items-center justify-center select-none"
      style={{ width: size, height: size }}
    >
      {/* Background Track Circle */}
      <svg 
        className="w-full h-full transform -rotate-90"
        viewBox={`0 0 ${size} ${size}`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1E293B"
          strokeWidth={strokeWidth}
          className="opacity-40"
        />
        {/* Animated Active Progress Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colorHex}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{
            filter: `drop-shadow(0px 0px 10px ${glowColor})`,
            transition: 'stroke-dashoffset 1s ease-in-out, stroke 0.5s ease',
          }}
        />
      </svg>

      {/* Center Display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
        {showIcon && (
          <div className="mb-1 flex items-center justify-center">
            {isSafe && (
              <div className="w-8 h-8 rounded-full border-2 border-emerald-500/80 flex items-center justify-center text-emerald-400">
                <Check className="w-4 h-4 stroke-[2.5]" />
              </div>
            )}
            {isElevated && (
              <div className="w-8 h-8 rounded-full border-2 border-amber-500/80 flex items-center justify-center text-amber-400">
                <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
              </div>
            )}
            {isDanger && (
              <div className="w-8 h-8 rounded-full border-2 border-red-500/80 flex items-center justify-center text-red-400 animate-pulse">
                <ShieldAlert className="w-4 h-4 stroke-[2.5]" />
              </div>
            )}
          </div>
        )}

        {/* Status Label */}
        <span 
          className="text-sm font-bold tracking-wider font-sans uppercase mb-0.5"
          style={{ color: colorHex }}
        >
          {statusText}
        </span>

        {/* Big Numeric Value */}
        <div className="flex items-baseline justify-center space-x-1">
          <span className="text-4xl sm:text-5xl font-extrabold text-white font-sans tracking-tight">
            {value.toFixed(1)}
          </span>
          <span className="text-xs sm:text-sm font-mono text-figma-textMuted uppercase">
            {unit}
          </span>
        </div>

        {/* Subtitle */}
        {sublabel && (
          <span className="text-[10px] font-mono tracking-wider text-figma-textMuted uppercase mt-1">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
};
