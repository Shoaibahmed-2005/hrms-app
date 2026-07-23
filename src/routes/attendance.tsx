import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  Loader2,
  RotateCcw,
  ScanFace,
  UserPlus,
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
  recordFaceAttendance,
  type CompanySettings,
  type FaceRegistryEntry,
} from "@/lib/hrms-db";

export const Route = createFileRoute("/attendance")({
  head: () => ({ meta: [{ title: "Attendance Scan - Hivetree" }] }),
  component: AttendanceScannerPage,
});

type ScanState = "booting" | "ready" | "scanning" | "success" | "error";

function confidenceFromDistance(distance: number) {
  return Math.max(0, Math.min(100, 100 - (distance / MATCH_THRESHOLD) * 20));
}

function AttendanceScannerPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);
  const cooldownRef = useRef<number | null>(null);
  const employeeCooldownsRef = useRef(new Map<string, number>());
  const [registry, setRegistry] = useState<FaceRegistryEntry[]>([]);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [state, setState] = useState<ScanState>("booting");
  const [message, setMessage] = useState("Loading face scanner...");
  const [matched, setMatched] = useState<FaceRegistryEntry | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);

  useEffect(() => {
    void boot();
    return () => {
      stopCamera();
      if (cooldownRef.current) window.clearTimeout(cooldownRef.current);
    };
    // The scanner boots once on mount and keeps its own scan loop/cooldown refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function boot() {
    setState("booting");
    setMessage("Loading face scanner...");
    try {
      const registeredFacesPromise = fetchFaceRegistry();
      const companySettingsPromise = fetchCompanySettings();
      const modelsPromise = loadFaceModels();

      setMessage("Starting camera...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: cameraConstraints(),
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setMessage("Loading face models...");
      const [registeredFaces, companySettings] = await Promise.all([
        registeredFacesPromise,
        companySettingsPromise,
        modelsPromise,
      ]);
      setRegistry(registeredFaces);
      setSettings(companySettings);
      if (registeredFaces.length === 0) {
        setState("error");
        setMessage("No registered employee faces found.");
        return;
      }

      setState("ready");
      setMessage("Look at the camera");
      scanLoop(registeredFaces, companySettings);
    } catch (error) {
      console.error(error);
      setState("error");
      setMessage(error instanceof Error ? error.message : "Camera unavailable");
    }
  }

  function cameraConstraints(): MediaTrackConstraints {
    const mobile =
      /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent) ||
      navigator.hardwareConcurrency <= 4;

    return mobile
      ? { facingMode: "user", width: { ideal: 480 }, height: { ideal: 640 } }
      : { facingMode: "user", width: { ideal: 720 }, height: { ideal: 960 } };
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
        const descriptor = await getDescriptorFromVideo(videoRef.current);
        if (!descriptor) {
          setMessage("Searching for face...");
          cooldownRef.current = window.setTimeout(tick, 1200);
          return;
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
              : "Face not recognized",
          );
          cooldownRef.current = window.setTimeout(() => {
            setState("ready");
            setMessage("Try again");
            void tick();
          }, 2500);
          return;
        }

        const cooldownSeconds = Math.max(1, activeSettings?.attendanceCooldownMinutes ?? 1) * 60;
        const until = employeeCooldownsRef.current.get(best.entry.employeeId) ?? 0;
        const remaining = Math.ceil((until - Date.now()) / 1000);
        if (remaining > 0) {
          setMatched(best.entry);
          setConfidence(score);
          setState("error");
          setMessage(
            `Attendance already recorded. Please wait ${remaining} seconds before scanning again.`,
          );
          cooldownRef.current = window.setTimeout(
            () => {
              setMatched(null);
              setConfidence(null);
              setState("ready");
              setMessage("Ready for next scan");
              void tick();
            },
            Math.min(remaining, 3) * 1000,
          );
          return;
        }

        const result = await recordFaceAttendance({
          employeeId: best.entry.employeeId,
          faceConfidence: score,
        });

        employeeCooldownsRef.current.set(
          best.entry.employeeId,
          Date.now() + cooldownSeconds * 1000,
        );
        setMatched(best.entry);
        setConfidence(score);
        setState(result.action === "cooldown" ? "error" : "success");
        setMessage(
          result.action === "check-in"
            ? `Checked in - ${result.status}`
            : result.action === "check-out"
              ? `Checked out - ${result.hours.toFixed(2)}h`
              : result.action === "cooldown"
                ? `Attendance already recorded. Please wait ${result.waitSeconds} seconds before scanning again.`
                : `Attendance already complete - ${result.hours.toFixed(2)}h`,
        );
        if (result.action === "cooldown") {
          toast.info(`${best.entry.name}: cooldown active`);
        } else {
          toast.success(`${best.entry.name}: ${messageForAction(result.action)}`);
        }

        cooldownRef.current = window.setTimeout(() => {
          setMatched(null);
          setConfidence(null);
          setState("ready");
          setMessage("Ready for next scan");
          void tick();
        }, 4500);
      } catch (error) {
        console.error(error);
        setState("error");
        setMessage(error instanceof Error ? error.message : "Attendance scan failed");
        cooldownRef.current = window.setTimeout(() => {
          setState("ready");
          setMessage("Try again");
          void tick();
        }, 3000);
      }
    };

    void tick();
  }

  const isSuccess = state === "success";
  const isError = state === "error";

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Hivetree
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Attendance Scan</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground shadow-[var(--shadow-elevate-sm)]">
              {registry.length} registered
            </div>
            <Button asChild size="sm" variant="outline">
              <Link to="/">
                <UserPlus className="mr-1.5 h-4 w-4" />
                Go to Dashboard
              </Link>
            </Button>
          </div>
        </div>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="overflow-hidden rounded-xl border bg-card p-3 shadow-[var(--shadow-elevate-sm)]">
            <div
              className={`relative aspect-[4/3] overflow-hidden rounded-lg border-2 bg-black ${
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
                  className={`flex aspect-[3/4] h-[72%] max-h-[420px] items-center justify-center rounded-[28px] border-2 ${
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
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5 shadow-[var(--shadow-elevate-sm)]">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent">
              {isSuccess ? (
                <CheckCircle2 className="h-6 w-6 text-[oklch(var(--success))]" />
              ) : isError ? (
                <XCircle className="h-6 w-6 text-destructive" />
              ) : state === "booting" || state === "scanning" ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <Camera className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="text-center">
              <div className="text-xl font-semibold">{matched?.name ?? message}</div>
              {matched ? (
                <div className="mt-1 text-sm text-muted-foreground">
                  {matched.empCode} - {matched.department}
                  {confidence != null ? ` - ${Math.round(confidence)}% match` : ""}
                </div>
              ) : (
                <div className="mt-1 text-sm text-muted-foreground">{stateLabel(state)}</div>
              )}
            </div>

            <Button
              variant="outline"
              className="mt-5 w-full"
              onClick={() => {
                if (cooldownRef.current) window.clearTimeout(cooldownRef.current);
                scanningRef.current = false;
                setMatched(null);
                setConfidence(null);
                void boot();
              }}
            >
              <RotateCcw className="mr-1.5 h-4 w-4" />
              Restart scanner
            </Button>
          </div>
        </section>
      </div>
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
