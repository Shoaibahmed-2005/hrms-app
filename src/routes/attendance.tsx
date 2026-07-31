import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Loader2,
  LogIn,
  LogOut,
  RotateCcw,
  ScanFace,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import {
  euclidean,
  getDescriptorFromVideo,
  loadFaceModels,
  MATCH_THRESHOLD,
  MIN_MATCH_GAP,
} from "@/lib/face";
import {
  fetchCompanySettings,
  fetchFaceRegistry,
  fetchAnnouncements,
  recordFaceAttendance,
  type CompanySettings,
  type FaceRegistryEntry,
  type Announcement,
} from "@/lib/hrms-db";
import { z } from "zod";

export const Route = createFileRoute("/attendance")({
  head: () => ({ meta: [{ title: "Attendance - HRMS" }] }),
  validateSearch: z.object({
    action: z.enum(["in", "out"]).optional(),
  }),
  component: AttendanceScannerPage,
});

type ScanState = "booting" | "ready" | "scanning" | "success" | "error";

function confidenceFromDistance(distance: number) {
  return Math.max(0, Math.min(100, 100 - (distance / MATCH_THRESHOLD) * 20));
}

function AttendanceScannerPage() {
  const { action } = Route.useSearch();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);
  const cooldownRef = useRef<number | null>(null);
  const hasBlinked = useRef(false);
  const locationRef = useRef<{ lat: number; long: number } | null>(null);
  // Track per-employee last action to enforce check-in/out order
  const employeeLastAction = useRef(new Map<string, "in" | "out">());
  const [registry, setRegistry] = useState<FaceRegistryEntry[]>([]);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [state, setState] = useState<ScanState>("booting");
  const [message, setMessage] = useState("Loading face scanner...");
  const [matched, setMatched] = useState<FaceRegistryEntry | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    // Request location in the background
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          locationRef.current = { lat: pos.coords.latitude, long: pos.coords.longitude };
        },
        (err) => console.warn("Geolocation error:", err),
        { enableHighAccuracy: true }
      );
    }
    void boot();
    return () => {
      stopCamera();
      if (cooldownRef.current) window.clearTimeout(cooldownRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function boot() {
    setState("booting");
    setMessage("Loading face scanner...");
    try {
      setMessage("Starting camera...");
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera not supported. Please ensure you are using HTTPS or localhost.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: cameraConstraints(),
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setMessage("Loading face models...");
      const [registeredFaces, companySettings, announcementsList] = await Promise.all([
        fetchFaceRegistry(),
        fetchCompanySettings(),
        fetchAnnouncements(),
        loadFaceModels(),
      ]);
      setRegistry(registeredFaces);
      setSettings(companySettings);
      
      const now = new Date();
      setAnnouncements(announcementsList.filter(a => a.active && new Date(a.expires_at) > now));

      if (registeredFaces.length === 0) {
        setState("error");
        setMessage("No registered employee faces found.");
        return;
      }

      setState("ready");
      setMessage(action === "out" ? "Face scan for Check-Out" : "Face scan for Check-In");
      scanLoop(registeredFaces, companySettings);
    } catch (error) {
      console.error(error);
      setState("error");
      setMessage(
        error instanceof Error
          ? error.message.includes("Devices not found") || error.message.includes("denied")
            ? "Camera access denied. Please allow camera access and refresh."
            : error.message
          : "Camera unavailable"
      );
    }
  }

  function cameraConstraints(): MediaTrackConstraints {
    const mobile =
      /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent) ||
      navigator.hardwareConcurrency <= 4;

    return mobile
      ? { facingMode: "user", width: { ideal: 320 }, height: { ideal: 480 } }
      : { facingMode: "user", width: { ideal: 480 }, height: { ideal: 640 } };
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function scanLoop(registeredFaces = registry, activeSettings = settings) {
    if (scanningRef.current) return;
    scanningRef.current = true;

    const tick = async () => {
      if (!videoRef.current || registeredFaces.length === 0) {
        scanningRef.current = false;
        return;
      }

      try {
        setState("scanning");
        const scanResult = await getDescriptorFromVideo(videoRef.current);
        if (!scanResult) {
          setMessage("Searching for face...");
          cooldownRef.current = window.setTimeout(tick, 1200);
          return;
        }

        const { descriptor, ear } = scanResult;

        if (ear < 0.25) {
          hasBlinked.current = true;
        }

        const ranked = registeredFaces
          .map((entry) => ({
            entry,
            distance: euclidean(descriptor, entry.descriptor),
          }))
          .sort((a, b) => a.distance - b.distance);
        const best = ranked[0];
        const runnerUp = ranked[1];
        const score = confidenceFromDistance(best?.distance ?? Number.POSITIVE_INFINITY);
        const threshold = activeSettings?.faceThreshold ?? 80;

        if (
          !best ||
          best.distance >= MATCH_THRESHOLD ||
          score < threshold ||
          (runnerUp && runnerUp.distance - best.distance < MIN_MATCH_GAP)
        ) {
          setMatched(null);
          setConfidence(null);
          setState("error");
          setMessage(
            runnerUp
              ? "Face match is ambiguous. Try again with one employee centered."
              : "Face not recognized"
          );
          cooldownRef.current = window.setTimeout(() => {
            setState("ready");
            setMessage(action === "out" ? "Face scan for Check-Out" : "Face scan for Check-In");
            void tick();
          }, 2500);
          return;
        }

        const empId = best.entry.employeeId;

        if (!hasBlinked.current) {
          setMatched(best.entry);
          setConfidence(score);
          setState("scanning");
          setMessage("Please blink to verify...");
          cooldownRef.current = window.setTimeout(tick, 300);
          return;
        }

        const deviceSecret = localStorage.getItem("kiosk_device_secret") || "";
        const lat = locationRef.current?.lat || 0;
        const long = locationRef.current?.long || 0;

        const result = await recordFaceAttendance({
          employeeId: empId,
          faceConfidence: score,
          action: action,
          deviceSecret,
          lat,
          long
        });

        hasBlinked.current = false;

        // Track this action for order enforcement (session-level fast path)
        if (result.action === "check-in") employeeLastAction.current.set(empId, "in");
        if (result.action === "check-out") employeeLastAction.current.set(empId, "out");

        setMatched(best.entry);
        setConfidence(score);
        setState(result.action === "cooldown" || result.status === "error" ? "error" : "success");
        
        if (result.status === "error") {
          setMessage(result.message || "Error recording attendance");
          toast.error(result.message || "Error");
        } else {
          setMessage(
            result.action === "check-in"
              ? `Checked In ✓`
              : result.action === "check-out"
                ? `Checked Out ✓`
                : result.action === "cooldown"
                  ? `Please wait before scanning again.`
                  : `Already complete`
          );
          if (result.action === "cooldown") {
            toast.info(`${best.entry.name}: cooldown active`);
          } else {
            toast.success(`${best.entry.name}: ${messageForAction(result.action as any)}`);
          }
        }

        cooldownRef.current = window.setTimeout(() => {
          setMatched(null);
          setConfidence(null);
          setState("ready");
          setMessage(action === "out" ? "Face scan for Check-Out" : "Face scan for Check-In");
          void tick();
        }, 4500);
      } catch (error) {
        console.error(error);
        setState("error");
        setMessage(error instanceof Error ? error.message : "Attendance scan failed");
        cooldownRef.current = window.setTimeout(() => {
          setState("ready");
          setMessage(action === "out" ? "Face scan for Check-Out" : "Try again");
          void tick();
        }, 3000);
      }
    };

    void tick();
  }

  const isSuccess = state === "success";
  const isError = state === "error";
  const isKioskMode = action === "in" || action === "out";

  return (
    <main
      className="h-screen overflow-hidden bg-background text-foreground flex flex-col"
      style={{ maxHeight: "100dvh" }}
    >
      {/*
        Body — no header at all.
        Portrait / small screens  → flex-col  (camera on top, status below)
        Landscape / tablet / desktop → flex-row (camera left, status right)
      */}
      <div className="flex flex-1 min-h-0 flex-col landscape:flex-row md:flex-row gap-3 p-3 w-full max-w-6xl mx-auto">

        {/* ── Camera panel ── */}
        <div className="flex-1 min-h-0 min-w-0 overflow-hidden rounded-2xl border border-slate-100 dark:border-[#1B3A5C] bg-card shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col">
          <div
            className={`relative flex-1 overflow-hidden rounded-lg border-2 m-2 bg-black ${
              isSuccess ? "border-emerald-500" : isError ? "border-destructive" : "border-border"
            }`}
          >
            <video
              ref={videoRef}
              className="h-full w-full scale-x-[-1] object-cover"
              muted
              playsInline
            />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_42%,rgba(0,0,0,0.35)_78%)]" />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div
                className={`flex aspect-[3/4] h-[65%] max-h-[360px] items-center justify-center rounded-[28px] border-2 ${
                  isSuccess
                    ? "border-emerald-400 shadow-[0_0_36px_rgba(52,211,153,0.35)]"
                    : isError
                      ? "border-red-400 shadow-[0_0_36px_rgba(248,113,113,0.35)]"
                      : "border-white/70"
                }`}
              >
                {state === "booting" ? (
                  <Loader2 className="h-10 w-10 animate-spin text-white/85" />
                ) : (
                  <ScanFace className="h-14 w-14 text-white/70" />
                )}
              </div>
            </div>

            {/* Back to Kiosk — floating top-left */}
            {isKioskMode && (
              <Button
                asChild
                size="sm"
                variant="secondary"
                className="absolute left-3 top-3 z-10 bg-black/50 text-white hover:bg-black/70 border-0 backdrop-blur-sm"
              >
                <Link to="/kiosk">
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Kiosk
                </Link>
              </Button>
            )}

            {/* Mode badge — bottom-left */}
            {action && (
              <div
                className={`absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-white shadow-lg ${
                  action === "in" ? "bg-emerald-600/80" : "bg-orange-600/80"
                }`}
              >
                {action === "in" ? <LogIn className="h-3 w-3" /> : <LogOut className="h-3 w-3" />}
                {action === "in" ? "CHECK-IN" : "CHECK-OUT"}
              </div>
            )}
          </div>
        </div>

        {/* ── Status / controls panel ──
            Portrait:  full width, compact height (shrink-0)
            Landscape: fixed sidebar width, full height
        */}
        <div className="shrink-0 landscape:w-[260px] md:w-[260px] flex flex-col gap-2">

          {/* Status card */}
          <div className="rounded-2xl border border-slate-100 dark:border-[#1B3A5C] bg-card px-4 py-3 shadow-xl shadow-slate-200/50 dark:shadow-none flex items-center gap-3 landscape:flex-col landscape:items-center landscape:text-center landscape:py-4 md:flex-col md:items-center md:text-center md:py-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent">
              {isSuccess ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : isError ? (
                <XCircle className="h-5 w-5 text-destructive" />
              ) : state === "booting" || state === "scanning" ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <Camera className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1 landscape:flex-none md:flex-none">
              <div className="text-base font-semibold leading-snug truncate landscape:whitespace-normal md:whitespace-normal">
                {matched?.name ?? message}
              </div>
              {matched ? (
                <div className="text-xs text-muted-foreground mt-0.5">
                  {matched.empCode} · {matched.department}
                  {confidence != null ? <span className="ml-1">· {Math.round(confidence)}%</span> : null}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground mt-0.5">{stateLabel(state)}</div>
              )}
              {isSuccess && matched && (
                <div
                  className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    action === "out"
                      ? "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400"
                      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                  }`}
                >
                  {action === "out" ? <LogOut className="h-3 w-3" /> : <LogIn className="h-3 w-3" />}
                  {message}
                </div>
              )}
            </div>
          </div>

          {/* Restart */}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              if (cooldownRef.current) window.clearTimeout(cooldownRef.current);
              scanningRef.current = false;
              hasBlinked.current = false;
              setMatched(null);
              setConfidence(null);
              void boot();
            }}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Restart scanner
          </Button>

          {!isKioskMode && (
            <>
              <Button asChild variant="secondary" size="sm" className="w-full">
                <Link to="/kiosk">Use Kiosk Mode</Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="w-full text-muted-foreground">
                <Link to="/">Manager Login</Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {announcements.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-primary/90 text-primary-foreground flex items-center overflow-hidden whitespace-nowrap">
          <div className="inline-block animate-[ticker_20s_linear_infinite]">
            {announcements.map((a, i) => (
              <span key={a.id} className="mx-8 font-medium">
                {a.is_holiday ? "🌴 HOLIDAY: " : "📢 "}
                {a.title} - {a.message}
              </span>
            ))}
          </div>
        </div>
      )}

      <Toaster position="top-center" />
    </main>
  );
}

function messageForAction(action: "check-in" | "check-out" | "already-complete") {
  if (action === "check-in") return "checked in";
  if (action === "check-out") return "checked out";
  return "already complete";
}

function stateLabel(state: ScanState) {
  if (state === "booting") return "Preparing camera and models";
  if (state === "scanning") return "Hold still while we scan";
  if (state === "error") return "Move closer and try again";
  return "Camera is ready";
}
