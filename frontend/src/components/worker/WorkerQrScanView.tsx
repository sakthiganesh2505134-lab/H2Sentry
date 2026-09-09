import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  QrCode, 
  ArrowRight, 
  Search, 
  RotateCcw, 
  Lock, 
  ChevronDown, 
  ChevronUp, 
  Cpu, 
  XCircle, 
  Clock,
  WifiOff
} from 'lucide-react';
import jsQR from 'jsqr';
import type { BadgeLookupResponse, Worker } from '../../types';
import { verifyBadge } from '../../services/api';
import { 
  startDeviceCamera, 
  stopDeviceStream, 
  type CameraDiagnostics, 
  checkCameraSupport 
} from '../../services/camera';

interface WorkerQrScanViewProps {
  currentWorker?: Worker | null;
  onBadgeVerified: (badgeInfo: BadgeLookupResponse) => void;
  onCancel: () => void;
  onNavigateHistory?: () => void;
}

export type QrScanState = 
  | 'BADGE_SCAN_IDLE'   // Initial camera boot
  | 'BADGE_DETECTING'   // Actively scanning video frames ("Scanning...")
  | 'BADGE_VERIFYING'   // Transmitting decoded payload to backend ("Verifying badge...")
  | 'BADGE_VERIFIED'    // Valid registered badge details shown ("BADGE VERIFIED")
  | 'BADGE_INVALID'     // Unregistered/random QR rejected ("BADGE NOT RECOGNIZED")
  | 'BADGE_EXPIRED'     // Expired badge ("BADGE EXPIRED")
  | 'BADGE_ERROR'       // Network/API failure ("BADGE VERIFICATION FAILED")
  | 'CAMERA_ERROR';     // Hardware or permission failure

