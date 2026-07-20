import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Wallet, Play, Lock, ChevronDown, ChevronUp, IndianRupee } from "lucide-react";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/payroll")({
  component: PayrollPage,
});

function PayrollPage() {
  const qc = useQueryClient();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [busy, setBusy] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const periods = useQuery({
    queryKey: ["payroll"],
    queryFn: () => apiFetch("/payroll"),
  });

  const generate = async () => {
    setBusy(true);
    try {
      await apiFetch("/payroll/generate", {
        method: "POST",
        body: JSON.stringify({ month: Number(month), year: Number(year) }),
      });
      toast.success(`Payroll generated for ${new Date(year, month - 1).toLocaleString("en-IN", { month: "long", year: "numeric" })}`);
      qc.invalidateQueries({ queryKey: ["payroll"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to generate payroll");
    } finally {
      setBusy(false);
    }
  };

  const finalize = async (id: string) => {
    try {
      await apiFetch(`/payroll/${id}/finalize`, { method: "POST" });
      toast.success("Payroll finalized!");
      qc.invalidateQueries({ queryKey: ["payroll"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to finalize");
    }
  };

  const totalThisMonth = (periods.data?.[0]?.entries ?? []).reduce(
    (s: number, e: any) => s + (e.netPay ?? 0), 0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight">Payroll</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Attendance-based automatic payroll calculation
        </p>
      </div>

      {/* Generate Panel */}
      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle className="font-serif text-base flex items-center gap-2">
            <Play className="h-4 w-4" /> Generate Payroll
          </CardTitle>
          <CardDescription>
            Calculates payroll from attendance records for each employee
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Month</Label>
              <select
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={month}
                onChange={e => setMonth(Number(e.target.value))}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2024, i).toLocaleString("en-IN", { month: "long" })}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Year</Label>
              <Input
                type="number"
                value={year}
                onChange={e => setYear(Number(e.target.value))}
                className="w-28"
                min={2020}
                max={2100}
              />
            </div>
            <Button onClick={generate} disabled={busy}>
              {busy ? "Generating…" : "Generate"}
              <Play className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            ℹ️ Hourly employees: Hours × Rate. Monthly employees: Salary ÷ 26 per working day. Half-days counted at 50%.
          </p>
        </CardContent>
      </Card>

      {/* Payroll Periods */}
      {periods.isLoading ? (
        <Skeleton className="h-64" />
      ) : (periods.data ?? []).length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center text-sm text-muted-foreground">
            No payroll periods yet. Generate one above.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {(periods.data ?? []).map((period: any) => {
            const expanded = expandedId === period.id;
            const total = period.entries.reduce((s: number, e: any) => s + (e.netPay ?? 0), 0);
            return (
              <Card key={period.id} className={period.status === "FINALIZED" ? "border-green-200 dark:border-green-900" : ""}>
                <CardHeader className="border-b">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <button
                        className="flex items-center gap-2"
                        onClick={() => setExpandedId(expanded ? null : period.id)}
                      >
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                        <span className="font-serif font-semibold">
                          {new Date(period.year, period.month - 1).toLocaleString("en-IN", { month: "long", year: "numeric" })}
                        </span>
                        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                      <Badge
                        variant={period.status === "FINALIZED" ? "default" : "secondary"}
                        className="text-[10px]"
                      >
                        {period.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold">
                        ₹{total.toLocaleString("en-IN", { maximumFractionDigits: 0 })} total
                      </span>
                      {period.status !== "FINALIZED" && (
                        <Button size="sm" variant="outline" onClick={() => finalize(period.id)}>
                          <Lock className="mr-1.5 h-3.5 w-3.5" /> Finalize
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>

                {expanded && (
                  <CardContent className="p-0 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Days</TableHead>
                          <TableHead>Hours</TableHead>
                          <TableHead>Full Days</TableHead>
                          <TableHead>Half Days</TableHead>
                          <TableHead>Net Pay</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {period.entries.map((e: any) => (
                          <TableRow key={e.id}>
                            <TableCell>
                              <div className="font-medium text-sm">{e.employee?.name}</div>
                              <div className="text-xs text-muted-foreground">{e.employee?.department}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px]">{e.employee?.paymentType}</Badge>
                            </TableCell>
                            <TableCell className="text-sm">{e.totalDays}</TableCell>
                            <TableCell className="text-sm">{Number(e.totalHours).toFixed(1)}h</TableCell>
                            <TableCell className="text-sm">{e.fullDays}</TableCell>
                            <TableCell className="text-sm">{e.halfDays}</TableCell>
                            <TableCell className="font-semibold text-sm">
                              ₹{Number(e.netPay).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
