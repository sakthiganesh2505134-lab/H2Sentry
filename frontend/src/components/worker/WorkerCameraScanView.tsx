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
  Sun,
  Focus,
  Layers,
  HelpCircle,
  Clipboard,
  Trash2,
  Info
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
  | 'EXPOSURE_SCAN'    // Clean live camera / loaded image window
  | 'ANALYZING'        // Transmitting frame & running OpenCV dosimetry engine
  | 'SCAN_REJECTED'    // Physical reference scale / strip missing or unreadable
  | 'ANALYSIS_FAILED'  // Network or server exception
  | 'CAMERA_ERROR';    // Hardware or permission failure

type LiveGuidanceState = 
  | 'INITIALIZING_CAMERA'
  | 'SCANNING_DOSIMETER'
  | 'REFERENCE_DETECTED'
  | 'STRIP_DETECTED'
  | 'READY_TO_CAPTURE'
  | 'MOTION_BLUR'
  | 'POOR_LIGHT'
  | 'GLARE';

interface LiveOpticalQuality {
  state: LiveGuidanceState;
  statusText: string;
  subText: string;
  brightness: number;
  sharpness: number;
  referenceDetected: boolean;
  stripDetected: boolean;
}

// In-App Digital Reference Color Scale (Visual Guide for Worker)
const REFERENCE_COLOR_PROGRESSION = [
  { ppmMin: '0', rgb: '#dcd6c0', label: '0', desc: 'Unexposed baseline' },
  { ppmMin: '10', rgb: '#dacfa0', label: '10', desc: 'Trace detection' },
  { ppmMin: '20', rgb: '#d8cd7a', label: '20', desc: 'Light exposure' },
  { ppmMin: '50', rgb: '#caa357', label: '50', desc: 'Low shift dose' },
  { ppmMin: '100', rgb: '#c18f65', label: '100', desc: 'Moderate tan' },
  { ppmMin: '200', rgb: '#ad7475', label: '200', desc: 'Brown reaction' },
  { ppmMin: '400', rgb: '#906d7f', label: '400', desc: 'Dark brown' },
  { ppmMin: '800', rgb: '#6e4a5d', label: '800', desc: 'High saturation' },
  { ppmMin: '1600+', rgb: '#422838', label: '1600+', desc: 'Lead sulfide max' },
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
  const [showDosimeterAnatomy, setShowDosimeterAnatomy] = useState<boolean>(false);
  const [showTestImageModal, setShowTestImageModal] = useState<boolean>(false);

  // Minimal Live Optical Guidance
  const [liveQuality, setLiveQuality] = useState<LiveOpticalQuality>({
    state: 'SCANNING_DOSIMETER',
    statusText: 'Scanning physical dosimeter...',
    subText: 'Place the entire dosimeter in view of the camera',
    brightness: 128,
    sharpness: 25,
    referenceDetected: false,
    stripDetected: false,
  });

  // Captured Image & Rejection State
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  // Loaded Image (Upload / Paste / Test Image)
  const [loadedImageFile, setLoadedImageFile] = useState<File | null>(null);
  const [loadedImageSrc, setLoadedImageSrc] = useState<string | null>(null);
  const [loadedImageName, setLoadedImageName] = useState<string | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(initialPresetId || null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const evaluatorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const evaluatorIntervalRef = useRef<number | null>(null);

  const activeBadgeCode = verifiedBadgeId || currentWorker?.active_badge_id || 'H2S-BDG-2026-000381';

  // Cleanup stream helper
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
    if (!loadedImageSrc) {
      initCamera();
    }
    return () => {
      cleanupStream();
    };
  }, [initCamera, cleanupStream, loadedImageSrc]);

  // Live Optical Evaluator Loop
  useEffect(() => {
    if (loadedImageSrc || scanState !== 'EXPOSURE_SCAN') {
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

        // Gradient sharpness check
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

        const stripCandidateDetected = avgBrightness >= 45 && avgBrightness <= 225 && avgSharpness >= 10;

        if (avgBrightness < 45) {
          setLiveQuality({
            state: 'POOR_LIGHT',
            statusText: 'Poor lighting detected',
            subText: 'Improve ambient lighting for accurate calibration',
            brightness: Math.round(avgBrightness),
            sharpness: Math.round(avgSharpness),
            referenceDetected: false,
            stripDetected: false,
          });
        } else if (avgBrightness > 228) {
          setLiveQuality({
            state: 'GLARE',
            statusText: 'Excessive glare detected',
            subText: 'Angle camera to avoid direct light reflection',
            brightness: Math.round(avgBrightness),
            sharpness: Math.round(avgSharpness),
            referenceDetected: false,
            stripDetected: false,
          });
        } else if (avgSharpness < 10) {
          setLiveQuality({
            state: 'MOTION_BLUR',
            statusText: 'Image out of focus / blurry',
            subText: 'Hold the camera steady over the reaction strip',
            brightness: Math.round(avgBrightness),
            sharpness: Math.round(avgSharpness),
            referenceDetected: false,
            stripDetected: false,
          });
        } else if (stripCandidateDetected && avgSharpness >= 14) {
          setLiveQuality({
            state: 'READY_TO_CAPTURE',
            statusText: 'Ready to capture ✓',
            subText: 'Reaction strip aligned in frame',
            brightness: Math.round(avgBrightness),
            sharpness: Math.round(avgSharpness),
            referenceDetected: true,
            stripDetected: true,
          });
        } else if (stripCandidateDetected) {
          setLiveQuality({
            state: 'STRIP_DETECTED',
            statusText: 'Reaction strip detected ✓',
            subText: 'Hold camera steady to capture reading',
            brightness: Math.round(avgBrightness),
            sharpness: Math.round(avgSharpness),
            referenceDetected: false,
            stripDetected: true,
          });
        } else {
          setLiveQuality({
            state: 'SCANNING_DOSIMETER',
            statusText: 'Scanning reaction strip...',
            subText: 'Keep the dosimeter strip centered and well lit',
            brightness: Math.round(avgBrightness),
            sharpness: Math.round(avgSharpness),
            referenceDetected: false,
            stripDetected: false,
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
  }, [loadedImageSrc, scanState]);

  // Support Clipboard Image Paste
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            setLoadedImageFile(file);
            const url = URL.createObjectURL(file);
            setLoadedImageSrc(url);
            setLoadedImageName('Pasted Image from Clipboard');
            setSelectedPresetId(null);
            setScanState('EXPOSURE_SCAN');
            setRejectionReason(null);
            cleanupStream();
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [cleanupStream]);

  // Phase 14: Clear Previous Image & Reset Entire State
  const handleClearImage = () => {
    setLoadedImageFile(null);
    setLoadedImageSrc(null);
    setLoadedImageName(null);
    setSelectedPresetId(null);
    setCapturedPreview(null);
    setRejectionReason(null);
    setScanState('EXPOSURE_SCAN');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    initCamera();
  };

  // Phase 10 & 12: Select Known Synthetic Test Image (Strip A ~742 ppm·min or Strip B ~900 ppm·min)
  const handleSelectTestImage = (type: 'A' | 'B') => {
    const presetId = type === 'A' ? 'badge_moderate_742ppm' : 'badge_validation_900ppm';
    const presetTitle = type === 'A' ? 'Test Strip A (~742 ppm·min benchmark)' : 'Test Strip B (~900 ppm·min benchmark)';
    
    // Find matching demo badge item if available
    const found = demoBadges.find((b) => b.id === presetId || b.id.includes(type === 'A' ? '742' : '900'));
    
    setSelectedPresetId(found ? found.id : presetId);
    setLoadedImageFile(null);
    setLoadedImageSrc(found ? (found.image_url.startsWith('data:') ? found.image_url : `data:image/png;base64,${found.image_url}`) : `/api/cv/demo-badges`);
    setLoadedImageName(presetTitle);
    setShowTestImageModal(false);
    setScanState('EXPOSURE_SCAN');
    setRejectionReason(null);
    cleanupStream();
  };

  // Phase 13: Handle Local File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLoadedImageFile(file);
      const url = URL.createObjectURL(file);
      setLoadedImageSrc(url);
      setLoadedImageName(file.name);
      setSelectedPresetId(null);
      setScanState('EXPOSURE_SCAN');
      setRejectionReason(null);
      cleanupStream();
    }
  };

  // Capture / Analyze Photo through POST /api/cv/analyze
  const handleCaptureAndAnalyze = async () => {
    if (scanState === 'ANALYZING') return;

    setScanState('ANALYZING');
    setRejectionReason(null);

    try {
      let res: CVAnalyzeResponse;
      let rawImageSrc: string | undefined = undefined;

      if (loadedImageFile) {
        // Uploaded or pasted file -> send to POST /api/cv/analyze
        rawImageSrc = loadedImageSrc || undefined;
        setCapturedPreview(loadedImageSrc);
        res = await analyzeBadgeImage({
          file: loadedImageFile,
          temperatureC: 28.0,
          humidityPct: 65.0,
          stripAgeDays: 14.0,
          badgeIdHint: activeBadgeCode,
        });
      } else if (selectedPresetId) {
        // Synthetic Test Image -> send to POST /api/cv/analyze using same endpoint
        rawImageSrc = loadedImageSrc || undefined;
        setCapturedPreview(loadedImageSrc);
        res = await analyzeBadgeImage({
          demoPresetId: selectedPresetId,
          temperatureC: 28.0,
          humidityPct: 65.0,
          stripAgeDays: 14.0,
          badgeIdHint: activeBadgeCode,
        });
      } else if (videoRef.current) {
        // Real Live Camera frame capture -> send base64 to POST /api/cv/analyze
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
      } else {
        throw new Error('No measurement image available. Please capture or select an image.');
      }

      // Check if image quality was rejected by CV pipeline
      if (res.image_quality && !res.image_quality.valid) {
        const reasons = res.image_quality.issues.join(', ') || 'Poor lighting or blur.';
        setRejectionReason(`STRIP IMAGE NOT READABLE: ${reasons}`);
        setScanState('SCAN_REJECTED');
        cleanupStream();
        return;
      }

      // Check if region detection failed
      if (res.detections && !res.detections.success) {
        setRejectionReason(res.detections.error_message || 'REACTION STRIP NOT DETECTED: Could not detect the chemical reaction strip.');
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
      if (msg.toLowerCase().includes('strip') || msg.toLowerCase().includes('quality') || msg.toLowerCase().includes('detect') || msg.toLowerCase().includes('readable') || msg.toLowerCase().includes('confirmed')) {
        setScanState('SCAN_REJECTED');
      } else {
        setScanState('ANALYSIS_FAILED');
      }
      cleanupStream();
    }
  };

  const isDev = import.meta.env.DEV || window.location.hostname === 'localhost';

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-slate-50 p-4 flex flex-col justify-between text-slate-900 select-none animate-fadeIn space-y-4">
      {/* 1. Header Navigation */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <button
          onClick={() => {
            cleanupStream();
            onBack();
          }}
          className="flex items-center space-x-1.5 text-xs text-slate-600 hover:text-slate-900 transition px-2.5 py-1 rounded-lg bg-white border border-slate-200 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Badge</span>
        </button>

        <div className="text-right">
          <span className="text-[10px] font-mono text-sky-700 uppercase tracking-wider block font-bold flex items-center justify-end gap-1">
            <Layers className="w-3 h-3" />
            EXPOSURE DOSIMETRY
          </span>
          <span className="text-xs font-mono text-slate-600">Badge: {activeBadgeCode}</span>
        </div>
      </div>

      {/* 2. User Instruction Header */}
      <div className="text-center space-y-0.5">
        <h1 className="text-xl font-black text-slate-900 font-mono tracking-tight uppercase">
          READ EXPOSURE STRIP
        </h1>
        <p className="text-xs text-slate-500">
          Place the dosimeter reaction strip in view of the camera or load a test image.
        </p>
      </div>

      {/* 3. Main Viewport & State Machine */}
      <div className="space-y-3">
        {/* STATE: SCAN REJECTED */}
        {scanState === 'SCAN_REJECTED' && (
          <div className="p-5 rounded-2xl bg-white border-2 border-red-500/50 shadow-card text-center space-y-3 animate-fadeIn">
            <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 mx-auto">
              <XCircle className="w-7 h-7 stroke-[2.2]" />
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-black text-slate-900 font-mono uppercase tracking-wide">
                SCAN COULD NOT BE READ
              </h2>
              <p className="text-xs text-red-700 font-medium leading-relaxed">
                {rejectionReason || 'The chemical reaction strip could not be detected or image quality was insufficient.'}
              </p>
            </div>

            <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-left space-y-1 font-mono">
              <div className="font-bold text-slate-800">Inspection Checklist:</div>
              <div>• Ensure the rectangular chemical reaction strip is within the frame</div>
              <div>• Hold the camera steady under adequate lighting</div>
              <div>• Avoid severe glare reflections or deep shadows</div>
            </div>

            {capturedPreview && (
              <div className="p-1.5 rounded-lg bg-slate-100 border border-slate-200 inline-block">
                <img
                  src={capturedPreview.startsWith('data:') ? capturedPreview : (capturedPreview.startsWith('/') ? capturedPreview : `data:image/jpeg;base64,${capturedPreview}`)}
                  alt="Captured Frame"
                  className="w-40 h-24 object-contain rounded mx-auto bg-slate-900"
                />
                <span className="text-[9px] font-mono text-slate-500 mt-1 block">Captured Frame</span>
              </div>
            )}

            <div className="pt-1 space-y-2">
              <button
                onClick={initCamera}
                className="w-full py-3 px-4 figma-button-primary text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 shadow-sm"
              >
                <RotateCcw className="w-4 h-4" />
                <span>RETAKE SCAN</span>
              </button>

              <button
                onClick={() => setShowTestImageModal(true)}
                className="w-full py-2 px-4 figma-button-secondary text-xs font-semibold flex items-center justify-center space-x-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                <span>USE TEST IMAGE (SOFTWARE VALIDATION)</span>
              </button>
            </div>
          </div>
        )}

        {/* STATE: ANALYSIS FAILED */}
        {scanState === 'ANALYSIS_FAILED' && (
          <div className="p-5 rounded-2xl bg-white border-2 border-red-500/50 shadow-card text-center space-y-3 animate-fadeIn">
            <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 mx-auto">
              <XCircle className="w-7 h-7 stroke-[2.2]" />
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-black text-slate-900 font-mono uppercase tracking-wide">
                ANALYSIS FAILED
              </h2>
              <p className="text-xs text-red-700 font-medium">
                {rejectionReason || 'Unable to connect to the computer vision analysis service.'}
              </p>
            </div>

            <button
              onClick={() => {
                setScanState('EXPOSURE_SCAN');
                setRejectionReason(null);
                if (!loadedImageSrc) initCamera();
              }}
              className="w-full py-3 px-4 figma-button-primary text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 shadow-sm"
            >
              <RotateCcw className="w-4 h-4" />
              <span>TRY AGAIN</span>
            </button>
          </div>
        )}

        {/* STATE: CAMERA HARDWARE / PERMISSION ERROR */}
        {scanState === 'CAMERA_ERROR' && (
          <div className="p-5 rounded-2xl bg-white border border-red-200 shadow-card text-center space-y-3 animate-fadeIn">
            <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 mx-auto">
              <Lock className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 font-mono">Camera Not Available</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{cameraError}</p>
            </div>

            <div className="pt-1 space-y-2">
              <button
                onClick={initCamera}
                className="w-full py-3 px-4 figma-button-primary text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Try Again</span>
              </button>

              <button
                onClick={() => setShowTestImageModal(true)}
                className="w-full py-2.5 px-4 figma-button-secondary text-xs font-semibold flex items-center justify-center space-x-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                <span>Use Software Test Image</span>
              </button>
            </div>
          </div>
        )}

        {/* STATE: CLEAN LIVE CAMERA WINDOW / LOADED IMAGE PREVIEW */}
        {(scanState === 'EXPOSURE_SCAN' || scanState === 'ANALYZING') && (
          <div className="space-y-2">
            {/* Viewport Container */}
            <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-slate-900 border-2 border-slate-200 shadow-card flex items-center justify-center">
              {loadedImageSrc ? (
                /* Uploaded / Pasted / Test Image Preview */
                <div className="relative w-full h-full flex items-center justify-center bg-slate-950">
                  <img
                    src={loadedImageSrc}
                    alt="Dosimeter Preview"
                    className="w-full h-full object-contain p-2"
                  />
                  <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md border border-sky-400 text-[10px] font-mono text-sky-300 font-bold">
                    {loadedImageName || 'Image Loaded'}
                  </div>
                </div>
              ) : (
                /* Real Live Hardware Clean Camera Preview */
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover"
                  />

                  {/* Subtle Corner Markers */}
                  <div className="absolute inset-4 pointer-events-none">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white/60 rounded-tl" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white/60 rounded-tr" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white/60 rounded-bl" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white/60 rounded-br" />
                  </div>

                  {cameraLoading && (
                    <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center space-y-2.5 z-20">
                      <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-mono text-slate-200">INITIALIZING CAMERA...</span>
                    </div>
                  )}
                </>
              )}

              {/* ANALYZING STRIP Loading HUD */}
              {scanState === 'ANALYZING' && (
                <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center space-y-3 z-30 animate-fadeIn px-6 text-center">
                  <div className="relative">
                    <div className="w-14 h-14 border-4 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
                    <Camera className="w-6 h-6 text-sky-400 absolute inset-0 m-auto animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-black text-white font-mono tracking-wider uppercase">
                      ANALYZING STRIP...
                    </div>
                    <div className="text-[11px] font-mono text-sky-300">
                      POST /api/cv/analyze • OpenCV Calibration & ML Regression
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Live Camera Quality Indicator (When using live camera) */}
            {!loadedImageSrc && (
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white border border-slate-200 text-[11px] font-mono shadow-sm">
                <div className="flex items-center space-x-2">
                  {liveQuality.state === 'READY_TO_CAPTURE' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : liveQuality.state === 'MOTION_BLUR' ? (
                    <Focus className="w-4 h-4 text-amber-600 shrink-0" />
                  ) : (liveQuality.state === 'POOR_LIGHT' || liveQuality.state === 'GLARE') ? (
                    <Sun className="w-4 h-4 text-amber-600 shrink-0" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse shrink-0" />
                  )}
                  <div>
                    <span className={`font-bold ${
                      liveQuality.state === 'READY_TO_CAPTURE' 
                        ? 'text-emerald-700' 
                        : (liveQuality.state === 'MOTION_BLUR' || liveQuality.state === 'POOR_LIGHT' || liveQuality.state === 'GLARE')
                        ? 'text-amber-700'
                        : 'text-slate-800'
                    }`}>
                      {liveQuality.statusText}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-[10px] text-slate-500 shrink-0">
                  <span className={liveQuality.referenceDetected ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                    Ref {liveQuality.referenceDetected ? '✓' : '—'}
                  </span>
                  <span>•</span>
                  <span className={liveQuality.stripDetected ? 'text-amber-700 font-bold' : 'text-slate-400'}>
                    Strip {liveQuality.stripDetected ? '✓' : '—'}
                  </span>
                </div>
              </div>
            )}

            {/* Loaded Image Status Toolbar (When image is loaded) */}
            {loadedImageSrc && (
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-sky-50 border border-sky-200 text-xs font-mono text-sky-900 shadow-sm">
                <span className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-sky-600" />
                  Image loaded ({loadedImageName || 'Ready'})
                </span>
                <button
                  onClick={handleClearImage}
                  className="text-xs text-red-600 hover:text-red-800 font-bold flex items-center gap-1 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>CLEAR IMAGE</span>
                </button>
              </div>
            )}

            {/* Primary Action Button */}
            <div className="flex gap-2">
              <button
                onClick={handleCaptureAndAnalyze}
                disabled={scanState === 'ANALYZING'}
                className="flex-1 py-3.5 px-4 figma-button-primary text-xs font-bold shadow-sm flex items-center justify-center space-x-2 uppercase tracking-wider disabled:opacity-50 transition"
              >
                {scanState === 'ANALYZING' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>ANALYZING STRIP...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 stroke-[2.4]" />
                    <span>{loadedImageSrc ? 'ANALYZE IMAGE' : 'CAPTURE EXPOSURE READING'}</span>
                  </>
                )}
              </button>

              {loadedImageSrc && (
                <button
                  onClick={handleClearImage}
                  title="Clear Image"
                  className="px-3.5 py-3.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-red-600 hover:bg-slate-50 transition shadow-sm"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 4. SEPARATE IN-APP DIGITAL REFERENCE SCALE (OUTSIDE CAMERA PREVIEW) */}
      <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-card space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <Layers className="w-3.5 h-3.5 text-sky-600" />
            <h2 className="text-xs font-bold text-slate-900 font-mono uppercase tracking-wider">
              DIGITAL REFERENCE SCALE
            </h2>
          </div>
          <span className="text-[10px] font-mono text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 font-semibold">
            In-App Visual Progression
          </span>
        </div>

        {/* Clean 9-Patch Color Progression Bar */}
        <div className="space-y-1">
          <div className="grid grid-cols-9 gap-1">
            {REFERENCE_COLOR_PROGRESSION.map((patch) => (
              <div key={patch.ppmMin} className="flex flex-col items-center space-y-1">
                <div
                  className="w-full h-5 rounded border border-slate-300 shadow-sm"
                  style={{ backgroundColor: patch.rgb }}
                  title={`${patch.label} ppm·min: ${patch.desc}`}
                />
                <span className="text-[8px] font-mono text-slate-700 font-semibold">{patch.label}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[8px] font-mono text-slate-500 px-0.5">
            <span>0 ppm·min (Unexposed)</span>
            <span>Cumulative Exposure (ppm·min)</span>
            <span>1600+ ppm·min (Max)</span>
          </div>
        </div>

        {/* Scientific Disclosure Notice: Digital Guide vs Software Model Calibration */}
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-[11px] font-mono">
          <p className="text-slate-600 leading-relaxed text-[11px]">
            In-app digital reference scale provides visual color progression. The camera scanner isolates the chemical reaction strip and performs <strong className="text-sky-800">software-based ML model calibration</strong> without requiring a printed reference card.
          </p>
          <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
            <span className="text-sky-700 font-bold">DIGITAL REFERENCE = UI GUIDE</span>
            <span className="text-slate-700 font-bold">CALIBRATION = ML MODEL</span>
          </div>
        </div>
      </div>

      {/* 5. Phase 11 & 13: Secondary Developer / Demo Testing Section */}
      <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-card space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 font-mono flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
            Developer / Demo Testing
          </span>
          <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
            Validation Mode
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Use Test Image Button (Phase 11 & 12) */}
          <button
            onClick={() => setShowTestImageModal(true)}
            className="py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-mono font-semibold text-sky-800 flex items-center justify-center space-x-1.5 transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
            <span>USE TEST IMAGE</span>
          </button>

          {/* Upload / Paste Photo Button (Phase 13) */}
          <label className="py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-mono font-semibold text-slate-700 flex items-center justify-center space-x-1.5 cursor-pointer transition">
            <Upload className="w-3.5 h-3.5 text-slate-600" />
            <span>UPLOAD IMAGE</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1">
          <span className="flex items-center gap-1">
            <Clipboard className="w-3 h-3" />
            Paste images directly with Ctrl+V
          </span>
          {loadedImageSrc && (
            <button onClick={handleClearImage} className="text-red-600 font-bold hover:underline">
              [ Clear Image ]
            </button>
          )}
        </div>
      </div>

      {/* 6. MODAL: Select Software Validation Test Image (Phase 10 & 12) */}
      {showTestImageModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm p-4 flex items-center justify-center animate-fadeIn">
          <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-elevation p-5 space-y-4 text-slate-900">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold font-mono text-slate-900">Software Validation Image</h3>
                <p className="text-xs text-slate-500">Select synthetic test strip to analyze</p>
              </div>
              <button
                onClick={() => setShowTestImageModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5">
              {/* Test Strip A Option */}
              <button
                onClick={() => handleSelectTestImage('A')}
                className="w-full p-3.5 rounded-xl bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-300 text-left transition space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 font-mono">Test Strip A</span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                    ~742 ppm·min
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Moderate benchmark exposure. Verified with Pb(OAc)₂ synthetic matrix.
                </p>
              </button>

              {/* Test Strip B Option */}
              <button
                onClick={() => handleSelectTestImage('B')}
                className="w-full p-3.5 rounded-xl bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-300 text-left transition space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 font-mono">Test Strip B</span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                    ~900 ppm·min
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Elevated benchmark exposure. Tests dynamic model regression response.
                </p>
              </button>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[10px] font-mono text-slate-500 flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
              <span>
                These images will be processed through the exact same <strong>POST /api/cv/analyze</strong> endpoint and ML regression model.
              </span>
            </div>

            <button
              onClick={() => setShowTestImageModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* 7. Physical Dosimeter Anatomy & Alignment */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <button
          onClick={() => setShowDosimeterAnatomy(!showDosimeterAnatomy)}
          className="w-full px-3 py-2.5 flex items-center justify-between text-xs font-mono text-slate-600 hover:text-slate-900 transition"
        >
          <span className="flex items-center space-x-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-sky-600" />
            <span>Dosimeter Anatomy & Alignment</span>
          </span>
          {showDosimeterAnatomy ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showDosimeterAnatomy && (
          <div className="p-3 pt-1 text-[10px] font-mono space-y-2 border-t border-slate-100 bg-slate-50 animate-fadeIn text-slate-600">
            <p className="leading-relaxed">
              The rectangular reaction strip is located below the 6-patch printed color calibration scale. The OpenCV pipeline isolates the chemical reaction zone and normalizes against lighting variations using the reference patches.
            </p>
          </div>
        )}
      </div>

      {/* 8. Developer Diagnostics Accordion */}
      {isDev && diagnostics && (
        <div className="border-t border-slate-200 pt-1">
          <button
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className="w-full flex items-center justify-between text-[11px] font-mono text-slate-500 hover:text-slate-900 py-1"
          >
            <span className="flex items-center space-x-1.5">
              <Cpu className="w-3.5 h-3.5 text-sky-600" />
              <span>Colorimetry Diagnostics (Debug)</span>
            </span>
            {showDiagnostics ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showDiagnostics && (
            <div className="mt-1.5 p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-[10px] font-mono space-y-1 text-slate-700 animate-fadeIn">
              <div>State: <strong className="text-slate-900">{scanState}</strong></div>
              <div>Quality: <strong className="text-emerald-700">{liveQuality.state} (Lum: {liveQuality.brightness}, Sharp: {liveQuality.sharpness})</strong></div>
              <div>Secure Context: <strong className={diagnostics.isSecureContext ? 'text-emerald-700' : 'text-red-700'}>{diagnostics.isSecureContext ? 'YES' : 'NO'}</strong></div>
              <div>Camera: <strong className="text-slate-900">{diagnostics.activeCameraLabel || 'Rear Camera'}</strong></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
