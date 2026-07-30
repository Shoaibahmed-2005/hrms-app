import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BarChart2, TrendingUp, UserCheck, Users, UserX, Wallet, Building2 } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { downloadCSV } from "@/lib/csv";
import { fetchDashboardData, fetchOutlets, type DashboardData } from "@/lib/hrms-db";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Manager Dashboard - Cleans HRMS" }] }),
  component: ManagerDashboard,
});

const EMPTY_DASHBOARD: DashboardData = {
  configured: true,
  totalEmployees: 0,
  presentToday: 0,
  absentToday: 0,
  onLeaveToday: 0,
  payrollTotal: 0,
  attendanceTrend: [],
  recentActivities: [],
};

function ManagerDashboard() {
  const [data, setData] = useState<DashboardData>(EMPTY_DASHBOARD);
  const [outlets, setOutlets] = useState<{id: string, name: string}[]>([]);
  const [outletId, setOutletId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    let alive = true;
    setLoading(true);
    fetchDashboardData(outletId || undefined)
      .then((next) => {
        if (!alive) return;
        setData(next);
        setError(null);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "Could not load dashboard data");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [outletId]);

  useEffect(() => {
    fetchOutlets().then(setOutlets).catch(console.error);
  }, []);

  useEffect(() => {
    return load();
  }, [load]);

  const availability = data.totalEmployees
    ? Math.round((data.presentToday / data.totalEmployees) * 100)
    : 0;

  return (
    <div>
      <PageHeader
        title="Manager Dashboard"
        description="A live pulse on your workforce today."
        actions={
          <div className="flex items-center gap-3">
            <select
              className="flex h-9 w-48 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={outletId}
              onChange={(e) => setOutletId(e.target.value)}
            >
              <option value="">All Outlets</option>
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
            <Button
              size="sm"
              onClick={() => {
                downloadCSV("manager-report.csv", data.attendanceTrend);
                toast.success("Report downloaded");
              }}
              disabled={data.attendanceTrend.length === 0}
            >
              Download report
            </Button>
          </div>
        }
      />

      {error ? <Notice tone="error">{error}</Notice> : null}
      {!data.configured ? (
        <Notice>Connect Supabase in `.env` to load real dashboard data.</Notice>
      ) : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Employees"
          value={loading ? "..." : data.totalEmployees}
          icon={Users}
        />
        <StatCard
          label="Present Today"
          value={loading ? "..." : data.presentToday}
          icon={UserCheck}
          delta={data.totalEmployees ? `${availability}% available` : undefined}
          trend="up"
        />
        <StatCard label="Absent" value={loading ? "..." : data.absentToday} icon={UserX} />
        <StatCard
          label="Payroll"
          value={loading ? "..." : `Rs ${(data.payrollTotal / 100000).toFixed(1)}L`}
          icon={Wallet}
          delta="Calculated from attendance"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-slate-100 dark:border-[#1B3A5C] bg-card p-6 shadow-xl shadow-slate-200/50 dark:shadow-none">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Attendance trend</div>
              <div className="text-xs text-muted-foreground">Last 7 days from attendance table</div>
            </div>
            <Badge variant="secondary" className="gap-1">
              <TrendingUp className="h-3 w-3" />
              Live
            </Badge>
          </div>
          <div className="h-64">
            {data.attendanceTrend.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data.attendanceTrend}
                  margin={{ left: -20, right: 8, top: 8, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    stroke="var(--color-muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--color-muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="present"
                    stroke="var(--color-primary)"
                    fill="url(#g1)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="absent"
                    stroke="var(--color-destructive)"
                    fill="transparent"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                label={loading ? "Loading attendance..." : "No attendance records yet."}
              />
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 dark:border-[#1B3A5C] bg-card p-6 shadow-xl shadow-slate-200/50 dark:shadow-none">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <BarChart2 className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="text-sm font-semibold">Workforce Analytics</div>
              <div className="text-xs text-muted-foreground">Based on live attendance inputs</div>
            </div>
          </div>
          <div className="text-3xl font-semibold tabular-nums">{availability}%</div>
          <div className="text-xs text-muted-foreground">current availability baseline</div>
          <div className="mt-4 space-y-2 text-sm">
            <Row
              label="Attendance trend"
              value={data.presentToday >= data.absentToday ? "Stable" : "Needs review"}
              tone={data.presentToday >= data.absentToday ? "ok" : "warn"}
            />
            <Row label="Payroll" value="Auto calculated" tone="ok" />
            <Row
              label="Data source"
              value={data.configured ? "Database" : "Not connected"}
              tone={data.configured ? "ok" : "bad"}
            />
          </div>
          <Button variant="ghost" size="sm" className="mt-4 w-full justify-between" asChild>
            <Link to="/analytics">
              View full analytics <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-100 dark:border-[#1B3A5C] bg-card p-6 shadow-xl shadow-slate-200/50 dark:shadow-none">
        <div className="mb-3 text-sm font-semibold">Recent activity</div>
        {data.recentActivities.length ? (
          <ul className="space-y-3">
            {data.recentActivities.map((activity) => (
              <li key={activity.id} className="flex items-start gap-3">
                <div className="mt-0.5 h-2 w-2 rounded-full bg-primary" />
                <div className="flex-1 text-sm">
                  <span className="font-medium">{activity.who}</span>{" "}
                  <span className="text-muted-foreground">{activity.what}</span>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{activity.when}</span>
                    <span>-</span>
                    <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
                      {activity.tag}
                    </Badge>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState label={loading ? "Loading activity..." : "No activity yet."} />
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "ok" | "warn" | "bad";
}) {
  const dot =
    tone === "ok"
      ? "bg-[oklch(var(--success))]"
      : tone === "warn"
        ? "bg-[oklch(var(--warning))]"
        : "bg-destructive";
  return (
    <div className="flex items-center justify-between rounded-md border bg-background px-3 py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5 font-medium">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        {value}
      </span>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-32 items-center justify-center rounded-lg border border-dashed bg-background text-sm text-muted-foreground">
      {label}
    </div>
  );
}

function Notice({
  children,
  tone = "info",
}: {
  children: React.ReactNode;
  tone?: "info" | "error";
}) {
  return (
    <div
      className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
        tone === "error"
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "bg-card text-muted-foreground"
      }`}
    >
      {children}
    </div>
  );
}
