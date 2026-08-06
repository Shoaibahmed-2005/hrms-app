import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import type { JSX } from "react";
import { Users, CalendarDays, Wallet, UserX, LogIn, LogOut, Loader2, ChevronDown, ChevronRight, Clock } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  fetchDashboardData,
  fetchEmployees,
  fetchManagerAttendanceData,
  fetchOutlets,
  recordManualCheckIn,
  recordManualCheckOut,
  type DashboardData,
  type DbEmployee,
  type DailyAttendance,
  type Outlet,
} from "@/lib/hrms-db";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_app/attendance-history")({
  head: () => ({ meta: [{ title: "Attendance Management - CleanUp" }] }),
  component: AttendanceManagementPage,
});

function today() {
  return new Date().toLocaleDateString("en-CA");
}

// checkIn / checkOut / firstIn / lastOut are already formatted by formatClock()
// in hrms-db.ts (e.g. "09:00 AM"), so we just display them directly.
function displayTime(value: string) {
  return value || "-";
}

function AttendanceManagementPage() {
  const { user } = useAuth();
  const [date, setDate] = useState(today());
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [employees, setEmployees] = useState<DbEmployee[]>([]);
  const [attendanceRows, setAttendanceRows] = useState<DailyAttendance[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dash, emp, att, outs] = await Promise.all([
        fetchDashboardData(),
        fetchEmployees(),
        fetchManagerAttendanceData(date),
        fetchOutlets(),
      ]);
      setDashboard(dash);
      setEmployees(emp.filter(e => e.status === "Active"));
      setAttendanceRows(att.rows);
      setOutlets(outs);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load data");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleManualCheckIn = async (employeeId: string) => {
    if (!user) return;
    setProcessingId(employeeId);
    try {
      await recordManualCheckIn(employeeId, user.id, selectedOutlet || undefined);
      toast.success("Checked in manually" + (selectedOutlet && outlets.find(o => o.id === selectedOutlet) ? ` at ${outlets.find(o => o.id === selectedOutlet)!.name}` : ""));
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error checking in");
    } finally {
      setProcessingId(null);
    }
  };

  const handleManualCheckOut = async (employeeId: string) => {
    if (!user) return;
    setProcessingId(employeeId);
    try {
      await recordManualCheckOut(employeeId, user.id);
      toast.success("Checked out manually");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error checking out");
    } finally {
      setProcessingId(null);
    }
  };

  const toggleExpand = (empId: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(empId)) next.delete(empId);
      else next.add(empId);
      return next;
    });
  };

  const filteredEmployees = employees.filter((emp) =>
    `${emp.name} ${emp.empCode} ${emp.department}`
      .toLowerCase()
      .includes(q.toLowerCase()),
  );

  const isToday = date === today();

  return (
    <div>
      <PageHeader
        title="Attendance Management"
        description="Monitor today's attendance and manage manual check-ins/outs."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard 
          label="Present Today" 
          value={dashboard?.totalEmployees ? `${Math.round((dashboard.presentToday / dashboard.totalEmployees) * 100)}%` : "..."} 
          icon={CalendarDays} 
        />
        <StatCard label="Total Active" value={dashboard?.totalEmployees ?? "..."} icon={Users} />
        <StatCard label="Total Absent" value={dashboard?.absentToday ?? "..."} icon={UserX} />
        <StatCard
          label="Est. Earnings (Month)"
          value={dashboard ? `Rs ${dashboard.payrollTotal.toLocaleString()}` : "..."}
          icon={Wallet}
        />
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-100 dark:border-[#1B3A5C] bg-card p-4 shadow-sm">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Date</label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        {outlets.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Outlet (for manual check-in)</label>
            <select
              value={selectedOutlet}
              onChange={(e) => setSelectedOutlet(e.target.value)}
              className="flex h-9 w-48 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">All / Auto-detect</option>
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
        )}
        <div className="relative min-w-[240px] flex-1">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search employee..."
            className="pl-4"
          />
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-100 dark:border-[#1B3A5C] bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-8"></TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>First In</TableHead>
              <TableHead>Last Out</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEmployees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                  {loading ? "Loading..." : "No employees found."}
                </TableCell>
              </TableRow>
            ) : (
              filteredEmployees.flatMap((emp) => {
                const daily = attendanceRows.find(r => r.employeeIdRaw === emp.id);
                const hasAttendance = !!daily && daily.sessions.length > 0;
                const isExpanded = expanded.has(emp.id);
                const isProcessing = processingId === emp.id;

                if (!hasAttendance) {
                  return [
                    <TableRow key={emp.id}>
                      <TableCell className="w-8"></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold overflow-hidden">
                            {emp.profileImage
                              ? <img src={emp.profileImage} alt={emp.name} className="h-7 w-7 rounded-full object-cover" />
                              : (emp.name.split(" ").map((p: string) => p[0]).join("").slice(0, 2).toUpperCase())
                            }
                          </span>
                          <div>
                            <div className="font-medium">{emp.name}</div>
                            <div className="text-xs text-muted-foreground">{emp.empCode}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{emp.department}</TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">-</TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">-</TableCell>
                      <TableCell>
                        <Badge variant="destructive">Absent</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {isToday && (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-primary hover:text-primary disabled:opacity-50"
                              disabled={isProcessing}
                              onClick={() => handleManualCheckIn(emp.id)}
                            >
                              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="mr-1.5 h-4 w-4" />}
                              Check-In
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={true}
                              title="Employee has not checked in yet"
                            >
                              <LogOut className="mr-1.5 h-4 w-4" />
                              Check-Out
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ];
                }

                // Determine if employee is currently checked in (last session has no checkout)
                const sessions = daily.sessions;
                const lastSession = sessions[sessions.length - 1];
                const isCurrentlyCheckedIn = lastSession && lastSession.checkOut === "-";
                // Can check-in only if NOT currently checked in
                const canCheckIn = !isCurrentlyCheckedIn;
                // Can check-out only if currently checked in
                const canCheckOut = !!isCurrentlyCheckedIn;

                // A real "session" is a completed check-in/out pair, OR the current active check-in.
                // Orphaned check-ins (no checkout, not the latest) are junk from the old double-
                // check-in bug — filter them out of the display.
                const displaySessions = sessions.filter((s, i) =>
                  s.checkOut !== "-" ? true : i === sessions.length - 1
                );
                const hasMultipleSessions = displaySessions.length > 0;

                const rows: JSX.Element[] = [];

                // Main employee summary row
                rows.push(
                  <TableRow
                    key={emp.id}
                    className={hasMultipleSessions ? "cursor-pointer hover:bg-muted/30" : ""}
                    onClick={hasMultipleSessions ? () => toggleExpand(emp.id) : undefined}
                  >
                    <TableCell className="w-8">
                      {hasMultipleSessions && (
                        <span className="text-muted-foreground flex items-center justify-center">
                          {isExpanded
                            ? <ChevronDown className="h-4 w-4" />
                            : <ChevronRight className="h-4 w-4" />}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold overflow-hidden">
                          {emp.profileImage
                            ? <img src={emp.profileImage} alt={emp.name} className="h-7 w-7 rounded-full object-cover" />
                            : (emp.name.split(" ").map((p: string) => p[0]).join("").slice(0, 2).toUpperCase())
                          }
                        </span>
                        <div>
                          <div className="font-medium">{emp.name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                            {emp.empCode}
                            {hasMultipleSessions && (
                              <span className="inline-flex items-center gap-0.5 text-muted-foreground/70">
                                <Clock className="h-3 w-3" />
                                {displaySessions.length} sessions
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{emp.department}</TableCell>
                    <TableCell className="tabular-nums font-medium">
                      {displayTime(daily.firstIn)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {isCurrentlyCheckedIn ? (
                        <span className="text-muted-foreground font-medium">-</span>
                      ) : (
                        <span className="font-medium">{displayTime(daily.lastOut)}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          daily.status === "Active" ? "default" :
                          daily.status === "Completed" ? "secondary" :
                          daily.status === "Half Day" ? "outline" :
                          "destructive"
                        }
                      >
                        {daily.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                      {isToday && (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-primary hover:text-primary disabled:opacity-50"
                            disabled={!canCheckIn || isProcessing}
                            title={!canCheckIn ? "Employee is currently checked in" : "Manual check-in"}
                            onClick={() => handleManualCheckIn(emp.id)}
                          >
                            {isProcessing
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <LogIn className="mr-1.5 h-4 w-4" />}
                            Check-In
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-accent hover:text-accent disabled:opacity-50"
                            disabled={!canCheckOut || isProcessing}
                            title={!canCheckOut ? "Employee is not currently checked in" : "Manual check-out"}
                            onClick={() => handleManualCheckOut(emp.id)}
                          >
                            {isProcessing
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <LogOut className="mr-1.5 h-4 w-4" />}
                            Check-Out
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );

                // Expanded sub-rows: one per session
                if (isExpanded && hasMultipleSessions) {
                  displaySessions.forEach((session, i) => {
                    rows.push(
                      <TableRow key={`${emp.id}-s${i}`} className="bg-muted/20 hover:bg-muted/25">
                        <TableCell className="w-8"></TableCell>
                        <TableCell colSpan={2}>
                          <div className="flex items-center gap-2 pl-5 text-sm text-muted-foreground">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary/50 shrink-0" />
                            Session {i + 1}
                            {session.outletName && (
                              <span className="ml-1 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                {session.outletName}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="tabular-nums text-sm text-muted-foreground">
                          {displayTime(session.checkIn)}
                        </TableCell>
                        <TableCell className="tabular-nums text-sm text-muted-foreground">
                          {session.checkOut === "-"
                            ? "-"
                            : displayTime(session.checkOut)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={session.checkOut === "-" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {session.checkOut === "-" ? "Active" : "Done"}
                          </Badge>
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    );
                  });
                }

                return rows;
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
