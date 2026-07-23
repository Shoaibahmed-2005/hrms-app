import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Download, Search } from "lucide-react";
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
import { fetchAttendanceHistory, type AttendanceEntry } from "@/lib/hrms-db";

export const Route = createFileRoute("/_app/attendance-history")({
  head: () => ({ meta: [{ title: "Attendance History - Hivetree" }] }),
  component: AttendanceHistoryPage,
});

function today() {
  return new Date().toISOString().slice(0, 10);
}

function AttendanceHistoryPage() {
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(today());
  const [rows, setRows] = useState<AttendanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAttendanceHistory(startDate, endDate);
      setRows(data);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Could not load attendance history");
    } finally {
      setLoading(false);
    }
  }, [endDate, startDate]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = rows.filter((row) =>
    `${row.employee ?? ""} ${row.employeeId ?? ""} ${row.department ?? ""}`
      .toLowerCase()
      .includes(q.toLowerCase()),
  );
  const hours = filtered.reduce((sum, row) => sum + row.hours, 0);

  function exportCsv() {
    downloadCSV("attendance-history.csv", filtered);
    toast.success("Attendance history exported");
  }

  return (
    <div>
      <PageHeader
        title="Attendance History"
        description="Face scanner attendance by employee and selected day or period."
        actions={
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download className="mr-1.5 h-4 w-4" />
            CSV
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Records" value={loading ? "..." : filtered.length} icon={CalendarDays} />
        <StatCard label="Hours" value={hours.toFixed(1)} />
        <StatCard
          label="Avg match"
          value={
            filtered.length
              ? `${Math.round(filtered.reduce((sum, row) => sum + row.confidence, 0) / filtered.length)}%`
              : "-"
          }
        />
        <StatCard label="Range" value={startDate === endDate ? startDate : "Custom"} />
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4 shadow-[var(--shadow-elevate-sm)]">
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
        <Button onClick={() => void load()}>Apply</Button>
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Search employee"
            className="pl-8"
          />
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-elevate-sm)]">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Employee</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>In</TableHead>
              <TableHead>Out</TableHead>
              <TableHead className="text-right">Hours</TableHead>
              <TableHead className="text-right">Face match</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                  {loading ? "Loading attendance..." : "No attendance found for this period."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="text-sm font-medium">{row.employee ?? "Employee"}</div>
                    <div className="text-xs text-muted-foreground">{row.employeeId}</div>
                  </TableCell>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
      <span>{label}</span>
      {children}
    </label>
  );
}
