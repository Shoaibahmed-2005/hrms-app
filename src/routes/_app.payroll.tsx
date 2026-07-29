import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Download, FileText, MinusCircle, Search, Timer, Wallet } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { downloadCSV } from "@/lib/csv";
import { fetchSalaryReportRows, saveIncentive, type SalaryReportRow } from "@/lib/hrms-db";
import { downloadSalaryPdf } from "@/lib/pdf";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_app/payroll")({
  head: () => ({ meta: [{ title: "Payroll - Hivetree" }] }),
  component: PayrollPage,
});

function PayrollPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<SalaryReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(monthStart());
  const [endDate, setEndDate] = useState(today());
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  const [incentiveOpen, setIncentiveOpen] = useState(false);
  const [incentiveForm, setIncentiveForm] = useState({ amount: "", reason: "" });
  const [savingIncentive, setSavingIncentive] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetchSalaryReportRows(startDate, endDate)
      .then(setRows)
      .catch((error) => {
        console.error(error);
        toast.error(error instanceof Error ? error.message : "Could not load payroll");
      })
      .finally(() => setLoading(false));
  }, [endDate, startDate]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(
    () => ({
      net: rows.reduce((sum, row) => sum + row.net, 0),
      overtime: rows.reduce((sum, row) => sum + row.overtime, 0),
      bonus: rows.reduce((sum, row) => sum + row.bonus, 0),
      deductions: rows.reduce((sum, row) => sum + row.deductions, 0),
      incentives: rows.reduce((sum, row) => sum + (row.incentives || 0), 0),
    }),
    [rows],
  );
  const filteredRows = useMemo(
    () =>
      rows.filter((row) =>
        `${row.name} ${row.empCode} ${row.department} ${row.designation} ${row.payType}`
          .toLowerCase()
          .includes(q.toLowerCase()),
      ),
    [q, rows],
  );
  const selected = rows.find((row) => row.employeeId === selectedId) ?? null;

  function exportCsv() {
    if (!selected) return toast.error("Select an employee first");
    downloadCSV(`${selected.empCode}-salary-report.csv`, [selected]);
    toast.success("Employee salary report CSV exported");
  }

  function exportPdf() {
    if (!selected) return toast.error("Select an employee first");
    downloadSalaryPdf(`${selected.empCode}-salary-report.pdf`, selected, {
      title: "CleanUp Payroll Report",
      startDate,
      endDate,
    });
    toast.success(`${selected.name}'s salary report downloaded`);
  }

  async function handleAddIncentive(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    if (!incentiveForm.amount || !incentiveForm.reason) return toast.error("Fill all fields");
    setSavingIncentive(true);
    try {
      await saveIncentive({
        employeeId: selected.employeeId,
        type: "manual",
        reason: incentiveForm.reason,
        amount: Number(incentiveForm.amount),
        month: startDate.slice(0, 7),
        createdBy: user?.name || "Manager"
      });
      toast.success("Manual incentive added");
      setIncentiveOpen(false);
      setIncentiveForm({ amount: "", reason: "" });
      load(); // Reload payroll
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add incentive");
    } finally {
      setSavingIncentive(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Payroll"
        description="Search an employee, review their pay evaluation, and generate their requested salary report."
        actions={
          <>
            <Button size="sm" variant="outline" onClick={exportCsv} disabled={!selected}>
              <Download className="mr-1.5 h-4 w-4" />
              CSV
            </Button>
            <Button size="sm" variant="outline" onClick={exportPdf} disabled={!selected}>
              <FileText className="mr-1.5 h-4 w-4" />
              {selected ? `${selected.name}'s salary report` : "Select an employee"}
            </Button>
            <Dialog open={incentiveOpen} onOpenChange={setIncentiveOpen}>
              <DialogTrigger asChild>
                <Button size="sm" disabled={!selected}>
                   Add Incentive
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Manual Incentive</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddIncentive} className="space-y-4">
                  <div className="space-y-1.5">
                     <label className="text-sm font-medium">Employee</label>
                     <Input value={selected?.name || ""} disabled />
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-sm font-medium">Reason</label>
                     <Input value={incentiveForm.reason} onChange={e => setIncentiveForm({...incentiveForm, reason: e.target.value})} placeholder="e.g. Extra shift, Performance" required />
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-sm font-medium">Amount (₹)</label>
                     <Input type="number" min="1" value={incentiveForm.amount} onChange={e => setIncentiveForm({...incentiveForm, amount: e.target.value})} required />
                  </div>
                  <div className="flex justify-end">
                     <Button type="submit" disabled={savingIncentive}>
                       {savingIncentive ? "Saving..." : "Save Incentive"}
                     </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
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
          Calculate
        </Button>
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Search employees"
            className="pl-8"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          label="Total payout"
          value={
            selected
              ? `Rs ${selected.net.toLocaleString("en-IN")}`
              : `Rs ${(totals.net / 100000).toFixed(2)}L`
          }
          icon={Wallet}
          delta={selected ? selected.name : `${rows.length} employees`}
        />
        <StatCard
          label="Overtime"
          value={`Rs ${totals.overtime.toLocaleString("en-IN")}`}
          icon={Timer}
        />
        <StatCard
          label="Bonuses"
          value={`Rs ${totals.bonus.toLocaleString("en-IN")}`}
          icon={Wallet}
        />
        <StatCard
          label="Deductions"
          value={`Rs ${totals.deductions.toLocaleString("en-IN")}`}
          icon={MinusCircle}
        />
        <StatCard
          label="Incentives"
          value={`Rs ${totals.incentives.toLocaleString("en-IN")}`}
          icon={Wallet}
        />
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-elevate-sm)]">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Employee</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>Pay type</TableHead>
              <TableHead className="text-right">Days</TableHead>
              <TableHead className="text-right">Hours</TableHead>
              <TableHead className="text-right">Base</TableHead>
              <TableHead className="text-right">Overtime</TableHead>
              <TableHead className="text-right">Bonus</TableHead>
              <TableHead className="text-right">Incentives</TableHead>
              <TableHead className="text-right">Deductions</TableHead>
              <TableHead className="text-right">Net</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="py-12 text-center text-sm text-muted-foreground">
                  {loading ? "Loading salary report..." : "No payroll rows found."}
                </TableCell>
              </TableRow>
            ) : (
              filteredRows.map((row) => (
                <TableRow
                  key={`${row.employeeId}-${row.period}`}
                  className={
                    `cursor-pointer ` +
                    `${selectedId === row.employeeId ? "bg-muted/80" : undefined}`
                  }
                  onClick={() => setSelectedId(row.employeeId)}
                >
                  <TableCell>
                    <button type="button" className="flex items-center gap-2 text-left">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold overflow-hidden">
                        {row.profileImage
                          ? <img src={row.profileImage} alt={row.name} className="h-8 w-8 rounded-full object-cover" />
                          : row.name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase()
                        }
                      </span>
                      <div>
                        <div className="text-sm font-medium text-primary">{row.name}</div>
                        <div className="text-xs text-muted-foreground">{row.empCode}</div>
                      </div>
                    </button>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div>{row.designation}</div>
                    <div className="text-xs">{row.department}</div>
                  </TableCell>
                  <TableCell className="text-sm capitalize">{row.payType}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.workedDays}/{row.expectedDays}
                    <div className="text-xs text-muted-foreground">{row.absentDays} absent</div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.regularHours.toFixed(1)}
                    <div className="text-xs text-muted-foreground">
                      {row.overtimeHours.toFixed(1)} OT
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    Rs {row.base.toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    Rs {row.overtime.toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    Rs {row.bonus.toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-success">
                    +Rs {(row.incentives || 0).toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    -Rs {row.deductions.toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    Rs {row.net.toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.status === "Finalized" ? "secondary" : "outline"}>
                      {row.status}
                    </Badge>
                  </TableCell>
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
  return new Date().toLocaleDateString("en-CA");
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
