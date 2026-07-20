/**
 * FaceCamera — reusable camera + face detection overlay component.
 * Used for both face enrollment (first time) and attendance verification.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useFaceApi } from '@/hooks/useFaceApi';
import { Button } from '@/components/ui/button';
import { Camera, Loader2, ShieldCheck, ShieldX, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FaceCameraProps {
  mode: 'register' | 'verify';
  onCapture: (descriptor: Float32Array, imageUrl?: string) => void;
  onCancel: () => void;
  busy?: boolean;
}

export function FaceCamera({ mode, onCapture, onCancel, busy = false }: FaceCameraProps) {
  const { state: apiState, detectAndDescribe, detectBox } = useFaceApi();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (e: any) {
      setCameraError(e.name === 'NotAllowedError'
        ? 'Camera access denied. Please allow camera access in your browser settings.'
        : 'Could not access camera: ' + e.message);
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    startCamera();
    return stopCamera;
  }, [startCamera, stopCamera]);

  // Live face detection overlay loop
  useEffect(() => {
    if (apiState !== 'ready' || !videoRef.current) return;
    intervalRef.current = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current) return;
      const detection = await detectBox(videoRef.current);
      setFaceDetected(!!detection);

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const { videoWidth, videoHeight } = videoRef.current;
      canvas.width = videoWidth || 640;
      canvas.height = videoHeight || 480;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (detection) {
        const { x, y, width, height } = detection.box;
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, width, height);
        // Corner decorations
        const cs = 20;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        [[x, y], [x + width - cs, y], [x, y + height - cs], [x + width - cs, y + height - cs]].forEach(([cx, cy]) => {
          ctx.beginPath();
          ctx.moveTo(cx!, cy!);
          ctx.lineTo(cx! + (cx! === x ? cs : -cs), cy!);
          ctx.moveTo(cx!, cy!);
          ctx.lineTo(cx!, cy! + (cy! === y ? cs : -cs));
          ctx.stroke();
        });
      }
    }, 200);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [apiState, detectBox]);

  const handleCapture = async () => {
    if (!videoRef.current || apiState !== 'ready') return;
    setCapturing(true);
    
    // Capture image before stopping stream
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    let dataUrl: string | undefined;
    if (ctx) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(videoRef.current, 0, 0);
      dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    }

    const descriptor = await detectAndDescribe(videoRef.current);
    setCapturing(false);
    if (!descriptor) {
      return; // caller gets null — will show error via faceDetected state
    }
    stopCamera();
    onCapture(descriptor, dataUrl);
  };

  const handleCancel = () => {
    stopCamera();
    onCancel();
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Camera feed */}
      <div className="relative overflow-hidden rounded-xl border-2 border-border bg-black aspect-video">
        {cameraError ? (
          <div className="flex h-full items-center justify-center p-6 text-center">
            <div>
              <AlertTriangle className="mx-auto mb-2 h-10 w-10 text-destructive" />
              <p className="text-sm text-destructive font-medium">{cameraError}</p>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay playsInline muted
              className="h-full w-full object-cover scale-x-[-1]" // mirror for selfie feel
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 h-full w-full scale-x-[-1] pointer-events-none"
            />
            {/* Loading overlay */}
            {apiState === 'loading' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <div className="text-center text-white">
                  <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin" />
                  <p className="text-sm">Loading face recognition models…</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Face status indicator */}
      {!cameraError && apiState === 'ready' && (
        <div className={cn(
          "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
          faceDetected
            ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400"
            : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400"
        )}>
          {faceDetected
            ? <><ShieldCheck className="h-4 w-4 shrink-0" /> Face detected — ready to {mode === 'register' ? 'register' : 'verify'}</>
            : <><ShieldX className="h-4 w-4 shrink-0" /> No face detected — center your face in the frame</>
          }
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={handleCancel} disabled={busy || capturing} className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={handleCapture}
          disabled={!faceDetected || busy || capturing || apiState !== 'ready' || !!cameraError}
          className="flex-1"
        >
          {(busy || capturing) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
          {mode === 'register' ? 'Capture & Register' : 'Verify & Confirm'}
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {mode === 'register'
          ? 'Make sure your face is well-lit and clearly visible. This photo will be used to verify your identity.'
          : 'Look directly at the camera. Your face will be compared with your registered photo.'}
      </p>
    </div>
  );
}
