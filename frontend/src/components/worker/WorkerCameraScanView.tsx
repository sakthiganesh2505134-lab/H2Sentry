import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, 
  Camera, 
  Upload, 
  Sparkles, 
  RotateCcw, 
  Lock, 
  Cpu, 
  ChevronDown, 
  ChevronUp, 
  XCircle,
  CheckCircle2,
  AlertCircle,
  Sun,
  Focus,
  Layers
} from 'lucide-react';
import type { DemoBadgeItem, CVAnalyzeResponse, Worker } from '../../types';
import { analyzeBadgeImage } from '../../services/api';
import { 
  startDeviceCamera, 
  stopDeviceStream, 
  captureFrameFromVideo, 
  checkCameraSupport,
  type CameraDiagnostics
} from '../../services/camera';

interface WorkerCameraScanViewProps {
  currentWorker: Worker | null;
  demoBadges: DemoBadgeItem[];
  onBack: () => void;
  onScanComplete: (result: CVAnalyzeResponse, rawImageSrc?: string) => void;
  initialPresetId?: string | null;
  verifiedBadgeId?: string | null;
}

type ExposureScanState = 
  | 'EXPOSURE_SCAN'    // Live measurement camera with colorimetric framing guide
  | 'ANALYZING'        // Transmitting frame & running OpenCV
  | 'SCAN_REJECTED'    // Reference scale / strip missing or image unreadable
  | 'ANALYSIS_FAILED'  // Network or server exception
  | 'CAMERA_ERROR';    // Hardware or permission failure

interface LiveOpticalQuality {
  status: 'ready' | 'positioning' | 'poor_light' | 'glare' | 'motion_blur';
  message: string;
  brightness: number;
  sharpness: number;
}

// 7-Patch Standard Exposure Reference Scale Palette
const REFERENCE_SWATCH_PALETTE = [
  { ppm: '0', rgb: '#dcd6c0', label: '0' },
  { ppm: '50', rgb: '#d8cd7a', label: '50' },
  { ppm: '100', rgb: '#caa357', label: '100' },
  { ppm: '200', rgb: '#c18f65', label: '200' },
  { ppm: '400', rgb: '#ad7475', label: '400' },
  { ppm: '800', rgb: '#906d7f', label: '800' },
  { ppm: '1600', rgb: '#6e4a5d', label: '1600' },
];

