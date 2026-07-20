import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useRef } from "react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { FileDown, Search, BarChart3, IndianRupee, Clock, Calendar } from "lucide-react";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const printRef = useRef<HTMLDivElement>(null);
  const [employeeId, setEmployeeId] = useState("");
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [fetching, setFetching] = useState(false);
  const [report, setReport] = useState<any>(null);

  const employees = useQuery({
    queryKey: ["employees"],
    queryFn: () => apiFetch("/employees"),
  });

  const fetchReport = async () => {
    if (!employeeId) return toast.error("Please select an employee");
    if (!from || !to) return toast.error("Please select a date range");
    setFetching(true);
    try {
      const data = await apiFetch(`/reports/earnings?employeeId=${employeeId}&from=${from}&to=${to}`);
      setReport(data);
    } catch (e: any) {
      toast.error(e.message || "Failed to fetch report");
    } finally {
      setFetching(false);
    }
  };

  const exportPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">Earnings & attendance reports with PDF export</p>
      </div>

      {/* Filters */}
      <Card className="no-print">
        <CardHeader className="border-b pb-4">
          <CardTitle className="font-serif text-base flex items-center gap-2">
            <Search className="h-4 w-4" /> Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5 w-full sm:w-auto sm:min-w-56">
              <Label className="text-xs text-muted-foreground">Employee</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {(employees.data ?? []).map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} ({e.employeeCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">From</Label>
              <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">To</Label>
              <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-40" />
            </div>
            <Button onClick={fetchReport} disabled={fetching}>
              {fetching ? "Generating…" : "Generate Report"}
              <BarChart3 className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
          {/* Quick Range Shortcuts */}
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { label: "This Month", getRange: () => { const d = new Date(); const f = new Date(d.getFullYear(), d.getMonth(), 1); return [f.toISOString().slice(0,10), d.toISOString().slice(0,10)]; }},
              { label: "Last Month", getRange: () => { const d = new Date(); const f = new Date(d.getFullYear(), d.getMonth() - 1, 1); const t = new Date(d.getFullYear(), d.getMonth(), 0); return [f.toISOString().slice(0,10), t.toISOString().slice(0,10)]; }},
              { label: "Last 7 Days", getRange: () => { const d = new Date(); const f = new Date(d); f.setDate(d.getDate() - 6); return [f.toISOString().slice(0,10), d.toISOString().slice(0,10)]; }},
            ].map(({ label, getRange }) => (
              <button
                key={label}
                onClick={() => { const [f, t] = getRange(); setFrom(f); setTo(t); }}
                className="rounded-full border border-border px-3 py-1 text-xs hover:bg-muted transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Report Output */}
      {fetching ? (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-64" />
        </div>
      ) : report ? (
        <div ref={printRef} className="space-y-5 print-area">
          {/* Report Header (shows nicely in PDF) */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-serif text-xl font-semibold">{report.employee.name}</h2>
              <p className="text-sm text-muted-foreground">
                {report.employee.employeeCode} · {report.employee.department} · {report.employee.designation}
              </p>
              <p className="text-sm text-muted-foreground">
                {report.employee.paymentType === "HOURLY"
                  ? `₹${report.employee.hourlyRate}/hr (Hourly)`
                  : `₹${report.employee.baseSalary?.toLocaleString("en-IN")}/mo (Monthly)`}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Period: {new Date(report.period.from).toLocaleDateString("en-IN")} — {new Date(report.period.to).toLocaleDateString("en-IN")}
              </p>
            </div>
            <Button variant="outline" onClick={exportPDF} className="no-print">
              <FileDown className="mr-1.5 h-4 w-4" /> Export PDF
            </Button>
          </div>

          {/* Summary KPIs */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SumCard label="Total Days" value={String(report.summary.totalDays)} icon={Calendar} />
            <SumCard label="Full Days" value={String(report.summary.fullDays)} icon={Calendar} color="text-green-600" />
            <SumCard label="Half Days" value={String(report.summary.halfDays)} icon={Calendar} color="text-amber-600" />
            <SumCard label="Total Hours" value={`${report.summary.totalHours}h`} icon={Clock} />
            <div className="col-span-2 sm:col-span-4">
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="flex items-center gap-3 p-4">
                  <IndianRupee className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Total Earnings</p>
                    <p className="font-serif text-2xl font-semibold text-primary">
                      ₹{report.summary.totalEarnings.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Day-by-day table */}
          <Card>
            <CardHeader className="border-b pb-3">
              <CardTitle className="font-serif text-base">Daily Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Check-in</TableHead>
                    <TableHead>Check-out</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Day Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Face%</TableHead>
                    <TableHead className="text-right">Earnings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.rows.map((row: any, i: number) => (
                    <TableRow key={i} className={row.dayType === "Absent" ? "opacity-50" : ""}>
                      <TableCell className="text-sm font-medium">
                        {new Date(row.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", weekday: "short" })}
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.checkInTime ? new Date(row.checkInTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.checkOutTime ? new Date(row.checkOutTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}
                      </TableCell>
                      <TableCell className="text-sm">{row.hoursWorked > 0 ? `${row.hoursWorked}h` : "—"}</TableCell>
                      <TableCell>
                        {row.dayType === "Full Day"
                          ? <Badge variant="outline" className="border-green-500 text-green-700 text-[10px]">Full Day</Badge>
                          : row.dayType === "Half Day"
                          ? <Badge variant="outline" className="text-[10px]">Half Day</Badge>
                          : <Badge variant="secondary" className="text-[10px]">Absent</Badge>}
                      </TableCell>
                      <TableCell>
                        {row.status === "LATE"
                          ? <Badge variant="destructive" className="text-[10px]">Late</Badge>
                          : row.status === "PRESENT"
                          ? <Badge variant="outline" className="border-green-500 text-green-700 text-[10px]">Present</Badge>
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.faceMatchScore != null ? `${row.faceMatchScore}%` : "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium text-sm">
                        {row.dailyEarnings > 0 ? `₹${Number(row.dailyEarnings).toFixed(2)}` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Total row */}
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell colSpan={3} className="text-sm">TOTAL</TableCell>
                    <TableCell className="text-sm">{report.summary.totalHours}h</TableCell>
                    <TableCell className="text-sm">{report.summary.fullDays}F · {report.summary.halfDays}H</TableCell>
                    <TableCell colSpan={2} />
                    <TableCell className="text-right font-bold text-sm">
                      ₹{report.summary.totalEarnings.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            <BarChart3 className="mx-auto mb-3 h-8 w-8 opacity-30" />
            Select an employee and date range above, then click <strong>Generate Report</strong>.
          </CardContent>
        </Card>
      )}

      {/* Print-specific styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
}

function SumCard({ label, value, icon: Icon, color = "text-foreground" }: {
  label: string; value: string; icon: any; color?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`h-3.5 w-3.5 ${color}`} />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className={`font-serif text-xl font-semibold ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
