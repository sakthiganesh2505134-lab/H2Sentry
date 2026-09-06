import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Database, 
  ArrowRight, 
  Camera, 
  QrCode, 
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  AlertOctagon,
  HeartPulse
} from 'lucide-react';

interface LandingViewProps {
  onLaunchWorker: () => void;
  onLaunchSupervisor: () => void;
  onLaunchDemoScenario: (presetId: string) => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onLaunchWorker,
  onLaunchSupervisor,
  onLaunchDemoScenario,
}) => {
  const [activeZone, setActiveZone] = useState<number>(0);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);

  const badgeZones = [
    {
      title: "1. Unique QR / Badge ID",
      role: "Identity Layer (WHO / WHICH BADGE)",
      description: "Encodes only the unique Badge ID (e.g. H2S-BDG-2026-000381). Backend resolves the worker, employee ID, plant unit, shift, and issue/expiry timestamps without exposing sensitive worker PII inside the QR.",
      tag: "Identity Bridge",
      color: "border-cyan-400 text-cyan-400"
    },
    {
      title: "2. Printed Reference Colour Scale",
      role: "Lighting Normalization Layer (OPTICAL CORRECTION)",
      description: "Seven calibrated reference patches (0, 50, 100, 200, 400, 800, 1600 ppm·min) normalize for ambient lux, white balance shifts, and smartphone sensor variations before measuring chemical reaction.",
      tag: "Lighting Calibration",
      color: "border-sky-400 text-sky-400"
    },
    {
      title: "3. Long Rectangular Reaction Strip",
      role: "Exposure Sensing Layer (WHAT EXPOSURE OCCURRED)",
      description: "Porous metal-salt composite matrix undergoes irreversible proportional darkening upon passive diffusion of H2S gas over time. The chemical response records cumulative exposure dose (ppm·min).",
      tag: "Passive Dosimetry",
      color: "border-amber-400 text-amber-400"
    },
    {
      title: "4. Expiry / Shelf-Life Indicator",
      role: "Integrity Layer (IS BADGE STILL VALID)",
      description: "Separate sealed chemical indicator transitions from green (valid) to amber (expiring soon) to red (expired), ensuring stale or oxidized badges are flagged before recording occupational dose.",
      tag: "Reagent Validity",
      color: "border-emerald-400 text-emerald-400"
    }
  ];

  const healthThresholds = [
    { range: "< 1 ppm", severity: "Very Low", description: "Very low airborne concentration reference; detectable by normal human olfactory response." },
    { range: "1 – 5 ppm", severity: "Mild Concern", description: "Prolonged exposure may cause symptoms such as eye irritation, headache, nausea, or sleep disturbance in susceptible individuals." },
    { range: "5 – 10 ppm", severity: "Occupational Watch", description: "Increasing occupational concern; 10 ppm is an important international reference point." },
    { range: "10 ppm", severity: "NIOSH REL", description: "NIOSH Recommended Exposure Limit: 10-minute ceiling airborne concentration." },
    { range: "20 ppm", severity: "OSHA Ceiling", description: "OSHA general-industry ceiling concentration." },
    { range: "50 ppm", severity: "OSHA Peak", description: "OSHA exceptional 10-minute peak reference under specified industrial conditions." },
    { range: "100 ppm", severity: "NIOSH IDLH", description: "Immediately Dangerous to Life or Health (IDLH). Rapid evacuation mandatory." },
    { range: "500 – 700 ppm", severity: "Severe Toxicity", description: "Severe toxicity; respiratory paralysis, collapse, and fatality can occur rapidly." },
    { range: "700 – 1000+ ppm", severity: "Lethal", description: "Extremely dangerous; rapid loss of consciousness and death within minutes." },
  ];

  const workflowSteps = [
    {
      num: "01",
      title: "WEAR",
      desc: "Worker clips the lightweight passive dosimeter badge to lapel or wristband during shift."
    },
    {
      num: "02",
      title: "SCAN BADGE",
      desc: "Smartphone camera captures badge QR to instantly verify identity and shift assignment."
    },
    {
      num: "03",
      title: "READ STRIP",
      desc: "Colorimetric camera captures the reaction strip alongside the printed reference scale."
    },
    {
      num: "04",
      title: "EVALUATE",
      desc: "Kinetic model computes estimated cumulative dose (ppm·min) with explainable confidence."
    },
    {
      num: "05",
      title: "RECORD",
      desc: "Reading is digitally committed to the worker's shift dossier for organizational monitoring."
    }
  ];

  return (
    <div className="w-full min-h-screen bg-figma-bg text-figma-textPrimary select-none">
      {/* Top Brand Navigation Bar */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-figma-bg/85 border-b border-figma-border/60 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <ShieldCheck className="w-5 h-5 text-black stroke-[2.5]" />
            </div>
            <div>
              <div className="text-lg font-black tracking-wider text-white font-mono flex items-center gap-2">
                H2SENTRY
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-400/15 text-cyan-300 border border-cyan-400/30">
                  CAL-v0.1-demo
                </span>
              </div>
              <p className="text-[11px] text-figma-textMuted tracking-wider">
                PASSIVE EXPOSURE INTELLIGENCE
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onLaunchSupervisor}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-figma-card/80 hover:bg-figma-cardHover border border-figma-border transition text-figma-textSecondary hover:text-white"
            >
              <Database className="w-3.5 h-3.5" />
              Supervisor Portal
            </button>
            <button
              onClick={onLaunchWorker}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-cyan-400 text-black hover:bg-cyan-300 shadow-md shadow-cyan-500/25 transition active:scale-95 uppercase tracking-wider"
            >
              <Camera className="w-4 h-4" />
              Try Mobile Worker App
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-6 pt-16 pb-20 max-w-7xl mx-auto overflow-hidden">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-cyan-500/10 blur-[130px] rounded-full pointer-events-none" />
        <div className="absolute top-40 right-10 w-[300px] h-[300px] bg-blue-600/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="text-center max-w-3xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-figma-card border border-figma-border/80 text-xs font-medium text-cyan-400 mb-6 shadow-inner font-mono">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Industrial Cumulative Exposure Dosimetry</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1] mb-6 font-mono">
            Passive Chemical Sensing Meets Optical Computer Vision
          </h1>

          <p className="text-base sm:text-lg text-figma-textSecondary leading-relaxed mb-8">
            <span className="text-white font-medium">H2Sentry</span> is a passive cumulative H₂S exposure dosimeter system that combines a disposable colorimetric badge with smartphone computer vision to estimate cumulative exposure dose (<strong className="text-white">ppm·min</strong>) and digitally record the result against the worker, badge, and shift.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onLaunchWorker}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-cyan-400 text-black font-bold text-sm hover:bg-cyan-300 shadow-xl shadow-cyan-500/25 transition transform active:scale-95 flex items-center justify-center gap-3 uppercase tracking-wider"
            >
              <Camera className="w-5 h-5 stroke-[2.5]" />
              Try Mobile Worker Scan
            </button>

            <button
              onClick={() => {
                const el = document.getElementById('how-it-works');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-figma-card hover:bg-figma-cardHover border border-figma-border text-sm font-semibold text-white transition flex items-center justify-center gap-2"
            >
              How It Works
              <ArrowRight className="w-4 h-4 text-figma-textMuted" />
            </button>
          </div>

          {/* Quick Benchmark Presets Pill Bar */}
          <div className="mt-10 pt-6 border-t border-figma-border/50 text-left">
            <p className="text-xs font-mono uppercase tracking-wider text-figma-textMuted mb-3 text-center">
              1-Click Deterministic Benchmark Scenarios (Software Test Data):
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { id: 'badge_baseline_0ppm', label: 'Clean (0 ppm·min)' },
                { id: 'badge_low_150ppm', label: 'Low (150 ppm·min)' },
                { id: 'badge_moderate_742ppm', label: 'Moderate (742 ppm·min)' },
                { id: 'badge_high_1850ppm', label: 'High (1850 ppm·min)' },
                { id: 'badge_expired', label: 'Expired Badge' },
                { id: 'badge_poor_lighting', label: 'Poor Lighting' },
                { id: 'badge_blurry', label: 'Blurry Scan' }
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => onLaunchDemoScenario(p.id)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-figma-card hover:bg-cyan-400/15 hover:border-cyan-400/40 border border-figma-border text-figma-textSecondary hover:text-white transition font-mono"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 5-Step Visual Workflow */}
      <section id="how-it-works" className="px-6 py-16 max-w-7xl mx-auto border-t border-figma-border/60">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-xs font-mono uppercase tracking-widest text-cyan-400 mb-2">Core Workflow</p>
          <h2 className="text-3xl font-black text-white font-mono uppercase">5-Step Dosimetry Journey</h2>
          <p className="text-sm text-figma-textSecondary mt-2">
            From physical wear to digital occupational record
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {workflowSteps.map((step, idx) => (
            <div 
              key={idx} 
              className="p-6 rounded-2xl bg-figma-card border border-figma-border hover:border-cyan-400/40 transition relative group"
            >
              <div className="text-xs font-mono text-cyan-400 font-black tracking-widest mb-3">
                {step.num}
              </div>
              <h3 className="text-base font-bold text-white mb-2 font-mono flex items-center justify-between">
                {step.title}
                {idx < 4 && <ArrowRight className="w-3.5 h-3.5 text-figma-textMuted hidden lg:block group-hover:translate-x-1 transition" />}
              </h3>
              <p className="text-xs text-figma-textSecondary leading-relaxed">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Physical Dosimeter Visual Schematic */}
      <section className="px-6 py-16 max-w-7xl mx-auto border-t border-figma-border/60">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-xs font-mono uppercase tracking-widest text-cyan-400 mb-2">Hardware Architecture</p>
          <h2 className="text-3xl font-black text-white font-mono uppercase">Physical Dosimeter Layout</h2>
          <p className="text-sm text-figma-textSecondary mt-2">
            The physical card integrates 4 distinct operational zones
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Interactive Badge Concept Render */}
          <div className="lg:col-span-6 p-6 rounded-3xl bg-figma-card border border-figma-border relative overflow-hidden">
            <div className="p-4 rounded-2xl bg-[#1e2329] border border-gray-700 font-sans shadow-2xl space-y-3">
              {/* Badge Header: QR / Badge ID */}
              <div 
                onClick={() => setActiveZone(0)}
                className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${activeZone === 0 ? 'border-cyan-400 bg-cyan-950/30' : 'border-gray-700 bg-gray-900/50'}`}
              >
                <div>
                  <div className="text-[9px] font-mono text-cyan-400 font-bold">[ZONE 1] QR / BADGE ID</div>
                  <div className="text-xs font-mono font-bold text-white">H2S-BDG-2026-000381</div>
                </div>
                <QrCode className="w-5 h-5 text-cyan-400" />
              </div>

              {/* Zone 2: Reference Color Scale */}
              <div 
                onClick={() => setActiveZone(1)}
                className={`p-2.5 rounded-xl border transition cursor-pointer ${activeZone === 1 ? 'border-sky-400 bg-sky-950/30 shadow-lg shadow-sky-500/10' : 'border-gray-700 bg-gray-900/50 hover:border-gray-600'}`}
              >
                <div className="flex items-center justify-between text-[9px] font-mono text-gray-400 mb-1.5">
                  <span className="font-bold text-sky-400">[ZONE 2] REFERENCE COLOR SCALE</span>
                  <span>7 PATCHES</span>
                </div>
                <div className="grid grid-cols-7 gap-1 h-6">
                  {['0', '50', '100', '200', '400', '800', '1600'].map((val, i) => (
                    <div key={val} className="rounded-sm flex items-center justify-center text-[7px] text-black font-bold" style={{ backgroundColor: ['#dcd6c0', '#d8cd7a', '#caa357', '#c18f65', '#ad7475', '#906d7f', '#6e4a5d'][i] }}>
                      {val}
                    </div>
                  ))}
                </div>
              </div>

              {/* Zone 3: Long Rectangular Reaction Strip */}
              <div 
                onClick={() => setActiveZone(2)}
                className={`p-3 rounded-xl border transition cursor-pointer ${activeZone === 2 ? 'border-amber-400 bg-amber-950/30 shadow-lg shadow-amber-500/10' : 'border-gray-700 bg-gray-900/50 hover:border-gray-600'}`}
              >
                <div className="flex items-center justify-between text-[9px] font-mono text-amber-400 font-bold mb-1.5">
                  <span>[ZONE 3] LONG RECTANGULAR REACTION STRIP</span>
                  <span className="text-gray-400">Aspect ~ 4:1</span>
                </div>
                <div className="h-8 rounded-lg bg-gray-900 border border-amber-900 flex items-center overflow-hidden p-0.5">
                  <div className="w-1/4 h-full bg-gray-300 flex items-center justify-center text-[7px] text-gray-900 font-bold font-mono">BASE</div>
                  <div className="w-3/4 h-full bg-gradient-to-r from-amber-600 to-purple-900 flex items-center justify-center text-[8px] text-white font-bold font-mono">
                    ━━━━ REACTED CHEMICAL STRIP ━━━━
                  </div>
                </div>
              </div>

              {/* Zone 4: Expiry Indicator */}
              <div 
                onClick={() => setActiveZone(3)}
                className={`p-2 rounded-xl border transition cursor-pointer flex items-center justify-between ${activeZone === 3 ? 'border-emerald-400 bg-emerald-950/30 shadow-lg shadow-emerald-500/10' : 'border-gray-700 bg-gray-900/50 hover:border-gray-600'}`}
              >
                <div className="text-[8px] font-mono text-emerald-400 font-bold">[ZONE 4] EXPIRY INDICATOR</div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-[8px] text-black font-black">✓</div>
                  <span className="text-[10px] font-bold text-white font-mono">ACTIVE (VALID)</span>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-figma-textMuted text-center mt-4">
              Click any zone above to inspect its optical/chemical function
            </p>
          </div>

          {/* Zone Details Selector */}
          <div className="lg:col-span-6 space-y-3">
            {badgeZones.map((zone, idx) => (
              <div
                key={idx}
                onClick={() => setActiveZone(idx)}
                className={`p-5 rounded-2xl border transition cursor-pointer ${activeZone === idx ? `bg-figma-card ${zone.color} shadow-lg` : 'bg-figma-card/50 border-figma-border/70 hover:border-figma-border'}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-bold text-white font-mono">{zone.title}</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/5 text-figma-textSecondary border border-white/10">
                    {zone.tag}
                  </span>
                </div>
                <p className="text-xs text-cyan-300 mb-2 font-medium">{zone.role}</p>
                <p className="text-xs text-figma-textSecondary leading-relaxed">
                  {zone.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Occupational Health & Safety Reference Section */}
      <section className="px-6 py-16 max-w-7xl mx-auto border-t border-figma-border/60">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/50 border border-red-500/40 text-red-300 text-xs font-mono font-bold mb-3">
            <HeartPulse className="w-3.5 h-3.5" />
            <span>Industrial Hygiene Intelligence</span>
          </div>
          <h2 className="text-3xl font-black text-white font-mono uppercase">Occupational Health Reference Guide</h2>
          <p className="text-sm text-figma-textSecondary mt-2">
            Standard airborne concentration benchmarks and physiological impacts. Concentration and duration both govern toxicological response.
          </p>
        </div>

        {/* Health Reference Table */}
        <div className="rounded-2xl border border-figma-border bg-figma-card overflow-hidden shadow-xl mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-black/60 border-b border-figma-border text-gray-300 uppercase text-[10px]">
                <tr>
                  <th className="p-3.5">Airborne H₂S</th>
                  <th className="p-3.5">Benchmark</th>
                  <th className="p-3.5">Occupational & Health Significance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-figma-border/40 text-figma-textSecondary">
                {healthThresholds.map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition">
                    <td className="p-3.5 font-bold text-white whitespace-nowrap">{row.range}</td>
                    <td className="p-3.5 text-cyan-300 whitespace-nowrap">{row.severity}</td>
                    <td className="p-3.5 leading-relaxed">{row.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Odor Warning Callout Banner */}
        <div className="p-4 rounded-2xl bg-amber-950/40 border-2 border-amber-500/50 text-amber-200 text-xs font-mono flex items-start gap-3">
          <AlertOctagon className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-amber-300 uppercase tracking-wide">Critical Safety Note — Olfactory Fatigue</div>
            <p className="text-amber-200/90 leading-relaxed">
              Do not rely on the rotten-egg odor of H₂S as a safety indicator. The sense of smell can rapidly fatigue at elevated exposure, creating a false perception of safety.
            </p>
          </div>
        </div>

        {/* Prototype Status / Limitations Disclosure Accordion */}
        <div className="mt-8 p-6 rounded-2xl bg-figma-card/80 border border-figma-border">
          <button
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            className="w-full flex items-center justify-between text-left text-xs font-mono font-bold text-cyan-400"
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4" />
              <span>PROTOTYPE STATUS & SCIENTIFIC LIMITATIONS DISCLOSURE</span>
            </div>
            {showTechnicalDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showTechnicalDetails && (
            <div className="mt-4 pt-4 border-t border-figma-border text-xs text-figma-textSecondary space-y-3">
              <p>
                <strong className="text-white">Calibration Version:</strong> Currently operating on model <code className="text-cyan-400 font-mono">CAL-v0.1-demo</code>. Quantitative dosimetric values in demo mode are computed using deterministic kinetic formulations.
              </p>
              <p>
                <strong className="text-white">Physical Validation:</strong> Full industrial regulatory deployment requires multi-point gas-chamber exposure testing with calibrated gas concentrations (0.25 to 15.0 ppm) across varying humidity and temperature profiles.
              </p>
              <p>
                <strong className="text-white">Device Classification:</strong> H2Sentry is a passive cumulative exposure dosimeter system. It is <strong className="text-white">NOT</strong> an instantaneous real-time detector, not a replacement for mandatory real-time electronic alarms, and not a medical diagnostic device.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Call to Action Footer */}
      <footer className="px-6 py-12 max-w-7xl mx-auto border-t border-figma-border/60 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <div className="text-sm font-bold text-white font-mono">H2Sentry — Passive Exposure Intelligence</div>
          <p className="text-xs text-figma-textMuted">
            SIH 2026 Problem Statement SIH26118 | Mangalore Refinery and Petrochemicals Limited (MRPL)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onLaunchWorker}
            className="px-5 py-2.5 rounded-xl bg-cyan-400 text-black text-xs font-bold hover:bg-cyan-300 transition shadow-md shadow-cyan-500/20 uppercase tracking-wider"
          >
            Open Worker Demo
          </button>
          <button
            onClick={onLaunchSupervisor}
            className="px-5 py-2.5 rounded-xl bg-figma-card hover:bg-figma-cardHover border border-figma-border text-xs font-semibold text-white transition"
          >
            Supervisor View
          </button>
        </div>
      </footer>
    </div>
  );
};
