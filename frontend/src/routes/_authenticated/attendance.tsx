import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useState } from "react";
import {
  LogIn, LogOut, ScanFace, AlertTriangle, CheckCircle2,
  RefreshCw, MapPin, Clock, Users
} from "lucide-react";
import { getPosition } from "@/lib/geo";
import { apiFetch } from "@/lib/api";
import { FaceCamera } from "@/components/FaceCamera";

export const Route = createFileRoute("/_authenticated/attendance")({
  component: AttendancePage,
});

function AttendancePage() {
  const { role } = useAuth();
  return role === "manager" ? <ManagerAttendance /> : <EmployeeAttendance />;
}

// ─── Employee View ────────────────────────────────────────────────────────────

function EmployeeAttendance() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  // Dialog state: null | "register" | "check-in" | "check-out" | "re-register-request"
  const [dialog, setDialog] = useState<string | null>(null);
  const [resetReason, setResetReason] = useState("");

  // Face status
  const faceStatus = useQuery({
    queryKey: ["face-status"],
    queryFn: () => apiFetch("/attendance/face-status"),
  });

  const history = useQuery({
    queryKey: ["att-history"],
    queryFn: () => apiFetch("/attendance"),
    refetchInterval: 3000,
  });

  const today = new Date().toISOString().slice(0, 10);
  const rec = history.data?.find((r: any) => r.date?.startsWith(today));
  const isRegistered = faceStatus.data?.registered === true;

  // ── Register face ──────────────────────────────────────────────────────────
  const handleRegisterCapture = async (descriptor: Float32Array) => {
    setBusy(true);
    try {
      await apiFetch("/attendance/register-face", {
        method: "POST",
        body: JSON.stringify({ descriptor: Array.from(descriptor) }),
      });
      toast.success("Face registered successfully! You can now mark attendance.");
      qc.invalidateQueries({ queryKey: ["face-status"] });
      setDialog(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to register face");
    } finally {
      setBusy(false);
    }
  };

  // ── Check-in ───────────────────────────────────────────────────────────────
  const handleCheckInCapture = async (descriptor: Float32Array) => {
    setBusy(true);
    try {
      let lat: number | undefined;
      let lng: number | undefined;
      try {
        const pos = await getPosition();
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {
        // Location optional — backend will skip geofence if not provided
      }
      const result = await apiFetch("/attendance/check-in", {
        method: "POST",
        body: JSON.stringify({ descriptor: Array.from(descriptor), lat, lng }),
      });
      toast.success(`✅ Checked in — Face match: ${result.faceScore}%`);
      qc.invalidateQueries({ queryKey: ["att-history"] });
      setDialog(null);
    } catch (e: any) {
      toast.error(e.message || "Check-in failed");
    } finally {
      setBusy(false);
    }
  };

  // ── Check-out ──────────────────────────────────────────────────────────────
  const handleCheckOutCapture = async (descriptor: Float32Array) => {
    setBusy(true);
    try {
      const result = await apiFetch("/attendance/check-out", {
        method: "POST",
        body: JSON.stringify({ descriptor: Array.from(descriptor) }),
      });
      toast.success(`✅ Checked out — Face match: ${result.faceScore}%`);
      qc.invalidateQueries({ queryKey: ["att-history"] });
      setDialog(null);
    } catch (e: any) {
      toast.error(e.message || "Check-out failed");
    } finally {
      setBusy(false);
    }
  };

  // ── Face re-registration request ──────────────────────────────────────────
  const submitResetRequest = async () => {
    if (!resetReason.trim()) return toast.error("Please enter a reason");
    setBusy(true);
    try {
      await apiFetch("/face-reset/request", {
        method: "POST",
        body: JSON.stringify({ reason: resetReason }),
      });
      toast.success("Request submitted. Manager will review it shortly.");
      setResetReason("");
      setDialog(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to submit request");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">Attendance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Check in and out with live face verification.
        </p>
      </div>

      {/* Face not registered banner */}
      {faceStatus.data && !isRegistered && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
          <CardContent className="flex items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-300">Face not registered</p>
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  You must register your face before you can mark attendance.
                </p>
              </div>
            </div>
            <Button onClick={() => setDialog("register")} className="shrink-0">
              <ScanFace className="mr-2 h-4 w-4" /> Register Face
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Face registered badge */}
      {isRegistered && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2 dark:border-green-800 dark:bg-green-950">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span className="text-sm text-green-700 dark:text-green-300 font-medium">Face registered</span>
          <button
            onClick={() => setDialog("re-register-request")}
            className="ml-auto text-xs text-green-600 underline underline-offset-2 hover:text-green-800 dark:text-green-400"
          >
            Request re-registration
          </button>
        </div>
      )}

      {/* Today's status card */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif">
            Today · {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
          </CardTitle>
          <CardDescription>
            {rec?.checkInTime && rec?.checkOutTime
              ? `Complete — ${Number(rec.hoursWorked).toFixed(2)}h worked`
              : rec?.checkInTime
                ? "Checked in — don't forget to check out"
                : "Not checked in yet"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <Stat label="Check-in" value={rec?.checkInTime ? new Date(rec.checkInTime).toLocaleTimeString() : "—"} />
            <Stat label="Check-out" value={rec?.checkOutTime ? new Date(rec.checkOutTime).toLocaleTimeString() : "—"} />
            <Stat label="Hours" value={rec?.hoursWorked ? `${Number(rec.hoursWorked).toFixed(2)}h` : "—"} />
            <Stat label="Status" value={
              rec?.status === "LATE" ? <Badge variant="destructive">Late</Badge>
                : rec?.status === "PRESENT" ? <Badge variant="outline" className="border-green-500 text-green-600">Present</Badge>
                  : <Badge variant="secondary">—</Badge>
            } />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!isRegistered || !!rec?.checkInTime || busy}
              onClick={() => setDialog("check-in")}
              size="sm"
            >
              <LogIn className="mr-2 h-4 w-4" /> Check In
            </Button>
            <Button
              disabled={!isRegistered || !rec?.checkInTime || !!rec?.checkOutTime || busy}
              variant="outline"
              onClick={() => setDialog("check-out")}
              size="sm"
            >
              <LogOut className="mr-2 h-4 w-4" /> Check Out
            </Button>
          </div>

          {!isRegistered && faceStatus.isSuccess && (
            <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Register your face above to enable check-in and check-out.
            </p>
          )}
        </CardContent>
      </Card>

      {/* History table */}
      <Card>
        <CardHeader><CardTitle className="font-serif">Recent History</CardTitle></CardHeader>
        <CardContent className="p-0">
          {history.isLoading ? <div className="p-6"><Skeleton className="h-32" /></div>
            : (history.data ?? []).length === 0
              ? <div className="p-8 text-center text-sm text-muted-foreground">No attendance records yet.</div>
              : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Check-in</TableHead>
                      <TableHead>Check-out</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.data!.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{new Date(r.date).toLocaleDateString()}</TableCell>
                        <TableCell>{r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString() : "—"}</TableCell>
                        <TableCell>{r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString() : "—"}</TableCell>
                        <TableCell>{r.hoursWorked ? Number(r.hoursWorked).toFixed(2) : "—"}</TableCell>
                        <TableCell>
                          {r.status === "LATE"
                            ? <Badge variant="destructive">Late</Badge>
                            : r.status === "PRESENT"
                              ? <Badge variant="outline" className="border-green-500 text-green-600">Present</Badge>
                              : <Badge variant="secondary">{r.status}</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
        </CardContent>
      </Card>

      {/* ── Face Registration Dialog ─────────────────────────────────── */}
      <Dialog open={dialog === "register"} onOpenChange={(o) => { if (!o) setDialog(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-serif">
              <ScanFace className="h-5 w-5" /> Register Your Face
            </DialogTitle>
            <DialogDescription>
              This is a one-time setup. Your face will be used to verify your identity every time you mark attendance.
            </DialogDescription>
          </DialogHeader>
          <FaceCamera
            mode="register"
            onCapture={handleRegisterCapture}
            onCancel={() => setDialog(null)}
            busy={busy}
          />
        </DialogContent>
      </Dialog>

      {/* ── Check-In Dialog ──────────────────────────────────────────── */}
      <Dialog open={dialog === "check-in"} onOpenChange={(o) => { if (!o) setDialog(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-serif">
              <LogIn className="h-5 w-5" /> Face Verification — Check In
            </DialogTitle>
            <DialogDescription>
              Look at the camera. Your face will be compared with your registered profile.
            </DialogDescription>
          </DialogHeader>
          <FaceCamera
            mode="verify"
            onCapture={handleCheckInCapture}
            onCancel={() => setDialog(null)}
            busy={busy}
          />
        </DialogContent>
      </Dialog>

      {/* ── Check-Out Dialog ─────────────────────────────────────────── */}
      <Dialog open={dialog === "check-out"} onOpenChange={(o) => { if (!o) setDialog(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-serif">
              <LogOut className="h-5 w-5" /> Face Verification — Check Out
            </DialogTitle>
            <DialogDescription>
              Look at the camera to confirm your identity before checking out.
            </DialogDescription>
          </DialogHeader>
          <FaceCamera
            mode="verify"
            onCapture={handleCheckOutCapture}
            onCancel={() => setDialog(null)}
            busy={busy}
          />
        </DialogContent>
      </Dialog>

      {/* ── Face Re-registration Request Dialog ──────────────────────── */}
      <Dialog open={dialog === "re-register-request"} onOpenChange={(o) => { if (!o) { setDialog(null); setResetReason(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-serif">
              <RefreshCw className="h-5 w-5" /> Request Face Re-registration
            </DialogTitle>
            <DialogDescription>
              Explain why you need to re-register your face (e.g., changed appearance, face verification failing). Your manager will approve or reject this request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Reason <span className="text-destructive">*</span></Label>
              <Textarea
                rows={4}
                placeholder="e.g., I got new glasses and face recognition is not working..."
                value={resetReason}
                onChange={(e) => setResetReason(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setDialog(null); setResetReason(""); }}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={submitResetRequest} disabled={busy || !resetReason.trim()}>
                Submit Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Manager View ─────────────────────────────────────────────────────────────

function ManagerAttendance() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const records = useQuery({
    queryKey: ["mgr-att"],
    queryFn: () => apiFetch("/attendance"),
    refetchInterval: 3000,
  });

  const faceRequests = useQuery({
    queryKey: ["face-reset-pending"],
    queryFn: () => apiFetch("/face-reset/pending"),
    refetchInterval: 3000,
  });

  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  const decide = async (id: string, approve: boolean, reviewNote?: string) => {
    setBusy(id);
    try {
      await apiFetch(`/face-reset/${id}`, {
        method: "PUT",
        body: JSON.stringify({ approve, reviewNote }),
      });
      toast.success(approve ? "Face reset approved — employee notified" : "Request rejected — employee notified");
      qc.invalidateQueries({ queryKey: ["face-reset-pending"] });
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setBusy(null);
    }
  };

  const filtered = (records.data ?? []).filter((r: any) => r.date?.startsWith(date));
  const pendingResets = faceRequests.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">Attendance</h1>
        <p className="mt-1 text-sm text-muted-foreground">Organization-wide attendance log and face registration requests.</p>
      </div>

      {/* Face Reset Requests */}
      {pendingResets.length > 0 && (
        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 font-serif text-lg">
              <RefreshCw className="h-4 w-4 text-blue-500" />
              Face Re-registration Requests
              <Badge className="ml-1">{pendingResets.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingResets.map((req: any) => (
                  <TableRow key={req.id}>
                    <TableCell>
                      <div className="font-medium">{req.employee?.name}</div>
                      <div className="text-xs text-muted-foreground">{req.employee?.employeeCode}</div>
                    </TableCell>
                    <TableCell className="text-sm">{req.employee?.department}</TableCell>
                    <TableCell className="max-w-xs text-sm text-muted-foreground">{req.reason}</TableCell>
                    <TableCell className="text-sm">{new Date(req.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={busy === req.id}
                          onClick={() => decide(req.id, true)}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy === req.id}
                          onClick={() => decide(req.id, false, "Request not approved by manager")}
                        >
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Daily records */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <CardTitle className="flex items-center gap-2 font-serif">
            <Users className="h-4 w-4" /> Daily Records
          </CardTitle>
          <input
            type="date"
            className="rounded-md border border-border bg-background px-2 py-1 text-sm"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </CardHeader>
        <CardContent className="p-0">
          {records.isLoading ? <div className="p-6"><Skeleton className="h-32" /></div>
            : filtered.length === 0
              ? <div className="p-8 text-center text-sm text-muted-foreground">No records for this date.</div>
              : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead><Clock className="inline h-3 w-3 mr-1" />In</TableHead>
                      <TableHead><Clock className="inline h-3 w-3 mr-1" />Out</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Face %</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="font-medium">{r.employee?.name}</div>
                          <div className="text-xs text-muted-foreground">{r.employee?.employeeCode}</div>
                        </TableCell>
                        <TableCell className="text-sm">{r.employee?.department ?? "—"}</TableCell>
                        <TableCell>{r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString() : "—"}</TableCell>
                        <TableCell>{r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString() : "—"}</TableCell>
                        <TableCell>{r.hoursWorked ? Number(r.hoursWorked).toFixed(2) : "—"}</TableCell>
                        <TableCell>
                          {r.faceMatchScore != null
                            ? <span className={Number(r.faceMatchScore) > 0.7 ? "text-green-600 font-medium" : "text-amber-600"}>
                                {(Number(r.faceMatchScore) * 100).toFixed(0)}%
                              </span>
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {r.status === "LATE"
                            ? <Badge variant="destructive">Late</Badge>
                            : r.status === "PRESENT"
                              ? <Badge variant="outline" className="border-green-500 text-green-600">Present</Badge>
                              : <Badge variant="secondary">{r.status}</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tiny helper ──────────────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}
