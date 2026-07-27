import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Users, CalendarDays, Wallet, UserX, LogIn, LogOut, Loader2 } from "lucide-react";
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
  recordManualCheckIn,
  recordManualCheckOut,
  type DashboardData,
  type DbEmployee,
  type DailyAttendance
} from "@/lib/hrms-db";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_app/attendance-history")({
  head: () => ({ meta: [{ title: "Attendance Management - CleanUp" }] }),
  component: AttendanceManagementPage,
});

function today() {
  return new Date().toISOString().slice(0, 10);
}

function AttendanceManagementPage() {
  const { user } = useAuth();
  const [date, setDate] = useState(today());
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [employees, setEmployees] = useState<DbEmployee[]>([]);
  const [attendanceRows, setAttendanceRows] = useState<DailyAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dash, emp, att] = await Promise.all([
        fetchDashboardData(),
        fetchEmployees(),
        fetchManagerAttendanceData(date)
      ]);
      setDashboard(dash);
      setEmployees(emp.filter(e => e.status === "Active"));
      setAttendanceRows(att.rows);
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
      await recordManualCheckIn(employeeId, user.id);
      toast.success("Checked in manually");
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

  const filteredEmployees = employees.filter((emp) =>
    `${emp.name} ${emp.empCode} ${emp.department}`
      .toLowerCase()
      .includes(q.toLowerCase()),
  );

  return (
    <div>
      <PageHeader
        title="Attendance Management"
        description="Monitor today's attendance and manage manual check-ins/outs."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Present Today" value={dashboard?.presentToday ?? "..."} icon={CalendarDays} />
        <StatCard label="Total Active" value={dashboard?.totalEmployees ?? "..."} icon={Users} />
        <StatCard label="Total Absent" value={dashboard?.absentToday ?? "..."} icon={UserX} />
        <StatCard
          label="Est. Earnings (Month)"
          value={dashboard ? `₹${dashboard.payrollTotal.toLocaleString()}` : "..."}
          icon={Wallet}
        />
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Date</label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="relative min-w-[240px] flex-1">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search employee..."
            className="pl-4"
          />
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Employee</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Check-In</TableHead>
              <TableHead>Check-Out</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEmployees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                  {loading ? "Loading..." : "No employees found."}
                </TableCell>
              </TableRow>
            ) : (
              filteredEmployees.map((emp) => {
                // DailyAttendance groups all sessions for an employee on a given day
                const daily = attendanceRows.find(r => r.employeeIdRaw === emp.id);
                const isCheckedIn = daily?.status === "Active";
                const hasAttendance = !!daily;

                const displayCheckIn = daily ? daily.firstIn : "-";
                const displayCheckOut = daily ? daily.lastOut : "-";
                const sessionSummary = daily && daily.sessions.length > 1
                  ? daily.sessions.map(s => `${s.checkIn.slice(11,16)}-${s.checkOut === "-" ? "now" : s.checkOut.slice(11,16)}`).join(", ")
                  : null;

                return (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <div className="font-medium">{emp.name}</div>
                      <div className="text-xs text-muted-foreground">{emp.empCode}</div>
                    </TableCell>
                    <TableCell>{emp.department}</TableCell>
                    <TableCell className="tabular-nums">
                      <div>{displayCheckIn}</div>
                      {sessionSummary && <div className="text-[10px] text-muted-foreground">{sessionSummary}</div>}
                    </TableCell>
                    <TableCell className="tabular-nums">{displayCheckOut}</TableCell>
                    <TableCell>
                      <Badge variant={isCheckedIn ? "default" : daily?.status === "Half Day" ? "outline" : hasAttendance ? "secondary" : "destructive"}>
                        {isCheckedIn ? "Active" : daily?.status ?? "Absent"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {!isCheckedIn && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-primary hover:text-primary"
                            disabled={processingId === emp.id || date !== today()}
                            onClick={() => handleManualCheckIn(emp.id)}
                          >
                            {processingId === emp.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="mr-1.5 h-4 w-4" />}
                            Check-In
                          </Button>
                        )}
                        {isCheckedIn && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-accent hover:text-accent"
                            disabled={processingId === emp.id || date !== today()}
                            onClick={() => handleManualCheckOut(emp.id)}
                          >
                            {processingId === emp.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="mr-1.5 h-4 w-4" />}
                            Check-Out
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
