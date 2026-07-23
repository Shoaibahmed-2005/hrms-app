import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { useFaceApi } from "@/hooks/useFaceApi";
import {
  Camera, Loader2, ShieldCheck, ShieldX, CheckCircle2,
  AlertTriangle, XCircle, LogIn, LogOut, Clock, Megaphone
} from "lucide-react";

export const Route = createFileRoute("/kiosk")({
  component: KioskPage,
});

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

type Screen = "home" | "camera" | "result";
type Action = "check-in" | "check-out";

interface KioskResult {
  tier: "success" | "manual" | "unknown" | "already_done" | "not_checked_in" | "inactive";
  score?: number;
  message?: string;
  employee?: { name: string; photoUrl?: string; department?: string };
  checkInTime?: string;
  checkOutTime?: string;
  isLate?: boolean;
}

function KioskPage() {
  const [screen, setScreen] = useState<Screen>("home");
  const [action, setAction] = useState<Action>("check-in");
  const [result, setResult] = useState<KioskResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [clock, setClock] = useState(new Date());
  const [announcements, setAnnouncements] = useState<any[]>([]);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const fetchAnns = () => {
      fetch(`${API_BASE}/announcements/public/today`)
        .then(res => res.json())
        .then(data => setAnnouncements(Array.isArray(data) ? data : []))
        .catch(() => {});
    };
    fetchAnns();
    const t = setInterval(fetchAnns, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  const handleActionSelect = (a: Action) => {
    setAction(a);
    setScreen("camera");
    setResult(null);
  };

  const handleCapture = async (descriptor: Float32Array) => {
    setBusy(true);
    try {
      const endpoint = action === "check-in" ? "/kiosk/check-in" : "/kiosk/check-out";
      const res = await fetch(`${API_BASE}/attendance${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descriptor: Array.from(descriptor) }),
      });
      const data = await res.json();
      setResult(data);
      setScreen("result");
    } catch {
      setResult({ tier: "unknown", message: "Network error. Please try again." });
      setScreen("result");
    } finally {
      setBusy(false);
    }
  };

  const handleReset = () => {
    setScreen("home");
    setResult(null);
    setBusy(false);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden"
      style={{
        background: "oklch(0.985 0.005 85)",
      }}
    >
      {/* Background image with overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-10 pointer-events-none"
        style={{ backgroundImage: "url('/kiosk-bg.png')" }}
      />
      {/* Warm vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 40%, oklch(0.985 0.005 85) 100%)",
        }}
      />

      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 flex items-center justify-between px-8 py-5 border-b border-[oklch(0.88_0.008_75)] bg-white/60 backdrop-blur-sm">
        {/* Logo + brand */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center shadow-md" style={{ background: "oklch(0.38 0.11 22)" }}>
            <Camera className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-serif font-semibold text-sm leading-tight" style={{ color: "oklch(0.22 0.01 60)" }}>
              Attendance Kiosk
            </p>
            <p className="text-xs" style={{ color: "oklch(0.48 0.01 60)" }}>Dry Cleaning Services</p>
          </div>
        </div>

        {/* Clock */}
        <div className="text-right">
          <p className="font-mono text-xl font-semibold tracking-wider" style={{ color: "oklch(0.22 0.01 60)" }}>
            {clock.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </p>
          <p className="text-xs" style={{ color: "oklch(0.48 0.01 60)" }}>
            {clock.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className={`relative z-10 w-full mt-20 ${screen === "camera" ? "max-w-2xl" : "max-w-sm"}`}>
        {screen === "home" && <HomeScreen onSelect={handleActionSelect} announcements={announcements} />}
        {screen === "camera" && (
          <CameraScreen
            action={action}
            onCapture={handleCapture}
            onBack={handleReset}
            busy={busy}
          />
        )}
        {screen === "result" && result && (
          <ResultScreen
            action={action}
            result={result}
            onClose={handleReset}
          />
        )}
      </div>
    </div>
  );
}

// ── Home Screen ───────────────────────────────────────────────────────────────
function HomeScreen({ onSelect, announcements }: { onSelect: (a: Action) => void; announcements: any[] }) {
  return (
    <div className="flex flex-col items-center gap-8 text-center">
      <div>
        <h1
          className="text-4xl font-serif font-semibold tracking-tight"
          style={{ color: "oklch(0.22 0.01 60)" }}
        >
          Welcome
        </h1>
        <p className="mt-2 text-base" style={{ color: "oklch(0.48 0.01 60)" }}>
          Mark your attendance to start or end your shift
        </p>
      </div>

      <div className="flex flex-col gap-4 w-full">
        {/* Check In */}
        <button
          onClick={() => onSelect("check-in")}
          className="group flex items-center gap-5 w-full rounded-2xl p-6 text-left transition-all duration-200 hover:scale-[1.02] active:scale-95 shadow-lg hover:shadow-xl"
          style={{ background: "oklch(0.38 0.11 22)", border: "1px solid oklch(0.33 0.10 22)" }}
        >
          <div
            className="h-14 w-14 rounded-xl flex items-center justify-center shrink-0 transition-colors"
            style={{ background: "oklch(0.45 0.12 22)" }}
          >
            <LogIn className="h-7 w-7 text-white" />
          </div>
          <div>
            <p className="text-white text-xl font-serif font-semibold">Check In</p>
            <p className="text-sm mt-0.5" style={{ color: "oklch(0.82 0.04 22)" }}>Start your workday</p>
          </div>
        </button>

        {/* Check Out */}
        <button
          onClick={() => onSelect("check-out")}
          className="group flex items-center gap-5 w-full rounded-2xl p-6 text-left transition-all duration-200 hover:scale-[1.02] active:scale-95 shadow-md hover:shadow-lg"
          style={{
            background: "white",
            border: "2px solid oklch(0.88 0.008 75)",
          }}
        >
          <div
            className="h-14 w-14 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "oklch(0.94 0.008 75)" }}
          >
            <LogOut className="h-7 w-7" style={{ color: "oklch(0.38 0.11 22)" }} />
          </div>
          <div>
            <p className="text-xl font-serif font-semibold" style={{ color: "oklch(0.22 0.01 60)" }}>Check Out</p>
            <p className="text-sm mt-0.5" style={{ color: "oklch(0.48 0.01 60)" }}>End your workday</p>
          </div>
        </button>
      </div>

      <p className="text-xs" style={{ color: "oklch(0.65 0.01 60)" }}>
        Look directly at the camera when prompted for face verification
      </p>

      {/* Announcements Card */}
      {announcements.length > 0 && (
        <div className="w-full mt-4 bg-white/70 backdrop-blur-sm border rounded-2xl p-5 shadow-sm text-left" style={{ borderColor: "oklch(0.88 0.008 75)" }}>
          <div className="flex items-center gap-2 mb-3" style={{ color: "oklch(0.38 0.11 22)" }}>
            <Megaphone className="h-5 w-5" />
            <h3 className="font-serif font-semibold text-lg">Today's Announcements</h3>
          </div>
          <div className="space-y-4 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
            {announcements.map((a) => (
              <div key={a.id} className="border-b last:border-0 pb-3 last:pb-0" style={{ borderColor: "oklch(0.94 0.008 75)" }}>
                <p className="font-semibold text-sm" style={{ color: "oklch(0.22 0.01 60)" }}>{a.title}</p>
                <p className="text-sm mt-1" style={{ color: "oklch(0.48 0.01 60)" }}>{a.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Camera Screen ─────────────────────────────────────────────────────────────
function CameraScreen({
  action, onCapture, onBack, busy,
}: {
  action: Action;
  onCapture: (d: Float32Array) => void;
  onBack: () => void;
  busy: boolean;
}) {
  const { state: apiState, detectAndDescribe, detectBox } = useFaceApi();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (e: any) {
        setCameraError(e.name === "NotAllowedError"
          ? "Camera access denied. Please allow camera access."
          : "Could not access camera: " + e.message);
      }
    };
    start();
    return stopCamera;
  }, [stopCamera]);

  useEffect(() => {
    if (apiState !== "ready" || !videoRef.current) return;
    intervalRef.current = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current) return;
      const detection = await detectBox(videoRef.current);
      setFaceDetected(!!detection);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (detection) {
        const { x, y, width, height } = detection.box;
        // Oxblood accent box
        ctx.strokeStyle = "oklch(0.38 0.11 22)";
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, width, height);
        const cs = 20;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 4;
        [[x, y], [x + width - cs, y], [x, y + height - cs], [x + width - cs, y + height - cs]].forEach(([cx, cy]) => {
          ctx.beginPath();
          ctx.moveTo(cx!, cy!); ctx.lineTo(cx! + (cx! === x ? cs : -cs), cy!);
          ctx.moveTo(cx!, cy!); ctx.lineTo(cx!, cy! + (cy! === y ? cs : -cs));
          ctx.stroke();
        });
      }
    }, 200);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [apiState, detectBox]);

  const handleCapture = async () => {
    if (!videoRef.current || apiState !== "ready" || capturing || busy) return;
    setCapturing(true);
    const descriptor = await detectAndDescribe(videoRef.current);
    setCapturing(false);
    if (!descriptor) return;
    stopCamera();
    onCapture(descriptor);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: "oklch(0.38 0.11 22)" }}>
          {action === "check-in" ? "Check In" : "Check Out"}
        </p>
        <h2 className="text-2xl font-serif font-semibold" style={{ color: "oklch(0.22 0.01 60)" }}>
          Look at the camera
        </h2>
      </div>

      {/* Camera feed */}
      <div className="relative overflow-hidden rounded-2xl border-2 bg-black aspect-video shadow-xl"
        style={{ borderColor: "oklch(0.88 0.008 75)" }}>
        {cameraError ? (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
            <div>
              <AlertTriangle className="mx-auto mb-3 h-10 w-10" style={{ color: "oklch(0.5 0.19 27)" }} />
              <p className="text-sm font-medium" style={{ color: "oklch(0.5 0.19 27)" }}>{cameraError}</p>
            </div>
          </div>
        ) : (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover scale-x-[-1]" />
            <canvas ref={canvasRef} className="absolute inset-0 h-full w-full scale-x-[-1] pointer-events-none" />
            {apiState === "loading" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <div className="text-center text-white">
                  <Loader2 className="mx-auto mb-2 h-9 w-9 animate-spin" />
                  <p className="text-sm">Loading face recognition...</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Status indicator */}
      {!cameraError && apiState === "ready" && (
        <div
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium border transition-colors"
          style={faceDetected
            ? { background: "oklch(0.96 0.03 145)", color: "oklch(0.35 0.12 145)", borderColor: "oklch(0.82 0.07 145)" }
            : { background: "oklch(0.945 0.008 75)", color: "oklch(0.48 0.01 60)", borderColor: "oklch(0.88 0.008 75)" }
          }
        >
          {faceDetected
            ? <><ShieldCheck className="h-4 w-4 shrink-0" /> Face detected — tap Capture to proceed</>
            : <><ShieldX className="h-4 w-4 shrink-0" /> No face detected — center your face in the frame</>}
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => { stopCamera(); onBack(); }}
          disabled={busy || capturing}
          className="flex-1 rounded-xl py-3.5 font-semibold text-sm transition-all disabled:opacity-50 border"
          style={{ background: "white", color: "oklch(0.22 0.01 60)", borderColor: "oklch(0.88 0.008 75)" }}
        >
          ← Back
        </button>
        <button
          onClick={handleCapture}
          disabled={!faceDetected || busy || capturing || apiState !== "ready" || !!cameraError}
          className="flex-1 rounded-xl py-3.5 font-semibold text-sm transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-white shadow-md"
          style={{ background: "oklch(0.38 0.11 22)" }}
        >
          {(busy || capturing)
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
            : <><Camera className="h-4 w-4" /> Capture</>}
        </button>
      </div>
    </div>
  );
}

// ── Result Screen ─────────────────────────────────────────────────────────────
function ResultScreen({
  action, result, onClose,
}: {
  action: Action;
  result: KioskResult;
  onClose: () => void;
}) {
  const isWarning = result.tier === "manual";
  const isError = result.tier === "unknown" || result.tier === "inactive";
  const isSuccess = result.tier === "success";
  const time = action === "check-in" ? result.checkInTime : result.checkOutTime;

  return (
    <div className="flex flex-col items-center gap-5 text-center">
      {/* Icon */}
      <div className="h-20 w-20 rounded-full flex items-center justify-center border-2"
        style={isSuccess
          ? { background: "oklch(0.96 0.03 145)", borderColor: "oklch(0.65 0.1 145)" }
          : isWarning
          ? { background: "oklch(0.97 0.03 80)", borderColor: "oklch(0.78 0.12 80)" }
          : { background: "oklch(0.96 0.02 27)", borderColor: "oklch(0.65 0.15 27)" }
        }>
        {isSuccess && <CheckCircle2 className="h-10 w-10" style={{ color: "oklch(0.5 0.15 145)" }} />}
        {isWarning && <AlertTriangle className="h-10 w-10" style={{ color: "oklch(0.6 0.15 80)" }} />}
        {isError && <XCircle className="h-10 w-10" style={{ color: "oklch(0.5 0.19 27)" }} />}
        {(result.tier === "already_done" || result.tier === "not_checked_in") && (
          <CheckCircle2 className="h-10 w-10" style={{ color: "oklch(0.55 0.01 60)" }} />
        )}
      </div>

      {/* Success employee card */}
      {result.employee && isSuccess && (
        <div className="w-full rounded-2xl bg-white border flex flex-col items-center gap-4 p-6 shadow-sm"
          style={{ borderColor: "oklch(0.88 0.008 75)" }}>
          {result.employee.photoUrl ? (
            <img
              src={result.employee.photoUrl}
              alt={result.employee.name}
              className="h-20 w-20 rounded-full object-cover border-2 shadow"
              style={{ borderColor: "oklch(0.38 0.11 22)" }}
            />
          ) : (
            <div
              className="h-20 w-20 rounded-full flex items-center justify-center text-3xl font-serif font-bold text-white border-2 shadow"
              style={{ background: "oklch(0.38 0.11 22)", borderColor: "oklch(0.33 0.10 22)" }}
            >
              {result.employee.name.charAt(0)}
            </div>
          )}
          <div>
            <p className="text-xl font-serif font-semibold" style={{ color: "oklch(0.22 0.01 60)" }}>
              {result.employee.name}
            </p>
            <p className="text-sm" style={{ color: "oklch(0.48 0.01 60)" }}>
              {result.employee.department}
            </p>
          </div>
          {time && (
            <div
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
              style={result.isLate
                ? { background: "oklch(0.97 0.03 80)", color: "oklch(0.5 0.15 80)" }
                : { background: "oklch(0.96 0.03 145)", color: "oklch(0.4 0.12 145)" }
              }
            >
              <Clock className="h-4 w-4" />
              {action === "check-in" ? "Checked in" : "Checked out"} at{" "}
              {new Date(time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              {result.isLate && " · Late"}
            </div>
          )}
          {result.score && (
            <p className="text-xs" style={{ color: "oklch(0.65 0.01 60)" }}>
              {result.score}% face match
            </p>
          )}
        </div>
      )}

      {/* Non-success info card */}
      {!isSuccess && (
        <div
          className="w-full rounded-2xl p-5 border text-left"
          style={isWarning
            ? { background: "oklch(0.97 0.03 80)", borderColor: "oklch(0.82 0.08 80)" }
            : isError
            ? { background: "oklch(0.97 0.02 27)", borderColor: "oklch(0.82 0.08 27)" }
            : { background: "oklch(0.945 0.008 75)", borderColor: "oklch(0.88 0.008 75)" }
          }
        >
          <p className="text-base font-serif font-semibold"
            style={isWarning
              ? { color: "oklch(0.45 0.15 80)" }
              : isError
              ? { color: "oklch(0.38 0.11 22)" }
              : { color: "oklch(0.22 0.01 60)" }
            }>
            {result.tier === "manual" && "Verification Uncertain"}
            {result.tier === "unknown" && "Face Not Recognised"}
            {result.tier === "already_done" && "Already Marked"}
            {result.tier === "not_checked_in" && "Not Checked In"}
            {result.tier === "inactive" && "Account Inactive"}
          </p>
          <p className="mt-1 text-sm" style={{ color: "oklch(0.48 0.01 60)" }}>
            {result.message}
          </p>
          {result.employee && !isSuccess && (
            <p className="mt-1.5 text-xs" style={{ color: "oklch(0.65 0.01 60)" }}>
              Closest match: {result.employee.name}
            </p>
          )}
        </div>
      )}

      {/* Close button */}
      <button
        onClick={onClose}
        className="w-full rounded-xl py-4 font-semibold text-base text-white transition-all active:scale-95 shadow-md hover:opacity-90"
        style={{ background: "oklch(0.38 0.11 22)" }}
      >
        Close
      </button>
    </div>
  );
}
