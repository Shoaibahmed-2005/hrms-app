import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, TrendingUp, Users, CheckCircle2, AlertTriangle, IndianRupee, BarChart2 } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip,
} from "recharts";
import { PageHeader } from "@/components/page-header";
import { fetchDashboardData, fetchEmployees, fetchAttendanceHistory } from "@/lib/hrms-db";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/analytics")({
  head: () => ({ meta: [{ title: "Analytics - Cleans HRMS" }] }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState({ totalEmployees: 0, presentToday: 0, absentToday: 0, payrollTotal: 0 });
  const [trendData, setTrendData] = useState<{ date: string; count: number }[]>([]);
  const [pieData, setPieData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [deptData, setDeptData] = useState<{ name: string; count: number }[]>([]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [dashboard, employees, sessions] = await Promise.all([
          fetchDashboardData(),
          fetchEmployees(),
          fetchAttendanceHistory(
            new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
            new Date().toISOString().slice(0, 10)
          ),
        ]);

        setKpi({
          totalEmployees: dashboard.totalEmployees,
          presentToday: dashboard.presentToday,
          absentToday: dashboard.absentToday,
          payrollTotal: dashboard.payrollTotal,
        });

        // Build 30-day attendance trend
        const today = new Date();
        const countByDate: Record<string, number> = {};
        for (let i = 29; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const iso = d.toISOString().slice(0, 10);
          const label = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
          countByDate[iso] = 0;
          setTrendData(prev => [...prev.filter(x => x.date !== label), { date: label, count: 0 }]);
        }
        sessions.forEach((s: any) => {
          if (countByDate[s.date] !== undefined) {
            countByDate[s.date]++;
          }
        });
        const trend = Object.entries(countByDate).map(([iso, count]) => {
          const d = new Date(iso);
          return {
            date: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
            count,
          };
        });
        setTrendData(trend);

        // Today's attendance breakdown
        const todayIso = today.toISOString().slice(0, 10);
        const todaySessions = sessions.filter((s: any) => s.date === todayIso);
        const present = todaySessions.filter((s: any) => ["Present", "Completed", "Active"].includes(s.status)).length;
        const late = todaySessions.filter((s: any) => s.status === "Late").length;
        const absent = Math.max(0, dashboard.totalEmployees - present - late);
        const pie = [
          { name: "Present", value: present, color: "#22c55e" },
          { name: "Late", value: late, color: "#f59e0b" },
          { name: "Absent", value: absent, color: "#ef4444" },
        ].filter(d => d.value > 0);
        setPieData(pie);

        // Department breakdown
        const deptCount: Record<string, number> = {};
        employees.forEach((e: any) => {
          const dept = e.department || "Unknown";
          deptCount[dept] = (deptCount[dept] || 0) + 1;
        });
        setDeptData(Object.entries(deptCount).map(([name, count]) => ({ name, count })));
      } catch (err) {
        toast.error("Failed to load analytics");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Attendance trends, workforce breakdown, and payroll overview."
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPICard label="Total Employees" value={loading ? "—" : kpi.totalEmployees} sub="active in system" icon={Users} loading={loading} color="text-primary" />
        <KPICard label="Present Today" value={loading ? "—" : kpi.presentToday} sub="checked in" icon={CheckCircle2} loading={loading} color="text-green-600" />
        <KPICard label="Absent Today" value={loading ? "—" : kpi.absentToday} sub="not checked in" icon={AlertTriangle} loading={loading} color="text-amber-600" />
        <KPICard
          label="Month Payroll"
          value={loading ? "—" : `₹${Number(kpi.payrollTotal).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
          sub="based on attendance"
          icon={IndianRupee}
          loading={loading}
          color="text-blue-600"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickAction to="/attendance-history" label="Attendance History" desc="View all check-in records" icon="🕐" />
        <QuickAction to="/employees" label="Employees" desc="View & manage staff" icon="👤" />
        <QuickAction to="/reports" label="Reports" desc="Earnings & attendance reports" icon="📊" />
        <QuickAction to="/outlets" label="Outlets" desc="Manage outlet locations" icon="🏪" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Attendance Bar Chart - 30 days */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-xl shadow-slate-200/50 dark:shadow-none">
          <div className="mb-4">
            <div className="text-sm font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Attendance — Last 30 Days</div>
            <div className="text-xs text-muted-foreground">Daily check-in count per day</div>
          </div>
          <div className="h-56">
            {loading ? <div className="h-full w-full animate-pulse rounded-lg bg-muted" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} barCategoryGap="15%">
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" interval={4} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" allowDecimals={false} tickLine={false} axisLine={false} width={24} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 12 }} cursor={{ fill: "var(--muted)" }} />
                  <Bar dataKey="count" fill="var(--color-primary, #5B9BD5)" radius={[6, 6, 0, 0]} name="Present" maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Today's Pie Chart */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl shadow-slate-200/50 dark:shadow-none">
          <div className="mb-4">
            <div className="text-sm font-semibold">Today's Status</div>
            <div className="text-xs text-muted-foreground">Present / Late / Absent</div>
          </div>
          {loading ? <div className="h-40 w-full animate-pulse rounded-lg bg-muted" /> : (
            pieData.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">No attendance today</div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={28} outerRadius={65} paddingAngle={2} dataKey="value" stroke="none">
                      {pieData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
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
        </div>
      </div>

      {/* Charts Row 2 */}
      <div>
        {/* Employees by Department */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl shadow-slate-200/50 dark:shadow-none">
          <div className="mb-4">
            <div className="text-sm font-semibold">Employees by Department</div>
          </div>
          <div className="h-44">
            {loading ? <div className="h-full w-full animate-pulse rounded-lg bg-muted" /> : (
              deptData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptData} layout="vertical" barCategoryGap="10%">
                    <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} stroke="var(--muted-foreground)" allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} stroke="var(--muted-foreground)" width={90} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} cursor={{ fill: "var(--muted)" }} />
                    <Bar dataKey="count" fill="var(--color-primary, #5B9BD5)" radius={[0, 6, 6, 0]} name="Employees" maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ label, value, sub, icon: Icon, loading, color = "text-foreground" }: {
  label: string; value: string | number; sub?: string; icon: any; loading: boolean; color?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-xl shadow-slate-200/50 dark:shadow-none">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      {loading
        ? <div className="h-8 w-24 animate-pulse rounded bg-muted" />
        : <div className={`text-2xl sm:text-3xl font-bold tracking-tight ${color}`}>{value}</div>
      }
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function QuickAction({ to, label, desc, icon }: { to: string; label: string; desc: string; icon: string }) {
  return (
    <Link to={to}>
      <div className="cursor-pointer rounded-2xl border border-border bg-card p-4 shadow-xl shadow-slate-200/50 dark:shadow-none transition-all hover:border-primary/50 hover:shadow-md flex items-center gap-4">
        <span className="text-2xl">{icon}</span>
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{label}</p>
          <p className="text-xs text-muted-foreground truncate">{desc}</p>
        </div>
        <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
    </Link>
  );
}
