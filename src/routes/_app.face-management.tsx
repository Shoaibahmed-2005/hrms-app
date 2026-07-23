import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, CheckCircle2, Loader2, RefreshCcw, ScanFace } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchEmployees,
  fetchFaceRegistry,
  initials,
  saveEmployeeFaceDescriptor,
  type DbEmployee,
  type FaceRegistryEntry,
} from "@/lib/hrms-db";
import { getDescriptorFromVideo, loadFaceModels } from "@/lib/face";

export const Route = createFileRoute("/_app/face-management")({
  head: () => ({ meta: [{ title: "Face Management - Hivetree" }] }),
  component: FaceManagementPage,
});

type CaptureState = "idle" | "loading" | "streaming" | "saving";

function FaceManagementPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [employees, setEmployees] = useState<DbEmployee[]>([]);
  const [registry, setRegistry] = useState<FaceRegistryEntry[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [state, setState] = useState<CaptureState>("idle");

  async function load() {
    try {
      const [employeeRows, faceRows] = await Promise.all([fetchEmployees(), fetchFaceRegistry()]);
      setEmployees(employeeRows);
      setRegistry(faceRows);
      setSelectedEmployeeId((current) => current || employeeRows[0]?.id || "");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Could not load face registry");
    }
  }

  useEffect(() => {
    void load();
    return () => stopCamera();
  }, []);

  const registryByEmployee = useMemo(
    () => new Map(registry.map((entry) => [entry.employeeId, entry])),
    [registry],
  );
  const selected = employees.find((employee) => employee.id === selectedEmployeeId);
  const registeredCount = employees.filter((employee) =>
    registryByEmployee.has(employee.id),
  ).length;
  const missingCount = Math.max(0, employees.length - registeredCount);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  async function startCamera() {
    setState("loading");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: cameraConstraints(),
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      await loadFaceModels();
      setState("streaming");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Camera unavailable");
      setState("idle");
    }
  }

  function cameraConstraints(): MediaTrackConstraints {
    const mobile =
      /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent) ||
      navigator.hardwareConcurrency <= 4;

    return mobile
      ? { facingMode: "user", width: { ideal: 480 }, height: { ideal: 640 } }
      : { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } };
  }

  async function capture() {
    if (!selected || !videoRef.current) return;

    setState("saving");
    try {
      const descriptor = await getDescriptorFromVideo(videoRef.current);
      if (!descriptor) {
        toast.error("No face detected. Improve lighting and try again.");
        setState("streaming");
        return;
      }

      await saveEmployeeFaceDescriptor(selected.id, descriptor);
      toast.success(`${selected.name} face profile saved`);
      stopCamera();
      setState("idle");
      await load();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Could not save face profile");
      setState("streaming");
    }
  }

  return (
    <div>
      <PageHeader
        title="Face Management"
        description="Register and update employee face profiles for attendance scanning."
        actions={
          <Button size="sm" variant="outline" onClick={() => void load()}>
            <RefreshCcw className="mr-1.5 h-4 w-4" />
            Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Employees" value={employees.length} icon={ScanFace} />
        <StatCard label="Registered" value={registeredCount} icon={CheckCircle2} />
        <StatCard label="Missing" value={missingCount} icon={Camera} />
        <StatCard label="Scanner route" value="/attendance" delta="Public mobile page" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-5 shadow-[var(--shadow-elevate-sm)] lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Capture face</div>
              <div className="text-xs text-muted-foreground">
                Select an employee, start camera, then capture one clear face.
              </div>
            </div>
            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
              <SelectTrigger className="h-9 w-full sm:w-[260px]">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name} - {employee.empCode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative mx-auto flex aspect-[4/3] w-full max-w-xl items-center justify-center overflow-hidden rounded-lg border bg-muted">
            <video
              ref={videoRef}
              className="h-full w-full scale-x-[-1] object-cover"
              muted
              playsInline
            />
            {state === "idle" || state === "loading" ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/75 text-center text-sm text-muted-foreground">
                {state === "loading" ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  <ScanFace className="h-8 w-8" />
                )}
                <div>
                  {state === "loading" ? "Starting camera..." : "Camera preview appears here."}
                </div>
                {state === "idle" ? (
                  <Button size="sm" onClick={startCamera} disabled={!selected}>
                    Start camera
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="mt-4 flex justify-center gap-2">
            {state === "streaming" || state === "saving" ? (
              <>
                <Button onClick={capture} disabled={state === "saving" || !selected}>
                  {state === "saving" ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <ScanFace className="mr-1.5 h-4 w-4" />
                  )}
                  Capture and save
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    stopCamera();
                    setState("idle");
                  }}
                >
                  Cancel
                </Button>
              </>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-[var(--shadow-elevate-sm)]">
          <div className="mb-4 text-sm font-semibold">Registration status</div>
          <div className="space-y-2">
            {employees.map((employee) => {
              const entry = registryByEmployee.get(employee.id);
              return (
                <button
                  key={employee.id}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border bg-background p-3 text-left transition-colors hover:bg-accent/60"
                  onClick={() => setSelectedEmployeeId(employee.id)}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold">
                      {initials(employee.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{employee.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {employee.empCode} - {employee.department}
                      </div>
                    </div>
                  </div>
                  <Badge variant={entry ? "secondary" : "outline"}>
                    {entry ? "Registered" : "Missing"}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
