/**
 * H2Sentry Camera Service & MediaStream Manager
 * Handles real hardware camera access, permissions, secure context detection,
 * error mapping, and lifecycle management across iOS, Android, and Desktop browsers.
 */

export interface CameraDiagnostics {
  isSecureContext: boolean;
  hasMediaDevices: boolean;
  hasGetUserMedia: boolean;
  permissionState: 'prompt' | 'granted' | 'denied' | 'unsupported';
  activeCameraLabel: string | null;
  facingMode: string | null;
  resolution: string | null;
  errorMessage: string | null;
}

export interface CameraStartResult {
  stream: MediaStream | null;
  error: string | null;
  diagnostics: CameraDiagnostics;
}

/**
 * Inspects browser environment for camera capability
 */
export function checkCameraSupport(): {
  supported: boolean;
  isSecureContext: boolean;
  reason?: string;
} {
  const isSecure = typeof window !== 'undefined' ? window.isSecureContext : false;
  const hasMD = typeof navigator !== 'undefined' && !!navigator.mediaDevices;
  const hasGUM = hasMD && typeof navigator.mediaDevices.getUserMedia === 'function';

  if (!isSecure) {
    return {
      supported: false,
      isSecureContext: false,
      reason: 'Insecure Context: Browsers disable camera access on plain HTTP local network addresses. Please open H2Sentry via HTTPS or localhost.'
    };
  }

  if (!hasMD || !hasGUM) {
    return {
      supported: false,
      isSecureContext: true,
      reason: 'MediaDevices API is not supported in this browser.'
    };
  }

  return {
    supported: true,
    isSecureContext: true,
  };
}

/**
 * Maps standard browser DOMExceptions to clear, user-actionable messages
 */
export function mapCameraError(err: any): string {
  if (!err) return 'Unknown camera initialization error.';
  const name = err.name || err.code || '';
  const msg = err.message || '';

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Camera permission was denied. Please allow camera access in your browser site settings, then tap Try Again.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No camera was detected on this device.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'Camera is already in use by another application or tab. Please close other camera apps and try again.';
  }
  if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
    return 'The requested camera resolution or facingMode is not supported on this hardware.';
  }
  if (name === 'SecurityError') {
    return 'Camera access blocked due to security restrictions. HTTPS or localhost is required.';
  }
  if (name === 'AbortError') {
    return 'Camera startup was interrupted. Please try again.';
  }

  return msg || 'Unable to start camera. Please verify device permissions and try again.';
}

/**
 * Starts device camera with progressive fallback constraints
 */
export async function startDeviceCamera(preferredFacingMode: 'environment' | 'user' = 'environment'): Promise<CameraStartResult> {
  const support = checkCameraSupport();
  const diagnostics: CameraDiagnostics = {
    isSecureContext: support.isSecureContext,
    hasMediaDevices: typeof navigator !== 'undefined' && !!navigator.mediaDevices,
    hasGetUserMedia: typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia,
    permissionState: 'prompt',
    activeCameraLabel: null,
    facingMode: preferredFacingMode,
    resolution: null,
    errorMessage: null,
  };

  if (!support.supported) {
    diagnostics.errorMessage = support.reason || 'Camera not supported.';
    return {
      stream: null,
      error: diagnostics.errorMessage,
      diagnostics,
    };
  }

  // Check Permissions API if supported
  if (navigator.permissions && navigator.permissions.query) {
    try {
      const p = await navigator.permissions.query({ name: 'camera' as PermissionName });
      diagnostics.permissionState = p.state as any;
    } catch {}
  }

  // Tiered constraints: try ideal rear camera, fallback to basic environment, then any video
  const constraintTiers: MediaStreamConstraints[] = [
    {
      video: {
        facingMode: { ideal: preferredFacingMode },
        width: { ideal: 1920, min: 640 },
        height: { ideal: 1080, min: 480 },
      },
      audio: false,
    },
    {
      video: {
        facingMode: preferredFacingMode,
      },
      audio: false,
    },
    {
      video: true,
      audio: false,
    },
  ];

  let stream: MediaStream | null = null;
  let lastError: any = null;

  for (const constraints of constraintTiers) {
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (stream) break;
    } catch (err: any) {
      lastError = err;
      // If permission explicitly denied, don't keep cycling tiers
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        break;
      }
    }
  }

  if (!stream) {
    const errorMsg = mapCameraError(lastError);
    diagnostics.errorMessage = errorMsg;
    diagnostics.permissionState = lastError?.name === 'NotAllowedError' ? 'denied' : diagnostics.permissionState;
    return {
      stream: null,
      error: errorMsg,
      diagnostics,
    };
  }

  const track = stream.getVideoTracks()[0];
  if (track) {
    const settings = track.getSettings();
    diagnostics.activeCameraLabel = track.label || 'Default Camera';
    diagnostics.facingMode = (settings.facingMode as string) || preferredFacingMode;
    diagnostics.resolution = settings.width && settings.height ? `${settings.width}x${settings.height}` : null;
    diagnostics.permissionState = 'granted';
  }

  return {
    stream,
    error: null,
    diagnostics,
  };
}

/**
 * Stops all tracks in a MediaStream
 */
export function stopDeviceStream(stream: MediaStream | null): void {
  if (!stream) return;
  try {
    stream.getTracks().forEach((track) => {
      track.stop();
    });
  } catch (err) {
    console.warn('Error stopping stream tracks:', err);
  }
}

/**
 * Captures frame from HTMLVideoElement into base64 JPEG
 */
export function captureFrameFromVideo(
  video: HTMLVideoElement,
  quality: number = 0.92
): { base64: string; width: number; height: number } | null {
  if (!video || video.readyState < 2) return null;

  const w = video.videoWidth || 1280;
  const h = video.videoHeight || 720;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.drawImage(video, 0, 0, w, h);
  const base64 = canvas.toDataURL('image/jpeg', quality);

  return { base64, width: w, height: h };
}
