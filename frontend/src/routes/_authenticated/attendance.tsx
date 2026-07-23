import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useState, useMemo, useEffect } from "react";
import {
  LogIn, LogOut, Search, Clock, CheckCircle2,
  AlertTriangle, Users, TrendingUp, IndianRupee, ClipboardCheck
} from "lucide-react";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/attendance")({
  validateSearch: (search: Record<string, unknown>) => ({
    addBonusFor: search.addBonusFor as string | undefined,
    employeeId: search.employeeId as string | undefined,
  }),
  component: AttendancePage,
});

function AttendancePage() {
  const searchParams = Route.useSearch();
  const router = useRouter();


  const qc = useQueryClient();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<{ type: "checkin" | "checkout"; employee: any } | null>(null);
  const [bonusDialog, setBonusDialog] = useState<{ recordId: string; employeeId: string; employee?: any } | null>(null);
  const [extraWages, setExtraWages] = useState("");
  const [busy, setBusy] = useState(false);

  // When employees data is ready, and we have search params, open the dialog
  const employees = useQuery({
    queryKey: ["employees"],
    queryFn: () => apiFetch("/employees"),
  });

  useEffect(() => {
    if (searchParams.addBonusFor && searchParams.employeeId && employees.data && !bonusDialog) {
      const emp = (employees.data as any[]).find((e) => e.id === searchParams.employeeId);
      if (emp) {
        setBonusDialog({ recordId: searchParams.addBonusFor, employeeId: searchParams.employeeId, employee: emp });
        router.navigate({ search: {} });
      }
    }
  }, [searchParams, employees.data]);


  const records = useQuery({
    queryKey: ["att-records"],
    queryFn: () => apiFetch("/attendance"),
    refetchInterval: 5000,
  });

  const todayStr = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0');

  const toLocalYYYYMMDD = (d: string) => {
    if (!d) return "";
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  };

  const todayMap = useMemo(() => {
    const m: Record<string, any> = {};
    (records.data ?? []).forEach((r: any) => {
      if (toLocalYYYYMMDD(r.date) === todayStr) m[r.employeeId] = r;
    });
    return m;
  }, [records.data, todayStr]);

  const dateRecords = useMemo(() =>
    (records.data ?? []).filter((r: any) => toLocalYYYYMMDD(r.date) === date),
    [records.data, date]
  );

  const filteredEmployees = useMemo(() => {
    const q = search.toLowerCase();
    return (employees.data ?? []).filter((e: any) =>
      !q || e.name?.toLowerCase().includes(q) || e.employeeCode?.toLowerCase().includes(q)
    );
  }, [employees.data, search]);

  const handleCheckIn = async () => {
    if (!dialog) return;
    setBusy(true);
    try {
      await apiFetch("/attendance/manual-check-in", {
        method: "POST",
        body: JSON.stringify({ employeeId: dialog.employee.id }),
      });
      toast.success(`✅ ${dialog.employee.name} checked in manually`);
      qc.invalidateQueries({ queryKey: ["att-records"] });
      qc.invalidateQueries({ queryKey: ["notif-unread"] });
      qc.invalidateQueries({ queryKey: ["reports-dashboard"] });
      setDialog(null);
    } catch (e: any) {
      toast.error(e.message || "Check-in failed");
    } finally {
      setBusy(false);
    }
  };

  const handleCheckOut = async () => {
    if (!dialog) return;
    setBusy(true);
    try {
      const payload: any = { employeeId: dialog.employee.id };
      if (extraWages && !isNaN(Number(extraWages))) payload.extraWages = Number(extraWages);
      const result = await apiFetch("/attendance/manual-check-out", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast.success(`🏁 ${dialog.employee.name} checked out — ${result.hoursWorked?.toFixed(1)}h, ₹${result.dailyEarnings?.toFixed(2)}${result.extraWages ? ` + ₹${result.extraWages} Extra` : ''}`);
      qc.invalidateQueries({ queryKey: ["att-records"] });
      qc.invalidateQueries({ queryKey: ["notif-unread"] });
      qc.invalidateQueries({ queryKey: ["reports-dashboard"] });
      setDialog(null);
      setExtraWages("");
    } catch (e: any) {
      toast.error(e.message || "Check-out failed");
    } finally {
      setBusy(false);
    }
  };

  const presentToday = Object.values(todayMap).filter((r: any) => r.checkInTime).length;
  const handleAddBonus = async () => {
    if (!bonusDialog) return;
    setBusy(true);
    try {
      const payload = {
        recordId: bonusDialog.recordId,
        extraWages: extraWages ? Number(extraWages) : 0,
      };
      await apiFetch("/attendance/add-bonus", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast.success("Bonus added successfully");
      qc.invalidateQueries({ queryKey: ["att-records"] });
      setBonusDialog(null);
      setExtraWages("");
    } catch (e: any) {
      toast.error(e.message || "Failed to add bonus");
    } finally {
      setBusy(false);
    }
  };

  const totalActive = (employees.data ?? []).filter((e: any) => e.status === "ACTIVE").length;
  const todayEarnings = Object.values(todayMap).reduce((s: number, r: any) => s + (r.dailyEarnings ?? 0) + (r.extraWages ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight">Attendance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manually mark employee attendance. For face-verified check-ins, use the{" "}
          <a href="/kiosk" target="_blank" className="underline text-primary font-medium hover:opacity-80">
            Employee Kiosk ↗
          </a>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KPI label="Present Today" value={String(presentToday)} icon={CheckCircle2} color="text-green-600" />
        <KPI label="Total Active" value={String(totalActive)} icon={Users} />
        <KPI label="Absent Today" value={String(Math.max(0, totalActive - presentToday))} icon={AlertTriangle} color="text-amber-600" />
        <KPI label="Today's Earnings" value={`₹${todayEarnings.toFixed(0)}`} icon={IndianRupee} color="text-blue-600" />
      </div>

      <Card>
        <CardHeader className="border-b pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="font-serif text-lg flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5" /> Manual Attendance
              </CardTitle>
              <CardDescription>Click Check In or Check Out to manually mark attendance for any employee</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employee…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {employees.isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {search ? "No employees match your search." : "No active employees found."}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredEmployees.map((emp: any) => {
                const rec = todayMap[emp.id];
                const checkedIn = !!rec?.checkInTime;
                const checkedOut = !!rec?.checkOutTime;
                return (
                  <div
                    key={emp.id}
                    className={cn(
                      "rounded-xl border p-4 transition-all flex flex-col",
                      checkedOut ? "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/30" :
                      checkedIn ? "border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30" :
                      "border-border hover:border-primary/30 hover:bg-muted/30"
                    )}
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {emp.photoUrl ? (
                          <img src={emp.photoUrl} alt={emp.name} className="h-10 w-10 shrink-0 rounded-full object-cover shadow-sm border border-border" />
                        ) : (
                          <div className="h-10 w-10 shrink-0 rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground border border-border">
                            {emp.name.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium text-sm leading-tight">{emp.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{emp.designation || emp.department}</p>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {checkedOut ? <Badge variant="outline" className="border-green-500 text-green-700 text-[10px]">Done</Badge>
                         : checkedIn ? <Badge variant="outline" className="border-blue-500 text-blue-700 text-[10px]">In</Badge>
                         : <Badge variant="secondary" className="text-[10px]">Out</Badge>}
                      </div>
                    </div>
                    {rec?.checkInTime && (
                      <div className="mb-2 text-[11px] text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> In: {new Date(rec.checkInTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                        {rec.checkOutTime && <span>· Out: {new Date(rec.checkOutTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>}
                      </div>
                    )}
                    {rec?.dailyEarnings > 0 && (
                      <div className="mb-2 text-[11px] font-medium text-green-700 dark:text-green-400">
                        ₹{Number(rec.dailyEarnings).toFixed(2)} earned {rec.extraWages ? `+ ₹${rec.extraWages} Extra` : ''} {rec.isHalfDay && " (Half-day)"}
                      </div>
                    )}
                    <div className="mt-auto flex gap-2 pt-2">
                      {!checkedIn ? (
                        <Button
                          size="sm"
                          className="flex-1 text-xs h-8"
                          onClick={() => setDialog({ type: "checkin", employee: emp })}
                          disabled={emp.status === "INACTIVE"}
                        >
                          <LogIn className="mr-1.5 h-3.5 w-3.5" /> Check In
                        </Button>
                      ) : !checkedOut ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-xs h-8"
                          onClick={() => setDialog({ type: "checkout", employee: emp })}
                        >
                          <LogOut className="mr-1.5 h-3.5 w-3.5" /> Check Out
                        </Button>
                      ) : (
                        <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Completed
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b">
          <div>
            <CardTitle className="flex items-center gap-2 font-serif text-lg">
              <TrendingUp className="h-4 w-4" /> Records
            </CardTitle>
          </div>
          <input
            type="date"
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm w-full sm:w-auto"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {records.isLoading ? (
            <div className="p-6"><Skeleton className="h-32" /></div>
          ) : dateRecords.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">No records for this date.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Check-out</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Earnings</TableHead>
                  <TableHead>Extra Wages</TableHead>
                  <TableHead>Face%</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dateRecords.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium text-sm">{r.employee?.name}</div>
                      <div className="text-xs text-muted-foreground">{r.employee?.employeeCode}</div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.hoursWorked ? `${Number(r.hoursWorked).toFixed(1)}h` : "—"}
                    </TableCell>
                    <TableCell>
                      {r.checkInTime
                        ? r.isHalfDay
                          ? <Badge variant="outline" className="text-[10px]">Half-day</Badge>
                          : <Badge variant="outline" className="border-green-500 text-green-700 text-[10px]">Full-day</Badge>
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {r.dailyEarnings ? `₹${Number(r.dailyEarnings).toFixed(2)}` : "—"}
                    </TableCell>
                    <TableCell className="text-sm font-medium text-amber-600">
                      {r.extraWages ? `+ ₹${r.extraWages}` : "—"}
                    </TableCell>
                    <TableCell>
                      {r.faceMatchScore != null
                        ? <span className={Number(r.faceMatchScore) > 0.65 ? "text-green-600 font-medium text-sm" : "text-amber-600 text-sm"}>
                            {Math.round(Number(r.faceMatchScore) * 100)}%
                          </span>
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {r.status === "LATE" ? <Badge variant="destructive" className="text-[10px]">Late</Badge>
                       : r.status === "PRESENT" ? <Badge variant="outline" className="border-green-500 text-green-700 text-[10px]">Present</Badge>
                       : <Badge variant="secondary" className="text-[10px]">{r.status}</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Manual Check-In Dialog */}
      <Dialog open={!!dialog && dialog.type === "checkin"} onOpenChange={o => { if (!o && !busy) setDialog(null); }}>
        <DialogContent className="max-w-sm mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-serif">
              <LogIn className="h-5 w-5 text-primary" /> Manual Check In
            </DialogTitle>
            <DialogDescription>
              Confirm manual check-in for <strong>{dialog?.employee?.name}</strong>. This records the current time.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
            {dialog?.employee?.photoUrl ? (
              <img src={dialog.employee.photoUrl} alt={dialog.employee.name} className="h-12 w-12 rounded-full object-cover border" />
            ) : (
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-lg border">
                {dialog?.employee?.name?.charAt(0)}
              </div>
            )}
            <div>
              <p className="font-semibold text-sm">{dialog?.employee?.name}</p>
              <p className="text-xs text-muted-foreground">{dialog?.employee?.designation || dialog?.employee?.department}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Time: {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialog(null)} disabled={busy}>Cancel</Button>
            <Button onClick={handleCheckIn} disabled={busy}>
              {busy ? "Processing…" : "✅ Confirm Check In"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Check-Out Dialog */}
      <Dialog open={!!dialog && dialog.type === "checkout"} onOpenChange={o => { if (!o && !busy) { setDialog(null); setExtraWages(""); } }}>
        <DialogContent className="max-w-sm mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-serif">
              <LogOut className="h-5 w-5 text-primary" /> Manual Check Out
            </DialogTitle>
            <DialogDescription>
              Confirm check-out for <strong>{dialog?.employee?.name}</strong>. Earnings calculated automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
            {dialog?.employee?.photoUrl ? (
              <img src={dialog.employee.photoUrl} alt={dialog.employee.name} className="h-12 w-12 rounded-full object-cover border" />
            ) : (
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-lg border">
                {dialog?.employee?.name?.charAt(0)}
              </div>
            )}
            <div>
              <p className="font-semibold text-sm">{dialog?.employee?.name}</p>
              <p className="text-xs text-muted-foreground">{dialog?.employee?.designation || dialog?.employee?.department}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Time: {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="extra-wages" className="text-sm">Extra Wages (Optional)</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">₹</span>
              <Input
                id="extra-wages"
                type="number"
                min="0"
                placeholder="e.g. 50 for bonus or overtime"
                value={extraWages}
                onChange={e => setExtraWages(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setDialog(null); setExtraWages(""); }} disabled={busy}>Cancel</Button>
            <Button onClick={handleCheckOut} disabled={busy}>
              {busy ? "Processing…" : "🏁 Confirm Check Out"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Bonus Dialog (from Kiosk notification) */}
      <Dialog open={!!bonusDialog} onOpenChange={o => { if (!o && !busy) { setBonusDialog(null); setExtraWages(""); } }}>
        <DialogContent className="max-w-sm mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-serif">
              <IndianRupee className="h-5 w-5 text-indigo-600" /> Add Bonus
            </DialogTitle>
            <DialogDescription>
              Add bonus or extra wages for <strong>{bonusDialog?.employee?.name}</strong>'s kiosk check-out today.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3 rounded-lg border bg-indigo-50/50 p-3">
            {bonusDialog?.employee?.photoUrl ? (
              <img src={bonusDialog.employee.photoUrl} alt={bonusDialog.employee.name} className="h-12 w-12 rounded-full object-cover border" />
            ) : (
              <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-lg border">
                {bonusDialog?.employee?.name?.charAt(0)}
              </div>
            )}
            <div>
              <p className="font-semibold text-sm">{bonusDialog?.employee?.name}</p>
              <p className="text-xs text-muted-foreground">{bonusDialog?.employee?.designation || bonusDialog?.employee?.department}</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bonus-wages" className="text-sm">Bonus Amount (₹)</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">₹</span>
              <Input
                id="bonus-wages"
                type="number"
                min="0"
                placeholder="e.g. 100"
                value={extraWages}
                onChange={e => setExtraWages(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setBonusDialog(null); setExtraWages(""); }} disabled={busy}>Cancel</Button>
            <Button onClick={handleAddBonus} disabled={busy || !extraWages} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {busy ? "Processing…" : "💰 Save Bonus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KPI({ label, value, icon: Icon, color = "text-foreground" }: { label: string; value: string; icon: any; color?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          <Icon className={cn("h-4 w-4", color)} />
        </div>
        <p className={cn("font-serif text-2xl font-semibold", color)}>{value}</p>
      </CardContent>
    </Card>
  );
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}
