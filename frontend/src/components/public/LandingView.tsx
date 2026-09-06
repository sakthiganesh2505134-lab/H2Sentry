import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Cpu, 
  Activity, 
  Database, 
  ArrowRight, 
  AlertTriangle, 
  Camera, 
  QrCode, 
  Sun, 
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp
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
      title: "1. Unique QR / DataMatrix",
      role: "Identity Layer (WHO / WHICH BADGE)",
      description: "Encodes only the unique Badge ID (e.g. H2S-BDG-000001). Backend resolves the worker, employee ID, plant unit, shift, and issue/expiry timestamps without exposing sensitive worker PII inside the QR.",
      tag: "Identity Bridge",
      color: "border-figma-accent text-figma-accent"
    },
    {
      title: "2. Printed Reference Colour Scale",
      role: "Lighting Normalization Layer (OPTICAL CORRECTION)",
      description: "Six calibrated reference patches (White, Light Gray, Mid Gray, Dark Gray, Cyan, Amber) normalize for ambient lux, white balance shifts, and smartphone sensor variations before measuring chemical reaction.",
      tag: "Lighting Calibration",
      color: "border-sky-400 text-sky-400"
    },
    {
      title: "3. H2S Reaction Chemical Strip",
      role: "Exposure Sensing Layer (WHAT EXPOSURE OCCURRED)",
      description: "Porous metal-salt composite matrix undergoes irreversible proportional darkening upon passive diffusion of H2S gas over time. The chemical response records cumulative exposure dose.",
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

  const workflowSteps = [
    {
      num: "01",
      title: "WEAR",
      desc: "Worker clips the lightweight passive dosimeter badge to lapel or wristband during shift."
    },
    {
      num: "02",
      title: "SCAN",
      desc: "Smartphone camera captures badge QR to instantly verify identity and shift assignment."
    },
    {
      num: "03",
      title: "ANALYZE",
      desc: "Computer vision detects reference scale and normalizes lighting variations automatically."
    },
    {
      num: "04",
      title: "UNDERSTAND",
      desc: "Kinetic model computes estimated cumulative dose (ppm·min) with explainable confidence."
    },
    {
      num: "05",
      title: "RECORD",
      desc: "Reading is digitally committed to the worker's shift dossier for organizational monitoring."
    }
  ];

  return (
    <div className="w-full min-h-screen bg-figma-bg text-figma-textPrimary">
      {/* Top Brand Navigation Bar */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-figma-bg/85 border-b border-figma-border/60 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-figma-accent to-blue-600 flex items-center justify-center shadow-lg shadow-figma-accent/20">
              <ShieldCheck className="w-5 h-5 text-black stroke-[2.5]" />
            </div>
            <div>
              <div className="text-lg font-black tracking-wider text-white font-mono flex items-center gap-2">
                H2SENTRY
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-figma-accent/15 text-figma-accent border border-figma-accent/30">
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
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-figma-accent text-black hover:bg-figma-accent/90 shadow-md shadow-figma-accent/25 transition active:scale-95"
            >
              <Camera className="w-4 h-4" />
              Try Mobile Worker App
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-6 pt-16 pb-20 max-w-7xl mx-auto overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-figma-accent/10 blur-[130px] rounded-full pointer-events-none" />
        <div className="absolute top-40 right-10 w-[300px] h-[300px] bg-blue-600/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="text-center max-w-3xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-figma-card border border-figma-border/80 text-xs font-medium text-figma-accent mb-6 shadow-inner">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Industrial Cumulative Exposure Dosimetry</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1] mb-6 font-mono">
            Passive Chemical Sensing Meets Optical Computer Vision
          </h1>

          <p className="text-base sm:text-lg text-figma-textSecondary leading-relaxed mb-8">
            <span className="text-white font-medium">H2Sentry</span> is a passive cumulative H2S exposure dosimeter system that combines a disposable colorimetric badge with smartphone computer vision to estimate cumulative exposure and digitally record the result against the worker, badge, and shift.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onLaunchWorker}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-figma-accent text-black font-bold text-sm hover:bg-figma-accent/90 shadow-xl shadow-figma-accent/25 transition transform active:scale-95 flex items-center justify-center gap-3"
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
              1-Click Deterministic Benchmark Scenarios:
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
                  className="text-xs px-3 py-1.5 rounded-lg bg-figma-card hover:bg-figma-accent/15 hover:border-figma-accent/40 border border-figma-border text-figma-textSecondary hover:text-white transition"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* The Problem vs The Solution */}
      <section className="px-6 py-16 max-w-7xl mx-auto border-t border-figma-border/60">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* The Problem */}
          <div className="p-8 rounded-3xl bg-red-950/10 border border-red-900/30">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-white mb-3 font-mono">The Occupational Problem</h2>
            <p className="text-sm text-figma-textSecondary leading-relaxed mb-4">
              Workers in oil, gas, and refining operations frequently encounter low-level cumulative H2S exposure. Traditional electronic detectors provide instant threshold alarms, but do not record chronic sub-alarm exposure over 8-hour shifts.
            </p>
            <p className="text-sm text-figma-textSecondary leading-relaxed">
              Passive chemical dosimeters can accumulate exposure, but traditionally rely on subjective human visual matching under variable lighting conditions — creating unrecorded exposure gaps.
            </p>
          </div>

          {/* The Solution */}
          <div className="p-8 rounded-3xl bg-cyan-950/10 border border-cyan-800/30">
            <div className="w-10 h-10 rounded-xl bg-figma-accent/10 border border-figma-accent/30 flex items-center justify-center text-figma-accent mb-5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-white mb-3 font-mono">The H2Sentry Solution</h2>
            <p className="text-sm text-figma-textSecondary leading-relaxed mb-4">
              H2Sentry unites low-cost disposable chemical dosimetry with smartphone optical reading. Printed reference color patches normalize ambient lighting, and deterministic kinetic models estimate cumulative exposure dose (ppm·min).
            </p>
            <p className="text-sm text-figma-textSecondary leading-relaxed">
              Every scan automatically binds the dosimeter to the worker, badge ID, shift, and unit in a digital occupational exposure dossier.
            </p>
          </div>
        </div>
      </section>

      {/* 5-Step Visual Workflow */}
      <section id="how-it-works" className="px-6 py-16 max-w-7xl mx-auto border-t border-figma-border/60">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-xs font-mono uppercase tracking-widest text-figma-accent mb-2">Core Workflow</p>
          <h2 className="text-3xl font-black text-white font-mono">5-Step Dosimetry Journey</h2>
          <p className="text-sm text-figma-textSecondary mt-2">
            From physical wear to digital occupational record
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {workflowSteps.map((step, idx) => (
            <div 
              key={idx} 
              className="p-6 rounded-2xl bg-figma-card border border-figma-border hover:border-figma-accent/40 transition relative group"
            >
              <div className="text-xs font-mono text-figma-accent font-black tracking-widest mb-3">
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

      {/* Physical Badge 4-Zone Anatomy Interactive Diagram */}
      <section className="px-6 py-16 max-w-7xl mx-auto border-t border-figma-border/60">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-xs font-mono uppercase tracking-widest text-figma-accent mb-2">Hardware Architecture</p>
          <h2 className="text-3xl font-black text-white font-mono">Physical Badge Anatomy</h2>
          <p className="text-sm text-figma-textSecondary mt-2">
            The disposable dosimeter integrates 4 distinct operational zones
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Interactive Badge Concept Render */}
          <div className="lg:col-span-6 p-6 rounded-3xl bg-figma-card border border-figma-border relative overflow-hidden">
            <div className="p-4 rounded-2xl bg-[#1e2329] border border-gray-700 font-sans shadow-2xl">
              {/* Badge Header */}
              <div className="flex items-center justify-between border-b border-gray-700 pb-3 mb-4">
                <div>
                  <div className="text-[10px] font-mono uppercase text-gray-400">MRPL OCCUPATIONAL SAFETY</div>
                  <div className="text-xs font-black text-white tracking-wider">H2SENTRY DOSIMETER</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-mono text-cyan-400">ID: H2S-BDG-000001</div>
                  <div className="text-[9px] text-gray-400">Pb(OAc)2-MATRIX</div>
                </div>
              </div>

              {/* Zone 1: Reference Scale */}
              <div 
                onClick={() => setActiveZone(1)}
                className={`p-2.5 rounded-xl border transition cursor-pointer mb-3 ${activeZone === 1 ? 'border-sky-400 bg-sky-950/20 shadow-lg shadow-sky-500/10' : 'border-gray-700 bg-gray-900/50 hover:border-gray-600'}`}
              >
                <div className="flex items-center justify-between text-[9px] font-mono text-gray-400 mb-1.5">
                  <span className="font-bold text-sky-400">[ZONE 2] REFERENCE COLOUR SCALE</span>
                  <span>6 PATCHES</span>
                </div>
                <div className="grid grid-cols-6 gap-1 h-6">
                  <div className="bg-[#f5f5f5] rounded-sm flex items-center justify-center text-[8px] text-black font-bold">W</div>
                  <div className="bg-[#b4b4b4] rounded-sm flex items-center justify-center text-[8px] text-black font-bold">LG</div>
                  <div className="bg-[#787878] rounded-sm flex items-center justify-center text-[8px] text-white font-bold">MG</div>
                  <div className="bg-[#323232] rounded-sm flex items-center justify-center text-[8px] text-white font-bold">DG</div>
                  <div className="bg-[#1eb4d2] rounded-sm flex items-center justify-center text-[8px] text-black font-bold">CY</div>
                  <div className="bg-[#dc8c1e] rounded-sm flex items-center justify-center text-[8px] text-black font-bold">AM</div>
                </div>
              </div>

              {/* Lower Section: Strip + Expiry + QR */}
              <div className="grid grid-cols-12 gap-3">
                {/* Zone 2: Reaction Strip */}
                <div 
                  onClick={() => setActiveZone(2)}
                  className={`col-span-7 p-3 rounded-xl border transition cursor-pointer ${activeZone === 2 ? 'border-amber-400 bg-amber-950/20 shadow-lg shadow-amber-500/10' : 'border-gray-700 bg-gray-900/50 hover:border-gray-600'}`}
                >
                  <div className="text-[9px] font-mono text-amber-400 font-bold mb-1.5">[ZONE 3] H2S STRIP</div>
                  <div className="h-16 rounded-lg bg-[#a07841] border border-amber-900 flex flex-col items-center justify-center p-2 text-center">
                    <span className="text-[10px] font-black text-black">H2S ACTIVE ZONE</span>
                    <span className="text-[8px] text-black/80 font-mono">COLOR KINETICS</span>
                  </div>
                </div>

                {/* Right: Expiry + QR */}
                <div className="col-span-5 flex flex-col gap-2">
                  {/* Zone 3: Expiry */}
                  <div 
                    onClick={() => setActiveZone(3)}
                    className={`p-2 rounded-xl border transition cursor-pointer ${activeZone === 3 ? 'border-emerald-400 bg-emerald-950/20 shadow-lg shadow-emerald-500/10' : 'border-gray-700 bg-gray-900/50 hover:border-gray-600'}`}
                  >
                    <div className="text-[8px] font-mono text-emerald-400 font-bold mb-1">[ZONE 4] EXPIRY</div>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-[8px] text-black font-black">✓</div>
                      <span className="text-[10px] font-bold text-white">VALID</span>
                    </div>
                  </div>

                  {/* Zone 0: QR Identity */}
                  <div 
                    onClick={() => setActiveZone(0)}
                    className={`p-2 rounded-xl border transition cursor-pointer flex-1 flex flex-col justify-center ${activeZone === 0 ? 'border-figma-accent bg-cyan-950/20 shadow-lg shadow-cyan-500/10' : 'border-gray-700 bg-gray-900/50 hover:border-gray-600'}`}
                  >
                    <div className="flex items-center justify-between text-[8px] font-mono text-figma-accent font-bold mb-1">
                      <span>[ZONE 1] QR</span>
                      <QrCode className="w-3 h-3 text-figma-accent" />
                    </div>
                    <div className="text-[9px] font-mono text-gray-300">H2S-BDG-000001</div>
                  </div>
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
                <p className="text-xs text-figma-accent mb-2 font-medium">{zone.role}</p>
                <p className="text-xs text-figma-textSecondary leading-relaxed">
                  {zone.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology & Calibration Science */}
      <section className="px-6 py-16 max-w-7xl mx-auto border-t border-figma-border/60">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-xs font-mono uppercase tracking-widest text-figma-accent mb-2">Scientific Transparency</p>
          <h2 className="text-3xl font-black text-white font-mono">No "AI Magic". Real Optics & Kinetics.</h2>
          <p className="text-sm text-figma-textSecondary mt-2">
            Transparent color science, lighting transformation, and diffusion kinetics
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-figma-card border border-figma-border">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-4">
              <Sun className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-2 font-mono">Reference Calibration</h3>
            <p className="text-xs text-figma-textSecondary leading-relaxed">
              Detects observed RGB reflectance across 6 standard patches, calculating channel gains ($G_R, G_G, G_B$) to eliminate ambient color cast.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-figma-card border border-figma-border">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-2 font-mono">CIE L*a*b* Colour Science</h3>
            <p className="text-xs text-figma-textSecondary leading-relaxed">
              Measures perceptual lightness ($L^*$) and total color difference ($\Delta E$) to decouple darkening kinetics from phone sensor luminance shifts.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-figma-card border border-figma-border">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-2 font-mono">Diffusion-Reaction Model</h3>
            <p className="text-xs text-figma-textSecondary leading-relaxed">
              Inverts substrate reaction kinetics ($k=850.0$) to estimate cumulative exposure dose ($ppm \cdot min$) and equivalent 8-hour TWA ($ppm$).
            </p>
          </div>
        </div>

        {/* Prototype Status / Limitations Disclosure Accordion */}
        <div className="mt-8 p-6 rounded-2xl bg-figma-card/80 border border-figma-border">
          <button
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            className="w-full flex items-center justify-between text-left text-xs font-mono font-bold text-figma-accent"
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
                <strong className="text-white">Calibration Version:</strong> Currently operating on model <code className="text-figma-accent font-mono">CAL-v0.1-demo</code>. Quantitative dosimetric values in demo mode are computed using deterministic kinetic formulations.
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
            className="px-5 py-2.5 rounded-xl bg-figma-accent text-black text-xs font-bold hover:bg-figma-accent/90 transition shadow-md shadow-figma-accent/20"
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