export const WorkerQrScanView: React.FC<WorkerQrScanViewProps> = ({
  currentWorker,
  onBadgeVerified,
  onCancel,
  onNavigateHistory,
}) => {
  const [scanState, setScanState] = useState<QrScanState>('BADGE_SCAN_IDLE');
  const [cameraLoading, setCameraLoading] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<CameraDiagnostics | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);

  // Scanned QR & Verification Results
  const [scannedRawValue, setScannedRawValue] = useState<string | null>(null);
  const [verifiedBadge, setVerifiedBadge] = useState<BadgeLookupResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Diagnostics Telemetry for Debugging
  const [scannerRunning, setScannerRunning] = useState<boolean>(false);
  const [lastApiStatus, setLastApiStatus] = useState<string>('IDLE');
  const [lastScannerError, setLastScannerError] = useState<string>('NONE');

  // Manual fallback input
  const [showManualInput, setShowManualInput] = useState<boolean>(false);
  const [manualInputId, setManualInputId] = useState<string>(
    currentWorker?.active_badge_id || 'H2S-BDG-2026-000381'
  );

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isVerifyingRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);

  // Cleanup stream helper
  const cleanupStream = useCallback(() => {
    if (scanIntervalRef.current) {
      window.cancelAnimationFrame(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      stopDeviceStream(streamRef.current);
      streamRef.current = null;
    }
    setScannerRunning(false);
  }, []);

  // Backend Badge Verification with Duplicate Lock & Error Boundaries
  const handleVerifyBadge = useCallback(async (rawBadgePayload: string) => {
    if (isVerifyingRef.current) return;
    isVerifyingRef.current = true;

    // Halt camera frame scanning during verification
    if (scanIntervalRef.current) {
      window.cancelAnimationFrame(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setScannerRunning(false);

    const cleanedId = rawBadgePayload.trim();
    setScannedRawValue(cleanedId);
    setScanState('BADGE_VERIFYING');
    setErrorMessage(null);
    setLastApiStatus('VERIFYING (HTTP POST)');

    try {
      const { data, httpStatus } = await verifyBadge(cleanedId);
      if (!isMountedRef.current) return;

      setLastApiStatus(`HTTP ${httpStatus} - ${data.status}`);

      if (data.valid) {
        setVerifiedBadge(data);
        setScanState('BADGE_VERIFIED');
      } else if (data.status === 'EXPIRED') {
        setVerifiedBadge(null);
        setErrorMessage(data.message || 'This badge has exceeded its chemical shelf-life and is no longer valid.');
        setScanState('BADGE_EXPIRED');
      } else {
        setVerifiedBadge(null);
        setErrorMessage(data.message || 'This QR code is not a registered H2Sentry badge.');
        setScanState('BADGE_INVALID');
      }
    } catch (err: any) {
      if (!isMountedRef.current) return;
      console.error('Badge verification network/server error:', err);
      setVerifiedBadge(null);
      setLastApiStatus(`ERROR: ${err.message}`);
      setErrorMessage(err.message || 'Could not verify this badge. Check your connection and try again.');
      setScanState('BADGE_ERROR');
    }
  }, []);

  // Safe frame sampling loop with exception handling
  const startQrScannerLoop = useCallback(() => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    let lastScanTime = 0;
    setScannerRunning(true);

    const scanFrame = (timestamp: number) => {
      if (!isMountedRef.current || isVerifyingRef.current) {
        setScannerRunning(false);
        return;
      }

      const video = videoRef.current;
      if (video && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        // Sample at ~10 FPS to ensure low CPU usage on mobile devices
        if (timestamp - lastScanTime > 100) {
          lastScanTime = timestamp;

          try {
            // Downsample frame to max 640px dimension for ultra-fast, robust jsQR decoding
            const maxDim = 640;
            let targetW = video.videoWidth;
            let targetH = video.videoHeight;
            if (targetW > maxDim || targetH > maxDim) {
              const scale = Math.min(maxDim / targetW, maxDim / targetH);
              targetW = Math.round(targetW * scale);
              targetH = Math.round(targetH * scale);
            }

            if (canvas.width !== targetW || canvas.height !== targetH) {
              canvas.width = targetW;
              canvas.height = targetH;
            }

            if (ctx) {
              ctx.drawImage(video, 0, 0, targetW, targetH);
              const imageData = ctx.getImageData(0, 0, targetW, targetH);

              const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'attemptBoth',
              });

              if (code && code.data && code.data.trim().length > 0) {
                const detected = code.data.trim();
                handleVerifyBadge(detected);
                return; // Cease scanning loop once QR is detected
              }
            }
          } catch (err: any) {
            // Catch any unexpected canvas/jsQR exception so the loop never dies
            console.warn('QR scan frame exception (recovering gracefully):', err);
            setLastScannerError(err.message || String(err));
          }
        }
      }

      // Keep loop running seamlessly
      scanIntervalRef.current = window.requestAnimationFrame(scanFrame);
    };

    scanIntervalRef.current = window.requestAnimationFrame(scanFrame);
  }, [handleVerifyBadge]);

  // Start Real Device Camera & Reset State Machine
  const initCamera = useCallback(async () => {
    isVerifyingRef.current = false;
    setCameraLoading(true);
    setCameraError(null);
    setErrorMessage(null);
    setScannedRawValue(null);
    setVerifiedBadge(null);
    setScanState('BADGE_SCAN_IDLE');
    setLastScannerError('NONE');
    setLastApiStatus('IDLE');
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
    setScanState('BADGE_DETECTING');
    startQrScannerLoop();
  }, [cleanupStream, startQrScannerLoop]);

  // Mount & Unmount lifecycle
  useEffect(() => {
    isMountedRef.current = true;
    initCamera();
    return () => {
      isMountedRef.current = false;
      cleanupStream();
    };
  }, [initCamera, cleanupStream]);

  const handleProceedToExposureScan = () => {
    if (verifiedBadge && verifiedBadge.valid) {
      cleanupStream();
      onBadgeVerified(verifiedBadge);
    }
  };

  const isDev = import.meta.env.DEV || window.location.hostname === 'localhost';

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-slate-50 p-4 flex flex-col justify-between text-slate-900 select-none animate-fadeIn">
      {/* Step Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-sky-700 font-bold">
            STAGE 1 OF 2 • BADGE IDENTITY
          </span>
          <h1 className="text-xl font-black text-slate-900 font-mono flex items-center gap-2">
            <QrCode className="w-5 h-5 text-sky-600" />
            Scan Badge QR
          </h1>
        </div>
        <button
          onClick={() => {
            cleanupStream();
            onCancel();
          }}
          className="text-xs text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-sm hover:bg-slate-50 transition"
        >
          Cancel
        </button>
      </div>

      {/* Main Viewport / State Machine Render */}
      <div className="my-auto py-2">
        {/* STATE: BADGE_VERIFYING (Authoritative Backend Lookup In Flight) */}
        {scanState === 'BADGE_VERIFYING' && (
          <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center space-y-4 shadow-card animate-fadeIn">
            <div className="w-12 h-12 border-3 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-900 font-mono">Verifying badge...</h2>
              <p className="text-xs text-slate-600">
                Checking occupational registry and calibration validity.
              </p>
            </div>
            {scannedRawValue && (
              <div className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-[11px] font-mono text-sky-800 truncate">
                QR: {scannedRawValue}
              </div>
            )}
          </div>
        )}

        {/* STATE: BADGE_INVALID (Random QR Rejected) */}
        {scanState === 'BADGE_INVALID' && (
          <div className="p-6 rounded-2xl bg-white border-2 border-red-500/50 shadow-card text-center space-y-4 animate-fadeIn">
            <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 mx-auto">
              <XCircle className="w-8 h-8 stroke-[2.2]" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg font-black text-slate-900 font-mono uppercase tracking-wide">
                BADGE NOT RECOGNIZED
              </h2>
              <p className="text-xs text-red-700 font-medium leading-relaxed">
                {errorMessage || 'This QR code is not a registered H2Sentry badge.'}
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Please scan the QR code printed on your H2Sentry dosimeter.
              </p>
            </div>

            {/* Debug information in dev mode */}
            {isDev && scannedRawValue && (
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-left font-mono text-[10px] space-y-0.5 text-slate-600">
                <span className="text-slate-500 uppercase block text-[9px]">Detected Value (Debug):</span>
                <span className="text-red-600 break-all">{scannedRawValue}</span>
              </div>
            )}

            <div className="pt-2 space-y-2">
              <button
                onClick={initCamera}
                className="w-full py-3.5 px-4 figma-button-primary text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Try Again</span>
              </button>

              <button
                onClick={() => setShowManualInput(true)}
                className="w-full py-2.5 px-4 figma-button-secondary text-xs font-semibold"
              >
                <span>Enter Badge ID Manually</span>
              </button>
            </div>
          </div>
        )}

        {/* STATE: BADGE_EXPIRED (Expired Badge) */}
        {scanState === 'BADGE_EXPIRED' && (
          <div className="p-6 rounded-2xl bg-white border-2 border-amber-500/50 shadow-card text-center space-y-4 animate-fadeIn">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto">
              <Clock className="w-8 h-8 stroke-[2.2]" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg font-black text-slate-900 font-mono uppercase tracking-wide">
                BADGE EXPIRED
              </h2>
              <p className="text-xs text-amber-800 font-medium leading-relaxed">
                {errorMessage || 'This badge is no longer valid.'}
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Expired badges cannot record trustworthy exposure. Please obtain a fresh calibrated dosimeter badge.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={initCamera}
                className="w-full py-3.5 px-4 figma-button-primary text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Scan Different Badge</span>
              </button>
            </div>
          </div>
        )}

        {/* STATE: BADGE_ERROR (Network/API Failure) */}
        {scanState === 'BADGE_ERROR' && (
          <div className="p-6 rounded-2xl bg-white border-2 border-orange-500/50 shadow-card text-center space-y-4 animate-fadeIn">
            <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 mx-auto">
              <WifiOff className="w-8 h-8 stroke-[2.2]" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg font-black text-slate-900 font-mono uppercase tracking-wide">
                BADGE VERIFICATION FAILED
              </h2>
              <p className="text-xs text-orange-800 font-medium leading-relaxed">
                {errorMessage || 'Could not verify this badge. Check your connection and try again.'}
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Verification requires access to the backend database.
              </p>
            </div>

            <div className="pt-2 space-y-2">
              <button
                onClick={initCamera}
                className="w-full py-3.5 px-4 figma-button-primary text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Try Again</span>
              </button>

              <button
                onClick={() => setShowManualInput(true)}
                className="w-full py-2.5 px-4 figma-button-secondary text-xs font-semibold"
              >
                <span>Enter Badge ID Manually</span>
              </button>
            </div>
          </div>
        )}

        {/* STATE: BADGE_VERIFIED (Accepted & Worker Identity / Context Panel - Section 1 & 4) */}
        {scanState === 'BADGE_VERIFIED' && verifiedBadge && (
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-elevation space-y-4 animate-fadeIn">
            {/* Worker Greeting & Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Badge Verified
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-sans tracking-tight">
                  {verifiedBadge.worker_name || currentWorker?.name || 'Ravi Kumar'}
                </h2>
                <div className="text-xs font-mono text-slate-500 font-semibold mt-0.5">
                  ID: <span className="text-slate-900">{verifiedBadge.employee_id || currentWorker?.employee_id || 'EMP1024'}</span> • Badge: <span className="text-sky-800">{verifiedBadge.badge_id}</span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                ACTIVE
              </span>
            </div>

            {/* Prominent Cumulative Exposure Card (Section 1 & 4) */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md space-y-1.5 border border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-widest text-sky-400 font-bold">
                  CUMULATIVE H₂S EXPOSURE
                </span>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-400/30">
                  Last 30 days
                </span>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-black font-mono tracking-tight text-white">
                  {verifiedBadge.cumulative_30d_dose !== undefined && verifiedBadge.cumulative_30d_dose !== null
                    ? Number(verifiedBadge.cumulative_30d_dose).toLocaleString('en-US')
                    : '7,420'}
                </span>
                <span className="text-sm font-mono text-slate-300 font-normal">
                  ppm·min
                </span>
              </div>
              <div className="text-[11px] text-slate-300 font-sans leading-tight">
                Recorded over the last 30 days
              </div>
              <div className="text-[10px] text-slate-400 font-sans pt-0.5">
                Based on recorded passive exposure readings.
              </div>
            </div>

            {/* Worker & Badge Context Grid */}
            <div className="space-y-2.5 font-mono text-xs bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500 uppercase text-[10px] font-semibold">Last reading</span>
                <span className="text-slate-900 font-bold">
                  {verifiedBadge.last_reading_dose !== undefined && verifiedBadge.last_reading_dose !== null 
                    ? `${verifiedBadge.last_reading_dose.toFixed(0)} ppm·min` 
                    : '742 ppm·min'}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500 uppercase text-[10px] font-semibold">Last checked</span>
                <span className="text-slate-700">{verifiedBadge.last_reading_timestamp || 'Today, 10:42 AM'}</span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 uppercase text-[10px] font-semibold">Measurement period</span>
                <span className="text-slate-700">{verifiedBadge.measurement_period || 'Current shift'}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-1">
              <button
                onClick={handleProceedToExposureScan}
                className="w-full py-3.5 px-4 figma-button-primary text-sm font-bold shadow-md flex items-center justify-center space-x-2 uppercase tracking-wider"
              >
                <span>SCAN EXPOSURE STRIP</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>

              {onNavigateHistory && (
                <button
                  onClick={() => {
                    cleanupStream();
                    onNavigateHistory();
                  }}
                  className="w-full py-2.5 px-4 figma-button-secondary text-xs font-semibold flex items-center justify-center space-x-1.5"
                >
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>View Exposure History</span>
                </button>
              )}

              <button
                onClick={initCamera}
                className="w-full py-2 px-4 text-xs font-mono text-slate-500 hover:text-slate-800 transition text-center flex items-center justify-center space-x-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Rescan Different Badge</span>
              </button>
            </div>
          </div>
        )}

        {/* STATE: CAMERA_ERROR (Camera access or permissions failure) */}
        {scanState === 'CAMERA_ERROR' && (
          <div className="p-6 rounded-2xl bg-white border border-red-200 shadow-card text-center space-y-4 animate-fadeIn">
            <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 mx-auto">
              <Lock className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 font-mono">Camera Access Required</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{cameraError}</p>
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
                onClick={() => setShowManualInput(true)}
                className="w-full py-2.5 px-4 figma-button-secondary text-xs font-semibold"
              >
                <span>Enter Badge ID Manually</span>
              </button>
            </div>
          </div>
        )}

        {/* STATE: BADGE_DETECTING / BADGE_SCAN_IDLE (Live Camera Active Viewfinder) */}
        {(scanState === 'BADGE_DETECTING' || scanState === 'BADGE_SCAN_IDLE') && (
          <div className="relative w-full aspect-[4/5] max-h-[460px] rounded-2xl overflow-hidden bg-slate-900 border-2 border-slate-200 shadow-card flex items-center justify-center">
            {/* Live Camera Video Feed */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Viewfinder Target Reticle Overlay */}
            <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-between p-6 pointer-events-none">
              <div className="px-3.5 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-[11px] font-mono text-white text-center shadow-sm">
                Position the badge QR code inside the frame
              </div>

              {/* Centered QR Reticle */}
              <div className="relative w-56 h-56 rounded-2xl border-2 border-sky-400/80 flex items-center justify-center shadow-lg">
                {/* 4 Corner Markers */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-sky-400 rounded-tl" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-sky-400 rounded-tr" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-sky-400 rounded-bl" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-sky-400 rounded-br" />

                {/* Animated Laser Beam */}
                <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-sky-400 to-transparent animate-pulse" />
              </div>

              {/* Real-Time Scanner Status: Scanning... */}
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-md border border-slate-700 text-[11px] font-mono text-sky-400">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                <span>Scanning...</span>
              </div>
            </div>

            {cameraLoading && (
              <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center space-y-2 z-20">
                <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-mono text-slate-200">Starting Camera...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manual Fallback & Developer Diagnostics */}
      <div className="space-y-3 pt-2">
        {(scanState === 'BADGE_DETECTING' || scanState === 'BADGE_SCAN_IDLE') && (
          <div>
            {!showManualInput ? (
              <button
                onClick={() => setShowManualInput(true)}
                className="w-full text-center text-xs font-mono text-slate-600 hover:text-sky-700 transition py-1"
              >
                Trouble scanning? Enter Badge ID manually →
              </button>
            ) : (
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between text-xs font-mono text-slate-600">
                  <span className="font-semibold">Manual Dosimeter ID Lookup</span>
                  <button onClick={() => setShowManualInput(false)} className="hover:text-slate-900">Close</button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualInputId}
                    onChange={(e) => setManualInputId(e.target.value)}
                    placeholder="e.g. H2S-BDG-2026-000381"
                    className="flex-1 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono placeholder:text-slate-400 focus:outline-none focus:border-sky-600"
                  />
                  <button
                    onClick={() => handleVerifyBadge(manualInputId)}
                    className="px-4 py-2.5 figma-button-primary text-xs font-bold uppercase tracking-wider flex items-center space-x-1"
                  >
                    <Search className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Developer Diagnostics Accordion */}
        {isDev && (
          <div className="border-t border-slate-200 pt-2">
            <button
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className="w-full flex items-center justify-between text-[11px] font-mono text-slate-500 hover:text-slate-900 py-1"
            >
              <span className="flex items-center space-x-1.5">
                <Cpu className="w-3.5 h-3.5 text-sky-600" />
                <span>QR Scanner Diagnostics (Debug)</span>
              </span>
              {showDiagnostics ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showDiagnostics && (
              <div className="mt-2 p-3 rounded-xl bg-slate-100 border border-slate-200 text-[10px] font-mono space-y-1 text-slate-700 animate-fadeIn">
                <div>Camera: <strong className={streamRef.current ? 'text-emerald-600' : 'text-amber-600'}>{streamRef.current ? 'READY' : 'NOT READY'}</strong> {diagnostics?.activeCameraLabel && `(${diagnostics.activeCameraLabel})`}</div>
                <div>Secure Context: <strong className={diagnostics?.isSecureContext ? 'text-emerald-600' : 'text-red-600'}>{diagnostics?.isSecureContext ? 'YES' : 'NO'}</strong></div>
                <div>Scanner: <strong className={scannerRunning ? 'text-emerald-600' : 'text-slate-500'}>{scannerRunning ? 'RUNNING' : 'STOPPED'}</strong></div>
                <div>State: <strong className="text-slate-900">{scanState}</strong></div>
                <div>Last QR: <strong className={scannedRawValue ? 'text-sky-700' : 'text-slate-400'}>{scannedRawValue || 'NONE'}</strong></div>
                <div>Last API Status: <strong className="text-slate-800">{lastApiStatus}</strong></div>
                <div>Last Scanner Error: <strong className={lastScannerError === 'NONE' ? 'text-emerald-600' : 'text-red-600'}>{lastScannerError}</strong></div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
