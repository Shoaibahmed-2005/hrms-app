import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Download, FileText, Timer, Users, Wallet } from "lucide-react";
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
import { downloadCSV } from "@/lib/csv";
import { fetchCompanyReport, type CompanyReportData } from "@/lib/hrms-db";
import { downloadCompanyReportPdf } from "@/lib/pdf";

export const Route = createFileRoute("/_app/reports")({
  head: () => ({ meta: [{ title: "Reports - Hivetree" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const [startDate, setStartDate] = useState(monthStart());
  const [endDate, setEndDate] = useState(today());
  const [report, setReport] = useState<CompanyReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetchCompanyReport(startDate, endDate)
      .then(setReport)
      .catch((error) => {
        console.error(error);
        toast.error(error instanceof Error ? error.message : "Could not load company report");
      })
      .finally(() => setLoading(false));
  }, [endDate, startDate]);

  useEffect(() => {
    load();
  }, [load]);

  const payrollRows = useMemo(() => report?.payrollRows ?? [], [report]);
  const attendanceRows = useMemo(() => report?.attendanceRows ?? [], [report]);
  const total = useMemo(() => payrollRows.reduce((sum, row) => sum + row.net, 0), [payrollRows]);

  function salaryCsv() {
    downloadCSV("company-report-payroll.csv", payrollRows);
    toast.success("Company payroll report CSV exported");
  }

  function salaryPdf() {
    if (!report) return;
    downloadCompanyReportPdf("company-report.pdf", report);
    toast.success("Company report PDF downloaded");
  }

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Company report for a selected period with employee, attendance, and payroll evaluations."
        actions={
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={salaryCsv}
              disabled={payrollRows.length === 0}
            >
              <Download className="mr-1.5 h-4 w-4" />
              Report CSV
            </Button>
            <Button size="sm" onClick={salaryPdf} disabled={!report}>
              <FileText className="mr-1.5 h-4 w-4" />
              Report Pdf
            </Button>
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4 shadow-[var(--shadow-elevate-sm)]">
        <Field label="From">
          <Input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </Field>
        <Field label="To">
          <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        </Field>
        <Button onClick={load}>
          <CalendarDays className="mr-1.5 h-4 w-4" />
          Generate
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <StatCard
          label="Employees"
          value={loading ? "..." : (report?.employeeCount ?? 0)}
          icon={Users}
        />
        <StatCard
          label="Total net pay"
          value={`Rs ${(total / 100000).toFixed(2)}L`}
          icon={Wallet}
        />
        <StatCard
          label="Attendance rows"
          value={loading ? "..." : attendanceRows.length}
          icon={FileText}
        />
        <StatCard
          label="Hours"
          value={loading ? "..." : (report?.totals.hours.toFixed(1) ?? "0.0")}
          icon={Timer}
        />
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-elevate-sm)]">
        <div className="border-b px-4 py-3 text-sm font-semibold">Company spending by employee</div>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Employee</TableHead>
              <TableHead>Department</TableHead>
              <TableHead className="text-right">Attendance</TableHead>
              <TableHead className="text-right">Hours</TableHead>
              <TableHead className="text-right">Overtime</TableHead>
              <TableHead className="text-right">Bonus</TableHead>
              <TableHead className="text-right">Net pay</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payrollRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                  {loading ? "Loading company report..." : "No report rows found for this period."}
                </TableCell>
              </TableRow>
            ) : (
              payrollRows.map((row) => (
                <TableRow key={row.employeeId}>
                  <TableCell>
                    <div className="text-sm font-medium">{row.name}</div>
                    <div className="text-xs text-muted-foreground">{row.empCode}</div>
                  </TableCell>
                  <TableCell>
                    <div>{row.department}</div>
                    <div className="text-xs text-muted-foreground">{row.designation}</div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.workedDays}/{row.expectedDays}
                    <div className="text-xs text-muted-foreground">{row.absentDays} absent</div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.regularHours.toFixed(1)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    Rs {row.overtime.toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    Rs {row.bonus.toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    Rs {row.net.toLocaleString("en-IN")}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-elevate-sm)]">
        <div className="border-b px-4 py-3 text-sm font-semibold">Attendance detail</div>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Employee</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>In</TableHead>
              <TableHead>Out</TableHead>
              <TableHead className="text-right">Hours</TableHead>
              <TableHead className="text-right">Face match</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attendanceRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                  {loading ? "Loading attendance..." : "No attendance rows found for this period."}
                </TableCell>
              </TableRow>
            ) : (
              attendanceRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="text-sm font-medium">{row.employee ?? "Employee"}</div>
                    <div className="text-xs text-muted-foreground">{row.employeeId}</div>
                  </TableCell>
                  <TableCell>{row.department ?? "-"}</TableCell>
                  <TableCell className="tabular-nums">{row.date}</TableCell>
                  <TableCell className="tabular-nums">{row.checkIn}</TableCell>
                  <TableCell className="tabular-nums">{row.checkOut}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.hours.toFixed(2)}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.confidence}%</TableCell>
                  <TableCell>{row.status}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-01`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
      <span>{label}</span>
      {children}
    </label>
  );
}
