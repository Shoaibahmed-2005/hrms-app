import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Users, CheckCircle2, AlertTriangle, IndianRupee, TrendingUp } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, Legend
} from "recharts";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const query = useQuery({
    queryKey: ["reports-dashboard"],
    queryFn: () => apiFetch("/reports/dashboard"),
    refetchInterval: 15000,
  });

  const kpi = query.data?.kpi;
  const trendData = query.data?.trendData ?? [];
  const departments = query.data?.departments ?? [];

  const pieData = kpi
    ? [
        { name: "Present", value: kpi.presentToday - kpi.lateToday, color: "#22c55e" },
        { name: "Late", value: kpi.lateToday, color: "#f59e0b" },
        { name: "Absent", value: Math.max(0, kpi.absentToday), color: "#ef4444" },
      ].filter(d => d.value > 0)
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight">Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <Link to="/attendance">
          <Button>
            Mark Attendance <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPICard
          label="Total Employees"
          value={kpi?.totalActive ?? "—"}
          sub="active in system"
          icon={Users}
          loading={query.isLoading}
          color="text-primary"
        />
        <KPICard
          label="Present Today"
          value={kpi?.presentToday ?? "—"}
          sub={kpi ? `${kpi.lateToday} late` : ""}
          icon={CheckCircle2}
          loading={query.isLoading}
          color="text-green-600"
        />
        <KPICard
          label="Absent Today"
          value={kpi?.absentToday ?? "—"}
          sub="not checked in"
          icon={AlertTriangle}
          loading={query.isLoading}
          color="text-amber-600"
        />
        <KPICard
          label="Today's Payroll"
          value={kpi ? `₹${Number(kpi.todayEarnings).toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "—"}
          sub={kpi ? `₹${Number(kpi.monthEarnings).toLocaleString("en-IN", { maximumFractionDigits: 0 })} this month` : ""}
          icon={IndianRupee}
          loading={query.isLoading}
          color="text-blue-600"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickAction to="/attendance" label="Mark Attendance" desc="Check employees in or out" icon="🕐" />
        <QuickAction to="/employees/new" label="Register Employee" desc="Add a new team member" icon="👤" />
        <QuickAction to="/reports" label="View Reports" desc="Earnings & attendance history" icon="📊" />
        <QuickAction to="/notifications" label="Notifications" desc="View alerts and requests" icon="🔔" />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Attendance trend */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Attendance — Last 30 Days
            </CardTitle>
            <CardDescription>Daily check-in count</CardDescription>
          </CardHeader>
          <CardContent className="h-56 sm:h-64">
            {query.isLoading ? <Skeleton className="h-full w-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} barCategoryGap="15%">
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    stroke="var(--muted-foreground)"
                    interval={4}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    stroke="var(--muted-foreground)"
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    width={24}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      fontSize: 12,
                    }}
                    cursor={{ fill: "var(--muted)" }}
                  />
                  <Bar dataKey="count" fill="var(--primary)" radius={[6, 6, 0, 0]} name="Present" maxBarSize={60} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Today's attendance donut */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-base">Today's Status</CardTitle>
            <CardDescription>Present / Late / Absent</CardDescription>
          </CardHeader>
          <CardContent>
            {query.isLoading ? <Skeleton className="h-40 w-full" /> : (
              pieData.length === 0 ? (
                <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                  No attendance data yet today
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%" cy="50%"
                        innerRadius={25} outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-3 text-xs">
                    {pieData.map(d => (
                      <div key={d.name} className="flex items-center gap-1.5">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                        <span className="text-muted-foreground">{d.name}</span>
                        <span className="font-semibold">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}
          </CardContent>
        </Card>
      </div>

      {/* Department + Earnings Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Employees by dept */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-base">Employees by Department</CardTitle>
          </CardHeader>
          <CardContent className="h-44">
            {query.isLoading ? <Skeleton className="h-full w-full" /> : (
              departments.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departments} layout="vertical" barCategoryGap="10%">
                    <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} stroke="var(--muted-foreground)" allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} stroke="var(--muted-foreground)" width={80} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} cursor={{ fill: "var(--muted)" }} />
                    <Bar dataKey="count" fill="var(--primary)" radius={[0, 6, 6, 0]} name="Employees" maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              )
            )}
          </CardContent>
        </Card>

        {/* Earnings Trend */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-base">Attendance Trend Detail</CardTitle>
            <CardDescription>Last 30 days — line view</CardDescription>
          </CardHeader>
          <CardContent className="h-44">
            {query.isLoading ? <Skeleton className="h-full w-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" interval={6} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" allowDecimals={false} tickLine={false} axisLine={false} width={24} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Line
                    type="monotone" dataKey="count" stroke="var(--primary)"
                    strokeWidth={4} dot={{ r: 4, fill: "var(--primary)" }} name="Present"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>


    </div>
  );
}

function KPICard({ label, value, sub, icon: Icon, loading, color = "text-foreground" }: {
  label: string; value: string | number; sub?: string; icon: any; loading: boolean; color?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
        {loading
          ? <Skeleton className="h-8 w-20" />
          : <div className={`font-serif text-2xl sm:text-3xl font-semibold ${color}`}>{value}</div>
        }
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function QuickAction({ to, label, desc, icon }: { to: string; label: string; desc: string; icon: string }) {
  return (
    <Link to={to}>
      <Card className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-sm">
        <CardContent className="flex items-center gap-4 p-4">
          <span className="text-2xl">{icon}</span>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{label}</p>
            <p className="text-xs text-muted-foreground truncate">{desc}</p>
          </div>
          <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
        </CardContent>
      </Card>
    </Link>
  );
}
