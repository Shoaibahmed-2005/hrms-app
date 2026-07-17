import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/geo";
import { toast } from "sonner";
import { useState } from "react";
import { Play, Lock, Download } from "lucide-react";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/payroll")({
  component: PayrollPage,
});

function PayrollPage() {
  const { role } = useAuth();
  return role === "manager" ? <ManagerPayroll /> : <EmployeePayroll />;
}

function ManagerPayroll() {
  const qc = useQueryClient();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const query = useQuery({
    queryKey: ["payroll"],
    queryFn: () => apiFetch("/payroll"),
  });

  const period = query.data?.find((p: any) => p.month === month && p.year === year);
  const entries = period?.entries ?? [];

  const totalPayout = entries.reduce((s: number, e: any) => s + Number(e.netPay), 0);

  const runGen = async () => {
    try {
      await apiFetch("/payroll/generate", {
        method: "POST",
        body: JSON.stringify({ month, year })
      });
      toast.success(`Generated payroll`);
      qc.invalidateQueries();
    } catch (e: any) {
      toast.error(e.message || "Failed to generate payroll");
    }
  };
  
  const runFin = async () => {
    if (!period) return;
    try {
      await apiFetch(`/payroll/${period.id}/finalize`, { method: "POST" });
      toast.success("Payroll finalized");
      qc.invalidateQueries();
    } catch (e: any) {
      toast.error(e.message || "Failed to finalize payroll");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">Payroll</h1>
        <p className="mt-1 text-sm text-muted-foreground">Generate and finalize pay for each period</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b">
          <div className="flex items-center gap-2">
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <SelectItem key={m} value={String(m)}>{new Date(2000, m - 1, 1).toLocaleString(undefined, { month: "long" })}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>{[year - 1, year, year + 1].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
            {period && <Badge variant={period.status === "FINALIZED" ? "default" : "outline"} className="capitalize">{period.status}</Badge>}
          </div>
          <div className="flex gap-2">
            <Button onClick={runGen} disabled={period?.status === "FINALIZED"}><Play className="mr-1 h-4 w-4" /> Generate</Button>
            <Button variant="outline" onClick={runFin} disabled={!period || period.status === "FINALIZED"}><Lock className="mr-1 h-4 w-4" /> Finalize</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {query.isLoading ? <div className="p-6"><Skeleton className="h-24" /></div> :
            !period ? <div className="p-8 text-center text-sm text-muted-foreground">No payroll generated for this period yet.</div> :
            entries.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">Period exists but has no entries.</div> : (
              <>
                <Table>
                  <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Base</TableHead><TableHead>Leave ded.</TableHead><TableHead>½-day ded.</TableHead><TableHead>OT pay</TableHead><TableHead className="text-right">Net pay</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {entries.map((e: any) => (
                      <TableRow key={e.id}>
                        <TableCell><div className="font-medium">{e.employee?.name}</div><div className="text-xs text-muted-foreground">{e.employee?.employeeCode}</div></TableCell>
                        <TableCell>{formatCurrency(Number(e.employee?.baseSalary || 0))}</TableCell>
                        <TableCell className="text-destructive">{formatCurrency(0)}</TableCell>
                        <TableCell className="text-destructive">{formatCurrency(0)}</TableCell>
                        <TableCell className="text-primary">{formatCurrency(0)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(Number(e.netPay))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex justify-end border-t px-6 py-3 text-sm">
                  <span className="text-muted-foreground">Total payout:&nbsp;</span><span className="font-semibold">{formatCurrency(totalPayout)}</span>
                </div>
              </>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

function EmployeePayroll() {
  const { fullName } = useAuth();
  const query = useQuery({
    queryKey: ["my-payslips"],
    queryFn: () => apiFetch("/payroll")
  });
  
  const entries = (query.data ?? []).flatMap((p: any) => p.entries.map((e: any) => ({ ...e, payrollPeriod: p })));

  const printPayslip = (e: any) => {
    const html = `<html><head><title>Payslip</title><style>
      body{font-family:Georgia,serif;padding:40px;color:#222}
      .h{border-bottom:2px solid #222;padding-bottom:12px;margin-bottom:20px}
      table{width:100%;border-collapse:collapse;margin-top:20px}
      td{padding:8px;border-bottom:1px solid #ddd}
      .r{text-align:right}.t{font-weight:bold;background:#f6f2ec}
    </style></head><body>
      <div class="h"><h1 style="margin:0">Payslip</h1><p>${new Date(2000, e.payrollPeriod.month - 1, 1).toLocaleString(undefined, { month: "long" })} ${e.payrollPeriod.year}</p></div>
      <p><strong>${fullName}</strong></p>
      <table>
        <tr><td>Base salary</td><td class="r">${formatCurrency(Number(e.employee?.baseSalary || 0))}</td></tr>
        <tr><td>Leave deduction</td><td class="r">-${formatCurrency(0)}</td></tr>
        <tr><td>Half-day deduction</td><td class="r">-${formatCurrency(0)}</td></tr>
        <tr><td>Overtime pay</td><td class="r">+${formatCurrency(0)}</td></tr>
        <tr class="t"><td>Net pay</td><td class="r">${formatCurrency(Number(e.netPay))}</td></tr>
      </table>
      <p style="margin-top:40px;font-size:12px;color:#666">Status: ${e.payrollPeriod.status}</p>
    </body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">Payroll</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your monthly payslips</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="font-serif">History</CardTitle></CardHeader>
        <CardContent className="p-0">
          {query.isLoading ? <div className="p-6"><Skeleton className="h-24" /></div> :
            entries.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">No payslips yet.</div> : (
              <Table>
                <TableHeader><TableRow><TableHead>Period</TableHead><TableHead>Net pay</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {entries.map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell>{new Date(2000, e.payrollPeriod.month - 1, 1).toLocaleString(undefined, { month: "long" })} {e.payrollPeriod.year}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(Number(e.netPay))}</TableCell>
                      <TableCell><Badge variant={e.payrollPeriod.status === "FINALIZED" ? "default" : "outline"}>{e.payrollPeriod.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => printPayslip(e)} disabled={e.payrollPeriod.status === "DRAFT"}><Download className="mr-1 h-3.5 w-3.5" /> Payslip</Button>
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
