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
      color: "border-sky-300 bg-sky-50 text-sky-900"
    },
    {
      title: "2. Printed Reference Colour Scale",
      role: "Lighting Normalization Layer (OPTICAL CORRECTION)",
      description: "Nine calibrated reference patches normalize for ambient lux, white balance shifts, and smartphone sensor variations before measuring chemical reaction.",
      tag: "Lighting Calibration",
      color: "border-sky-300 bg-sky-50 text-sky-900"
    },
    {
      title: "3. Long Rectangular Reaction Strip",
      role: "Exposure Sensing Layer (WHAT EXPOSURE OCCURRED)",
      description: "Porous metal-salt composite matrix undergoes irreversible proportional darkening upon passive diffusion of H2S gas over time. The chemical response records cumulative exposure dose (ppm·min).",
      tag: "Passive Dosimetry",
      color: "border-amber-300 bg-amber-50 text-amber-900"
    },
    {
      title: "4. Expiry / Shelf-Life Indicator",
      role: "Integrity Layer (IS BADGE STILL VALID)",
      description: "Separate sealed chemical indicator transitions from green (valid) to amber (expiring soon) to red (expired), ensuring stale or oxidized badges are flagged before recording occupational dose.",
      tag: "Reagent Validity",
      color: "border-emerald-300 bg-emerald-50 text-emerald-900"
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
    <div className="w-full min-h-screen bg-slate-50 text-slate-900 select-none">
      {/* Top Brand Navigation Bar */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/90 border-b border-slate-200 px-6 py-4 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shadow-md shadow-slate-900/10">
              <ShieldCheck className="w-5 h-5 text-sky-400 stroke-[2.5]" />
            </div>
            <div>
              <div className="text-lg font-black tracking-tight text-slate-900 font-mono flex items-center gap-2">
                H2SENTRY
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                  CAL-v0.1-demo
                </span>
              </div>
              <p className="text-[11px] text-slate-500 tracking-wider">
                PASSIVE EXPOSURE INTELLIGENCE
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onLaunchSupervisor}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 border border-slate-200 transition text-slate-700 shadow-xs"
            >
              <Database className="w-3.5 h-3.5 text-slate-500" />
              Supervisor Portal
            </button>
            <button
              onClick={onLaunchWorker}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 shadow-md shadow-slate-900/10 transition active:scale-95 uppercase tracking-wider"
            >
              <Camera className="w-4 h-4 text-sky-400" />
              Try Mobile Worker App
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-6 pt-14 pb-16 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-medium text-sky-700 mb-6 shadow-xs font-mono">
            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
            <span>Industrial Cumulative Exposure Dosimetry</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.15] mb-6 font-mono">
            Passive Chemical Sensing Meets Optical Computer Vision
          </h1>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed mb-8">
            <span className="text-slate-900 font-semibold">H2Sentry</span> is a passive cumulative H₂S exposure dosimeter system that combines a disposable colorimetric badge with smartphone computer vision to estimate cumulative exposure dose (<strong className="text-slate-900">ppm·min</strong>) and digitally record the result against the worker, badge, and shift.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onLaunchWorker}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 shadow-md shadow-slate-900/10 transition transform active:scale-95 flex items-center justify-center gap-2.5 uppercase tracking-wider"
            >
              <Camera className="w-4 h-4 text-sky-400 stroke-[2.5]" />
              Try Mobile Worker Scan
            </button>

            <button
              onClick={() => {
                const el = document.getElementById('how-it-works');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-700 transition flex items-center justify-center gap-2 shadow-xs"
            >
              How It Works
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Quick Benchmark Presets Pill Bar */}
          <div className="mt-10 pt-6 border-t border-slate-200 text-left">
            <p className="text-xs font-mono uppercase tracking-wider text-slate-500 mb-3 text-center font-semibold">
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
                  className="text-xs px-3 py-1.5 rounded-lg bg-white hover:bg-sky-50 hover:border-sky-300 border border-slate-200 text-slate-700 hover:text-sky-900 transition font-mono shadow-xs"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 5-Step Visual Workflow */}
      <section id="how-it-works" className="px-6 py-14 max-w-7xl mx-auto border-t border-slate-200">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-xs font-mono uppercase tracking-widest text-sky-700 mb-1 font-bold">Core Workflow</p>
          <h2 className="text-3xl font-black text-slate-900 font-sans tracking-tight">5-Step Dosimetry Journey</h2>
          <p className="text-sm text-slate-500 mt-1">
            From physical wear to digital occupational record
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {workflowSteps.map((step, idx) => (
            <div 
              key={idx} 
              className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-sky-300 transition relative shadow-xs group"
            >
              <div className="text-xs font-mono text-sky-700 font-black tracking-widest mb-2">
                {step.num}
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1.5 font-sans flex items-center justify-between">
                {step.title}
                {idx < 4 && <ArrowRight className="w-3.5 h-3.5 text-slate-300 hidden lg:block group-hover:translate-x-1 transition" />}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Physical Dosimeter Visual Schematic */}
      <section className="px-6 py-14 max-w-7xl mx-auto border-t border-slate-200">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-xs font-mono uppercase tracking-widest text-sky-700 mb-1 font-bold">Hardware Architecture</p>
          <h2 className="text-3xl font-black text-slate-900 font-sans tracking-tight">Physical Dosimeter Layout</h2>
          <p className="text-sm text-slate-500 mt-1">
            The physical card integrates 4 distinct operational zones
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Interactive Badge Concept Render */}
          <div className="lg:col-span-6 p-6 rounded-3xl bg-white border border-slate-200 relative overflow-hidden shadow-xs">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 font-sans shadow-xs space-y-3">
              {/* Badge Header: QR / Badge ID */}
              <div 
                onClick={() => setActiveZone(0)}
                className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${activeZone === 0 ? 'border-sky-500 bg-sky-50/70 shadow-xs' : 'border-slate-200 bg-white'}`}
              >
                <div>
                  <div className="text-[9px] font-mono text-sky-700 font-bold">[ZONE 1] QR / BADGE ID</div>
                  <div className="text-xs font-mono font-bold text-slate-900">H2S-BDG-2026-000381</div>
                </div>
                <QrCode className="w-5 h-5 text-sky-700" />
              </div>

              {/* Zone 2: Reference Color Scale */}
              <div 
                onClick={() => setActiveZone(1)}
                className={`p-2.5 rounded-xl border transition cursor-pointer ${activeZone === 1 ? 'border-sky-500 bg-sky-50/70 shadow-xs' : 'border-slate-200 bg-white hover:border-slate-300'}`}
              >
                <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 mb-1.5 font-semibold">
                  <span className="font-bold text-sky-700">[ZONE 2] REFERENCE COLOR SCALE</span>
                  <span>7 PATCHES</span>
                </div>
                <div className="grid grid-cols-7 gap-1 h-6">
                  {['0', '50', '100', '200', '400', '800', '1600'].map((val, i) => (
                    <div key={val} className="rounded-sm flex items-center justify-center text-[7px] text-slate-900 font-bold font-mono" style={{ backgroundColor: ['#dcd6c0', '#d8cd7a', '#caa357', '#c18f65', '#ad7475', '#906d7f', '#6e4a5d'][i] }}>
                      {val}
                    </div>
                  ))}
                </div>
              </div>

              {/* Zone 3: Long Rectangular Reaction Strip */}
              <div 
                onClick={() => setActiveZone(2)}
                className={`p-3 rounded-xl border transition cursor-pointer ${activeZone === 2 ? 'border-amber-500 bg-amber-50/70 shadow-xs' : 'border-slate-200 bg-white hover:border-slate-300'}`}
              >
                <div className="flex items-center justify-between text-[9px] font-mono text-amber-700 font-bold mb-1.5">
                  <span>[ZONE 3] LONG RECTANGULAR REACTION STRIP</span>
                  <span className="text-slate-400 font-normal">Aspect ~ 4:1</span>
                </div>
                <div className="h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center overflow-hidden p-0.5">
                  <div className="w-1/4 h-full bg-slate-200 flex items-center justify-center text-[7px] text-slate-900 font-bold font-mono">BASE</div>
                  <div className="w-3/4 h-full bg-gradient-to-r from-amber-600 to-amber-900 flex items-center justify-center text-[8px] text-white font-bold font-mono">
                    ━━━━ REACTED CHEMICAL STRIP ━━━━
                  </div>
                </div>
              </div>

              {/* Zone 4: Expiry Indicator */}
              <div 
                onClick={() => setActiveZone(3)}
                className={`p-2 rounded-xl border transition cursor-pointer flex items-center justify-between ${activeZone === 3 ? 'border-emerald-500 bg-emerald-50/70 shadow-xs' : 'border-slate-200 bg-white hover:border-slate-300'}`}
              >
                <div className="text-[8px] font-mono text-emerald-700 font-bold">[ZONE 4] EXPIRY INDICATOR</div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-[8px] text-white font-black">✓</div>
                  <span className="text-[10px] font-bold text-slate-900 font-mono">ACTIVE (VALID)</span>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 text-center mt-3 font-sans">
              Click any zone above to inspect its optical/chemical function
            </p>
          </div>

          {/* Zone Details Selector */}
          <div className="lg:col-span-6 space-y-3">
            {badgeZones.map((zone, idx) => (
              <div
                key={idx}
                onClick={() => setActiveZone(idx)}
                className={`p-4 rounded-2xl border transition cursor-pointer ${activeZone === idx ? `${zone.color} shadow-xs` : 'bg-white border-slate-200 hover:border-slate-300'}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-bold text-slate-900 font-sans">{zone.title}</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 font-semibold shadow-xs">
                    {zone.tag}
                  </span>
                </div>
                <p className="text-xs text-sky-700 mb-1 font-semibold">{zone.role}</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {zone.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Occupational Health & Safety Reference Section */}
      <section className="px-6 py-14 max-w-7xl mx-auto border-t border-slate-200">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-mono font-bold mb-2">
            <HeartPulse className="w-3.5 h-3.5" />
            <span>Industrial Hygiene Intelligence</span>
          </div>
          <h2 className="text-3xl font-black text-slate-900 font-sans tracking-tight">Occupational Health Reference Guide</h2>
          <p className="text-sm text-slate-500 mt-1">
            Standard airborne concentration benchmarks and physiological impacts.
          </p>
        </div>

        {/* Health Reference Table */}
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-mono">
                <tr>
                  <th className="p-3.5">Airborne H₂S</th>
                  <th className="p-3.5">Benchmark</th>
                  <th className="p-3.5">Occupational & Health Significance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {healthThresholds.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition">
                    <td className="p-3.5 font-bold font-mono text-slate-900 whitespace-nowrap">{row.range}</td>
                    <td className="p-3.5 text-sky-700 font-semibold whitespace-nowrap">{row.severity}</td>
                    <td className="p-3.5 leading-relaxed text-slate-600">{row.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Odor Warning Callout Banner */}
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
          <AlertOctagon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-bold text-amber-800 uppercase tracking-wide font-mono">Critical Safety Note — Olfactory Fatigue</div>
            <p className="text-amber-800/90 leading-relaxed font-sans">
              Do not rely on the rotten-egg odor of H₂S as a safety indicator. The sense of smell can rapidly fatigue at elevated exposure, creating a false perception of safety.
            </p>
          </div>
        </div>

        {/* Prototype Status / Limitations Disclosure Accordion */}
        <div className="mt-6 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <button
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            className="w-full flex items-center justify-between text-left text-xs font-mono font-bold text-sky-700"
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4" />
              <span>PROTOTYPE STATUS & SCIENTIFIC LIMITATIONS DISCLOSURE</span>
            </div>
            {showTechnicalDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showTechnicalDetails && (
            <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-2">
              <p>
                <strong className="text-slate-900">Calibration Version:</strong> Currently operating on model <code className="text-sky-700 font-mono font-bold">CAL-v0.1-demo</code>. Quantitative dosimetric values in demo mode are computed using deterministic kinetic formulations.
              </p>
              <p>
                <strong className="text-slate-900">Physical Validation:</strong> Full industrial regulatory deployment requires multi-point gas-chamber exposure testing with calibrated gas concentrations (0.25 to 15.0 ppm) across varying humidity and temperature profiles.
              </p>
              <p>
                <strong className="text-slate-900">Device Classification:</strong> H2Sentry is a passive cumulative exposure dosimeter system. It is <strong className="text-slate-900">NOT</strong> an instantaneous real-time detector, not a replacement for mandatory real-time electronic alarms, and not a medical diagnostic device.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Call to Action Footer */}
      <footer className="px-6 py-10 max-w-7xl mx-auto border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="text-sm font-bold text-slate-900 font-mono">H2Sentry — Passive Exposure Intelligence</div>
          <p className="text-xs text-slate-500">
            SIH 2026 Problem Statement SIH26118 | Mangalore Refinery and Petrochemicals Limited (MRPL)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onLaunchWorker}
            className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition shadow-xs uppercase tracking-wider"
          >
            Open Worker Demo
          </button>
          <button
            onClick={onLaunchSupervisor}
            className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 transition shadow-xs"
          >
            Supervisor View
          </button>
        </div>
      </footer>
    </div>
  );
};