export const WorkerCameraScanView: React.FC<WorkerCameraScanViewProps> = ({
  currentWorker,
  demoBadges,
  onBack,
  onScanComplete,
  initialPresetId,
  verifiedBadgeId,
}) => {
  const [scanState, setScanState] = useState<ExposureScanState>('EXPOSURE_SCAN');
  const [cameraLoading, setCameraLoading] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<CameraDiagnostics | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);

  // Live Optical Measurement Quality Feedback
  const [liveQuality, setLiveQuality] = useState<LiveOpticalQuality>({
    status: 'positioning',
    message: 'Place both reaction strip and reference scale inside the frame',
    brightness: 128,
    sharpness: 25,
  });

  // Captured Image & Rejection State
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  // Fallback / Benchmark Mode (only if requested or camera unavailable)
  const [useFallbackMode, setUseFallbackMode] = useState<boolean>(false);
  const [activePreset] = useState<DemoBadgeItem | null>(() => {
    if (initialPresetId) {
      const found = demoBadges.find((b) => b.id === initialPresetId);
      if (found) return found;
    }
    return demoBadges[0] || null;
  });
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [customImageSrc, setCustomImageSrc] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const evaluatorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const evaluatorIntervalRef = useRef<number | null>(null);

  const activeBadgeCode = verifiedBadgeId || currentWorker?.active_badge_id || 'H2S-BDG-2026-000381';

  // Cleanup helper
  const cleanupStream = useCallback(() => {
    if (evaluatorIntervalRef.current) {
      clearInterval(evaluatorIntervalRef.current);
      evaluatorIntervalRef.current = null;
    }
    if (streamRef.current) {
      stopDeviceStream(streamRef.current);
      streamRef.current = null;
    }
  }, []);

  // Initialize Real Hardware Camera
  const initCamera = useCallback(async () => {
    setCameraLoading(true);
    setCameraError(null);
    setScanState('EXPOSURE_SCAN');
    setCapturedPreview(null);
    setRejectionReason(null);
    cleanupStream();

    const support = checkCameraSupport();
    if (!support.supported) {
      setCameraError(support.reason || 'Camera access is unavailable.');
      setScanState('CAMERA_ERROR');
      setCameraLoading(false);
      return;
    }

    const res = await startDeviceCamera('environment');
    setDiagnostics(res.diagnostics);

    if (res.error || !res.stream) {
      setCameraError(res.error || 'Failed to start camera.');
      setScanState('CAMERA_ERROR');
      setCameraLoading(false);
      return;
    }

    streamRef.current = res.stream;
    if (videoRef.current) {
      videoRef.current.srcObject = res.stream;
      videoRef.current.setAttribute('playsinline', 'true');
      videoRef.current.setAttribute('muted', 'true');
      try {
        await videoRef.current.play();
      } catch (playErr) {
        console.warn('Video play error:', playErr);
      }
    }

    setCameraLoading(false);
  }, [cleanupStream]);

  // Mount & Unmount lifecycle
  useEffect(() => {
    if (!useFallbackMode) {
      initCamera();
    }
    return () => {
      cleanupStream();
    };
  }, [initCamera, cleanupStream, useFallbackMode]);

  // Live Optical Evaluator Loop (Runs on live video frames every 250ms)
  useEffect(() => {
    if (useFallbackMode || scanState !== 'EXPOSURE_SCAN') {
      if (evaluatorIntervalRef.current) {
        clearInterval(evaluatorIntervalRef.current);
        evaluatorIntervalRef.current = null;
      }
      return;
    }

    if (!evaluatorCanvasRef.current) {
      evaluatorCanvasRef.current = document.createElement('canvas');
      evaluatorCanvasRef.current.width = 160;
      evaluatorCanvasRef.current.height = 120;
    }

    const canvas = evaluatorCanvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    evaluatorIntervalRef.current = window.setInterval(() => {
      if (!videoRef.current || videoRef.current.readyState < 2 || !ctx) return;
      try {
        ctx.drawImage(videoRef.current, 0, 0, 160, 120);
        const imgData = ctx.getImageData(0, 0, 160, 120);
        const data = imgData.data;
        const totalPixels = 160 * 120;

        let sumBrightness = 0;
        let sumGradient = 0;

        for (let i = 0; i < data.length; i += 4) {
          const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          sumBrightness += lum;
        }

        const avgBrightness = sumBrightness / totalPixels;

        // Approximate gradient differences (sharpness / focus / motion blur)
        for (let y = 2; y < 118; y += 2) {
          for (let x = 2; x < 158; x += 2) {
            const idx = (y * 160 + x) * 4;
            const rightIdx = (y * 160 + (x + 2)) * 4;
            const downIdx = ((y + 2) * 160 + x) * 4;
            const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
            const lumRight = 0.299 * data[rightIdx] + 0.587 * data[rightIdx + 1] + 0.114 * data[rightIdx + 2];
            const lumDown = 0.299 * data[downIdx] + 0.587 * data[downIdx + 1] + 0.114 * data[downIdx + 2];
            sumGradient += Math.abs(lum - lumRight) + Math.abs(lum - lumDown);
          }
        }
        const avgSharpness = sumGradient / (78 * 58);

        if (avgBrightness < 45) {
          setLiveQuality({
            status: 'poor_light',
            message: 'Move to brighter, even lighting',
            brightness: Math.round(avgBrightness),
            sharpness: Math.round(avgSharpness),
          });
        } else if (avgBrightness > 228) {
          setLiveQuality({
            status: 'glare',
            message: 'Avoid direct glare / reflections',
            brightness: Math.round(avgBrightness),
            sharpness: Math.round(avgSharpness),
          });
        } else if (avgSharpness < 10) {
          setLiveQuality({
            status: 'motion_blur',
            message: 'Hold phone steady',
            brightness: Math.round(avgBrightness),
            sharpness: Math.round(avgSharpness),
          });
        } else {
          setLiveQuality({
            status: 'ready',
            message: 'Ready to capture exposure reading',
            brightness: Math.round(avgBrightness),
            sharpness: Math.round(avgSharpness),
          });
        }
      } catch {
        // Silent catch for canvas read errors
      }
    }, 250);

    return () => {
      if (evaluatorIntervalRef.current) {
        clearInterval(evaluatorIntervalRef.current);
        evaluatorIntervalRef.current = null;
      }
    };
  }, [useFallbackMode, scanState]);

  // Capture Measurement Photo & Run OpenCV Analysis Pipeline
  const handleCaptureAndAnalyze = async () => {
    if (scanState === 'ANALYZING') return; // Prevent duplicate submissions

    setScanState('ANALYZING');
    setRejectionReason(null);

    try {
      let res: CVAnalyzeResponse;
      let rawImageSrc: string | undefined = undefined;

      if (!useFallbackMode && videoRef.current) {
        // Freeze and capture measurement frame from live video feed
        const frame = captureFrameFromVideo(videoRef.current, 0.94);
        if (!frame || !frame.base64) {
          throw new Error('Failed to capture frame from camera stream.');
        }
        rawImageSrc = frame.base64;
        setCapturedPreview(frame.base64);

        res = await analyzeBadgeImage({
          imageBase64: frame.base64,
          temperatureC: 28.0,
          humidityPct: 65.0,
          stripAgeDays: 14.0,
          badgeIdHint: activeBadgeCode,
        });
      } else if (customFile) {
        rawImageSrc = customImageSrc || undefined;
        setCapturedPreview(customImageSrc);
        res = await analyzeBadgeImage({
          file: customFile,
          temperatureC: 28.0,
          humidityPct: 65.0,
          stripAgeDays: 14.0,
          badgeIdHint: activeBadgeCode,
        });
      } else if (customImageSrc === '/fixtures/real_strip_reference_fixture.jpg') {
        rawImageSrc = customImageSrc;
        setCapturedPreview(customImageSrc);
        res = await analyzeBadgeImage({
          demoPresetId: 'real_test_fixture',
          temperatureC: 28.0,
          humidityPct: 65.0,
          stripAgeDays: 14.0,
          badgeIdHint: activeBadgeCode,
        });
      } else if (activePreset) {
        rawImageSrc = activePreset.image_url;
        setCapturedPreview(activePreset.image_url);
        res = await analyzeBadgeImage({
          demoPresetId: activePreset.id,
          temperatureC: 28.0,
          humidityPct: 65.0,
          stripAgeDays: 14.0,
          badgeIdHint: activeBadgeCode,
        });
      } else {
        throw new Error('No measurement image available. Please capture or upload a photograph.');
      }

      // Check if image quality was rejected by CV pipeline
      if (res.image_quality && !res.image_quality.valid) {
        const reasons = res.image_quality.issues.join(', ') || 'Poor lighting or blur.';
        setRejectionReason(`Image quality insufficient: ${reasons}. Make sure both the reference scale and H2S strip are clearly visible under even lighting.`);
        setScanState('SCAN_REJECTED');
        cleanupStream();
        return;
      }

      // Check if detection failed
      if (res.detections && !res.detections.success) {
        setRejectionReason(res.detections.error_message || 'Could not detect the reference color scale or chemical strip in the image.');
        setScanState('SCAN_REJECTED');
        cleanupStream();
        return;
      }

      cleanupStream();
      onScanComplete(res, rawImageSrc);
    } catch (err: any) {
      console.error('Scan analysis error:', err);
      const msg = err.message || 'Optical analysis could not process the image.';
      setRejectionReason(msg);
      if (msg.toLowerCase().includes('reference') || msg.toLowerCase().includes('strip') || msg.toLowerCase().includes('quality') || msg.toLowerCase().includes('detect')) {
        setScanState('SCAN_REJECTED');
      } else {
        setScanState('ANALYSIS_FAILED');
      }
      cleanupStream();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCustomFile(file);
      const url = URL.createObjectURL(file);
      setCustomImageSrc(url);
      setCapturedPreview(url);
      setUseFallbackMode(true);
      setScanState('EXPOSURE_SCAN');
      setRejectionReason(null);
      cleanupStream();
    }
  };

  const handleLoadTestFixture = async () => {
    setUseFallbackMode(true);
    setCustomImageSrc('/fixtures/real_strip_reference_fixture.jpg');
    setCapturedPreview('/fixtures/real_strip_reference_fixture.jpg');
    setScanState('EXPOSURE_SCAN');
    setRejectionReason(null);
    cleanupStream();

    try {
      const response = await fetch('/fixtures/real_strip_reference_fixture.jpg');
      const blob = await response.blob();
      const file = new File([blob], 'real_strip_reference_fixture.jpg', { type: 'image/jpeg' });
      setCustomFile(file);
    } catch (e) {
      console.warn('Could not fetch fixture blob directly, fallback preset active:', e);
    }
  };

  const isDev = import.meta.env.DEV || window.location.hostname === 'localhost';

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-figma-bg p-4 flex flex-col justify-between text-white select-none animate-fadeIn">
      {/* Top Navigation Header */}
      <div className="flex items-center justify-between pb-3 border-b border-figma-border/60">
        <button
          onClick={() => {
            cleanupStream();
            onBack();
          }}
          className="flex items-center space-x-1.5 text-xs text-figma-textMuted hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="text-right">
          <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block font-bold flex items-center justify-end gap-1">
            <Layers className="w-3 h-3" />
            COLORIMETRIC DOSIMETRY
          </span>
          <span className="text-xs font-mono text-gray-300">Badge: {activeBadgeCode}</span>
        </div>
      </div>

      {/* Screen Title & Colorimetric Guidance */}
      <div className="pt-2 pb-1 text-center">
        <h1 className="text-xl font-black text-white font-mono tracking-tight uppercase">
          READ EXPOSURE STRIP
        </h1>
        <p className="text-xs text-figma-textSecondary max-w-xs mx-auto mt-0.5">
          Place the used reaction strip beside the reference color scale.
        </p>
      </div>

      {/* Main Measurement Viewfinder / State Area */}
      <div className="my-auto py-1">
        {/* STATE: SCAN REJECTED (Missing Reference Scale / Strip / Unreadable) */}
        {scanState === 'SCAN_REJECTED' && (
          <div className="p-6 rounded-3xl bg-figma-card border-2 border-red-500/60 shadow-2xl text-center space-y-4 animate-fadeIn">
            <div className="w-14 h-14 rounded-2xl bg-red-950/80 border border-red-500/60 flex items-center justify-center text-red-400 mx-auto">
              <XCircle className="w-8 h-8 stroke-[2.2]" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg font-black text-white font-mono uppercase tracking-wide">
                SCAN COULD NOT BE READ
              </h2>
              <p className="text-xs text-red-200 font-medium leading-relaxed">
                {rejectionReason || 'Make sure both the reference scale and H2S reaction strip are positioned inside the frame.'}
              </p>
              <p className="text-xs text-figma-textSecondary leading-relaxed">
                The printed reference color scale is mandatory to calibrate ambient lighting and compute exposure dose.
              </p>
            </div>

            {/* Captured thumbnail preview if available */}
            {capturedPreview && (
              <div className="p-2 rounded-xl bg-black/60 border border-figma-border inline-block">
                <img
                  src={capturedPreview.startsWith('data:') ? capturedPreview : (capturedPreview.startsWith('/') ? capturedPreview : `data:image/jpeg;base64,${capturedPreview}`)}
                  alt="Captured Frame"
                  className="w-40 h-28 object-contain rounded-lg mx-auto bg-black"
                />
                <span className="text-[10px] font-mono text-figma-textMuted mt-1 block">Captured Measurement Frame</span>
              </div>
            )}

            <div className="pt-2 space-y-2">
              <button
                onClick={initCamera}
                className="w-full py-3.5 px-4 figma-button-primary text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 shadow-lg"
              >
                <RotateCcw className="w-4 h-4" />
                <span>RETAKE</span>
              </button>

              <button
                onClick={handleLoadTestFixture}
                className="w-full py-2.5 px-4 figma-button-secondary text-xs font-semibold flex items-center justify-center space-x-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Load Known-Good Test Fixture</span>
              </button>
            </div>
          </div>
        )}

        {/* STATE: ANALYSIS FAILED (Network or Server Exception) */}
        {scanState === 'ANALYSIS_FAILED' && (
          <div className="p-6 rounded-3xl bg-figma-card border-2 border-red-500/60 shadow-2xl text-center space-y-4 animate-fadeIn">
            <div className="w-14 h-14 rounded-2xl bg-red-950/80 border border-red-500/60 flex items-center justify-center text-red-400 mx-auto">
              <XCircle className="w-8 h-8 stroke-[2.2]" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg font-black text-white font-mono uppercase tracking-wide">
                ANALYSIS FAILED
              </h2>
              <p className="text-xs text-red-200 font-medium leading-relaxed">
                {rejectionReason || 'An error occurred while connecting to the CV dosimetry service.'}
              </p>
            </div>

            <div className="pt-2 space-y-2">
              <button
                onClick={() => {
                  setScanState('EXPOSURE_SCAN');
                  setRejectionReason(null);
                  if (!useFallbackMode) initCamera();
                }}
                className="w-full py-3.5 px-4 figma-button-primary text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 shadow-lg"
              >
                <RotateCcw className="w-4 h-4" />
                <span>TRY AGAIN</span>
              </button>
            </div>
          </div>
        )}

        {/* STATE: CAMERA ERROR / INSECURE CONTEXT */}
        {scanState === 'CAMERA_ERROR' && (
          <div className="p-6 rounded-3xl bg-figma-card border border-red-500/40 shadow-2xl text-center space-y-4 animate-fadeIn">
            <div className="w-14 h-14 rounded-2xl bg-red-950/80 border border-red-500/50 flex items-center justify-center text-red-400 mx-auto">
              <Lock className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white font-mono">Camera Not Available</h3>
              <p className="text-xs text-figma-textSecondary leading-relaxed">{cameraError}</p>
            </div>

            <div className="pt-2 space-y-2">
              <button
                onClick={initCamera}
                className="w-full py-3 px-4 figma-button-primary text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Try Again</span>
              </button>

              <button
                onClick={() => setUseFallbackMode(true)}
                className="w-full py-2.5 px-4 figma-button-secondary text-xs font-semibold"
              >
                <span>Use Sample Badges</span>
              </button>
            </div>
          </div>
        )}

        {/* STATE: EXPOSURE_SCAN & ANALYZING (Large Colorimetric Viewfinder) */}
        {(scanState === 'EXPOSURE_SCAN' || scanState === 'ANALYZING') && (
          <div className="relative w-full aspect-[3/4] max-h-[480px] rounded-3xl overflow-hidden bg-black border-2 border-figma-border shadow-2xl flex items-center justify-center">
            {useFallbackMode && (customImageSrc || activePreset) ? (
              /* Fallback / Upload / Test Fixture Preview */
              <div className="relative w-full h-full flex items-center justify-center bg-gray-950">
                <img
                  src={customImageSrc || (activePreset?.image_url.startsWith('data:') ? activePreset.image_url : `data:image/png;base64,${activePreset?.image_url}`)}
                  alt="Dosimeter Badge"
                  className="w-full h-full object-contain p-2"
                />
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/80 border border-cyan-400 text-[10px] font-mono text-cyan-300 font-bold">
                  {customImageSrc === '/fixtures/real_strip_reference_fixture.jpg' 
                    ? 'Known-Good Test Fixture' 
                    : (customFile ? 'Uploaded Photo' : `Sample: ${activePreset?.title}`)}
                </div>
              </div>
            ) : (
              /* Real Live Hardware Camera Viewfinder */
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover"
                />

                {/* Explicit Colorimetric Measurement Dual-Zone Overlay */}
                <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-between p-3.5 pointer-events-none">
                  {/* Top Live Image Quality Feedback Pill */}
                  <div className="w-full flex justify-center">
                    <div 
                      className={`px-3 py-1.5 rounded-full backdrop-blur-md border text-[11px] font-mono font-bold flex items-center space-x-1.5 transition-all duration-300 ${
                        liveQuality.status === 'ready'
                          ? 'bg-emerald-950/85 text-emerald-300 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.35)]'
                          : liveQuality.status === 'motion_blur'
                          ? 'bg-amber-950/85 text-amber-300 border-amber-500/60'
                          : liveQuality.status === 'poor_light' || liveQuality.status === 'glare'
                          ? 'bg-amber-950/85 text-amber-300 border-amber-500/60'
                          : 'bg-black/75 text-cyan-300 border-cyan-500/40'
                      }`}
                    >
                      {liveQuality.status === 'ready' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                      {liveQuality.status === 'motion_blur' && <Focus className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      {(liveQuality.status === 'poor_light' || liveQuality.status === 'glare') && <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      {liveQuality.status === 'positioning' && <AlertCircle className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                      <span className="truncate">{liveQuality.message}</span>
                    </div>
                  </div>

                  {/* Dual-Zone Colorimetric Framing Guide Box */}
                  <div className="relative w-full max-w-[310px] h-[310px] rounded-2xl border-2 border-cyan-400/70 flex flex-col justify-between p-2.5 bg-black/10 shadow-[0_0_25px_rgba(6,182,212,0.15)]">
                    {/* 4 Precision Measurement Reticles */}
                    <div className="absolute -top-1 -left-1 w-6 h-6 border-t-3 border-l-3 border-cyan-400 rounded-tl" />
                    <div className="absolute -top-1 -right-1 w-6 h-6 border-t-3 border-r-3 border-cyan-400 rounded-tr" />
                    <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-3 border-l-3 border-cyan-400 rounded-bl" />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-3 border-r-3 border-cyan-400 rounded-br" />

                    {/* Zone 1: REFERENCE COLOR SCALE (Top Section) */}
                    <div className="p-2 rounded-xl border border-dashed border-cyan-400/80 bg-cyan-950/50 text-center space-y-1">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-mono font-bold text-cyan-300 uppercase tracking-wide">
                          REFERENCE SCALE
                        </span>
                        <span className="text-[9px] font-mono text-cyan-400/80">7-Patch Standard</span>
                      </div>

                      {/* 7 Reference Color Swatches Visual Target */}
                      <div className="grid grid-cols-7 gap-1 pt-0.5 px-0.5">
                        {REFERENCE_SWATCH_PALETTE.map((sw) => (
                          <div key={sw.ppm} className="flex flex-col items-center space-y-0.5">
                            <div 
                              className="w-full h-4 rounded-sm border border-black/50 shadow-sm"
                              style={{ backgroundColor: sw.rgb }}
                            />
                            <span className="text-[7px] font-mono text-gray-300">{sw.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Scientific Optical Alignment Axis */}
                    <div className="flex items-center justify-between text-[8px] font-mono text-cyan-400/60 px-2 my-0.5">
                      <span>├───</span>
                      <span className="tracking-widest uppercase text-[9px] text-gray-400 font-bold">
                        MATCH BOTH REGIONS IN FRAME
                      </span>
                      <span>───┤</span>
                    </div>

                    {/* Zone 2: REACTION STRIP (Bottom Section) */}
                    <div className="p-2.5 rounded-xl border border-dashed border-amber-400/80 bg-amber-950/50 text-center space-y-1.5">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-mono font-bold text-amber-300 uppercase tracking-wide">
                          REACTION STRIP
                        </span>
                        <span className="text-[9px] font-mono text-amber-400/80">Physical Strip</span>
                      </div>

                      {/* Horizontal Elongated Strip Schematic */}
                      <div className="w-full h-7 rounded-lg bg-gray-900/90 border border-amber-400/60 flex items-center overflow-hidden p-0.5">
                        <div className="w-2/5 h-full bg-gray-300/80 border-r border-black/40 flex items-center justify-center">
                          <span className="text-[7px] font-mono text-gray-900 font-bold">HANDLE</span>
                        </div>
                        <div className="w-3/5 h-full bg-gradient-to-r from-amber-600/70 to-purple-800/80 flex items-center justify-center">
                          <span className="text-[8px] font-mono text-white font-bold tracking-wider">
                            REACTED ZONE
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Helper Callout */}
                  <div className="text-[10px] font-mono text-gray-300 bg-black/80 px-3.5 py-1 rounded-full text-center border border-white/10">
                    Place both the reaction strip and reference scale inside the frame.
                  </div>
                </div>

                {cameraLoading && (
                  <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center space-y-2.5 z-20">
                    <div className="w-8 h-8 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-mono text-gray-300">Starting Optical Camera...</span>
                  </div>
                )}
              </>
            )}

            {/* ANALYZING STRIP... High-Visibility Loading HUD */}
            {scanState === 'ANALYZING' && (
              <div className="absolute inset-0 bg-black/92 backdrop-blur-md flex flex-col items-center justify-center space-y-4 z-30 animate-fadeIn px-6 text-center">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
                  <Camera className="w-7 h-7 text-cyan-400 absolute inset-0 m-auto animate-pulse" />
                </div>
                <div className="space-y-1.5">
                  <div className="text-base font-black text-white font-mono tracking-wider uppercase">
                    ANALYZING STRIP...
                  </div>
                  <div className="text-xs font-mono text-cyan-300 font-medium">
                    Evaluating optical colorimetry & lighting calibration
                  </div>
                  <div className="text-[10px] font-mono text-figma-textMuted pt-1 space-y-0.5">
                    <div>1. Segmenting Reference Scale & Strip</div>
                    <div>2. Applying D65 Lighting Normalization Matrix</div>
                    <div>3. Computing Cumulative H₂S Dose (ppm·min)</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Primary Action Button & Controls */}
      <div className="space-y-3 pt-1">
        {/* Large Worker-Facing Measurement Capture Button */}
        {scanState !== 'SCAN_REJECTED' && scanState !== 'ANALYSIS_FAILED' && scanState !== 'CAMERA_ERROR' && (
          <button
            onClick={handleCaptureAndAnalyze}
            disabled={scanState === 'ANALYZING'}
            className="w-full py-4 px-4 figma-button-primary text-sm font-bold shadow-lg shadow-cyan-500/20 flex items-center justify-center space-x-2 uppercase tracking-wider disabled:opacity-50 transition"
          >
            {scanState === 'ANALYZING' ? (
              <>
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>ANALYZING STRIP...</span>
              </>
            ) : (
              <>
                <Camera className="w-5 h-5 stroke-[2.4]" />
                <span>CAPTURE EXPOSURE READING</span>
              </>
            )}
          </button>
        )}

        {/* Secondary Auxiliary Controls */}
        <div className="flex items-center justify-between text-xs font-mono text-figma-textMuted px-1">
          <label className="hover:text-cyan-400 cursor-pointer flex items-center space-x-1 transition">
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Photo</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <button
            onClick={handleLoadTestFixture}
            className="hover:text-cyan-300 flex items-center space-x-1 text-cyan-400 font-bold transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Test Image</span>
          </button>

          {useFallbackMode ? (
            <button
              onClick={() => {
                setUseFallbackMode(false);
                setCustomFile(null);
                setCustomImageSrc(null);
              }}
              className="hover:text-cyan-400 flex items-center space-x-1 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Live Camera</span>
            </button>
          ) : (
            <button
              onClick={() => setUseFallbackMode(true)}
              className="hover:text-cyan-400 flex items-center space-x-1 transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Sample Badges</span>
            </button>
          )}
        </div>

        {/* Developer Diagnostics Accordion */}
        {isDev && diagnostics && (
          <div className="border-t border-figma-border/40 pt-1.5">
            <button
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className="w-full flex items-center justify-between text-[11px] font-mono text-figma-textMuted hover:text-white py-1"
            >
              <span className="flex items-center space-x-1.5">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span>Colorimetry Diagnostics (Debug)</span>
              </span>
              {showDiagnostics ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showDiagnostics && (
              <div className="mt-2 p-3 rounded-xl bg-black/60 border border-figma-border text-[10px] font-mono space-y-1 text-figma-textSecondary animate-fadeIn">
                <div>State: <strong className="text-white">{scanState}</strong></div>
                <div>Live Quality: <strong className="text-emerald-400">{liveQuality.status} (Lum: {liveQuality.brightness}, Sharp: {liveQuality.sharpness})</strong></div>
                <div>Secure Context: <strong className={diagnostics.isSecureContext ? 'text-emerald-400' : 'text-red-400'}>{diagnostics.isSecureContext ? 'YES' : 'NO'}</strong></div>
                <div>Camera: <strong className="text-white">{diagnostics.activeCameraLabel || 'Rear Camera'}</strong></div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
