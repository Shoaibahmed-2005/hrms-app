import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/geo";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/reports")({
  component: Reports,
});

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function Reports() {
  const reports = useQuery({
    queryKey: ["reports"],
    queryFn: () => apiFetch("/reports").catch(() => ({ deptCost: [], leaveByKind: [] })),
  });

  const deptCost = reports.data?.deptCost ?? [];
  const leaveByKind = reports.data?.leaveByKind ?? [];

  return (
    <div className="space-y-6">
      <div><h1 className="font-serif text-3xl font-semibold tracking-tight">Reports</h1><p className="mt-1 text-sm text-muted-foreground">Workforce analytics</p></div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="font-serif">Monthly cost by department</CardTitle><CardDescription>Based on active base salaries</CardDescription></CardHeader>
          <CardContent className="h-72">
            {reports.isLoading ? <Skeleton className="h-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptCost}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" tickFormatter={(v) => formatCurrency(v).replace(/\.00$/, "")} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", fontSize: 12 }} />
                  <Bar dataKey="value" fill="var(--primary)" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="font-serif">Approved leave by type</CardTitle></CardHeader>
          <CardContent className="h-72">
            {reports.isLoading ? <Skeleton className="h-full" /> : leaveByKind.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No approved leave yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={leaveByKind} dataKey="value" nameKey="name" outerRadius={90} label>
                    {leaveByKind.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="font-serif">Export</CardTitle><CardDescription>CSV/PDF export utilities</CardDescription></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">Structured CSV downloads for attendance, leave, and payroll will appear here. Managers can currently export payroll from the Payroll page.</p></CardContent>
      </Card>
    </div>
  );
}
