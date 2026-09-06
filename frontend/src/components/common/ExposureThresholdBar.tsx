import React from 'react';

interface ExposureThresholdBarProps {
  currentValue: number; // in ppm
  maxScale?: number; // default 25 ppm
}

export const ExposureThresholdBar: React.FC<ExposureThresholdBarProps> = ({
  currentValue,
  maxScale = 25,
}) => {
  // Clamp value percentage
  const pinPositionPct = Math.min(Math.max((currentValue / maxScale) * 100, 2), 98);

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-figma-textMuted">
        <span>Exposure Threshold Comparison</span>
        <span className="text-white font-bold">{currentValue.toFixed(1)} ppm</span>
      </div>

      {/* Bar Container with Marker Pin */}
      <div className="relative pt-3 pb-1">
        {/* Floating Pointer Marker */}
        <div 
          className="absolute top-0 transform -translate-x-1/2 flex flex-col items-center transition-all duration-700"
          style={{ left: `${pinPositionPct}%` }}
        >
          <div className="w-2.5 h-2.5 bg-white rounded-full shadow-md shadow-black/80 ring-2 ring-figma-bg" />
          <div className="w-0.5 h-2 bg-white" />
        </div>

        {/* Segmented Color Bar */}
        <div className="h-3.5 w-full rounded-full overflow-hidden flex bg-figma-card border border-figma-border/50">
          {/* Green Segment (0 - 5 ppm = 20% of 25) */}
          <div className="h-full bg-emerald-500" style={{ width: '20%' }} title="Safe (0-5 ppm)" />
          {/* Yellow/Amber Segment (5 - 10 ppm = 20% of 25) */}
          <div className="h-full bg-amber-500" style={{ width: '20%' }} title="Caution / STEL (5-10 ppm)" />
          {/* Orange/Red Segment (10 - 20 ppm = 40% of 25) */}
          <div className="h-full bg-rose-500" style={{ width: '40%' }} title="High Hazard (10-20 ppm)" />
          {/* Dark Red / IDLH Segment (20 - 25+ ppm = 20% of 25) */}
          <div className="h-full bg-red-700" style={{ width: '20%' }} title="IDLH Critical (20+ ppm)" />
        </div>
      </div>

      {/* Axis Labels */}
      <div className="flex items-center justify-between text-[11px] font-mono text-figma-textMuted px-1">
        <span>0</span>
        <span className="text-emerald-400 font-semibold">5</span>
        <span className="text-amber-400 font-semibold">10 (STEL)</span>
        <span className="text-red-400 font-semibold">20 (IDLH)</span>
      </div>
    </div>
  );
};
