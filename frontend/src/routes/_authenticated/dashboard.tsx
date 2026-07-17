import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/geo";
import { ArrowRight, Users, Clock, Plane, Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { role } = useAuth();
  return role === "manager" ? <ManagerDash /> : <EmployeeDash />;
}

function ManagerDash() {
  const query = useQuery({
    queryKey: ["mgr-dashboard"],
    queryFn: () => apiFetch("/dashboard/manager")
  });

  const totals = query.data?.totals;
  const trendData = query.data?.trend ?? [];

  // AI trend prediction (simple linear regression on last 30 days)
  const prediction = (() => {
    if (trendData.length < 5) return null;
    const n = trendData.length;
    const xs = trendData.map((_: any, i: number) => i);
    const ys = trendData.map((r: any) => r.count);
    const mx = xs.reduce((a: number, b: number) => a + b, 0) / n;
    const my = ys.reduce((a: number, b: number) => a + b, 0) / n;
    const num = xs.reduce((s: number, x: number, i: number) => s + (x - mx) * (ys[i] - my), 0);
    const den = xs.reduce((s: number, x: number) => s + (x - mx) ** 2, 0) || 1;
    const slope = num / den;
    const nextAvg = Math.max(0, Math.round(my + slope * n));
    const dirUp = slope > 0.05;
    const dirDown = slope < -0.05;
    return { nextAvg, slope, dirUp, dirDown };
  })();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">Workforce at a glance</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Employees" value={totals ? `${totals.active}/${totals.total}` : "—"} sub="Active / Total" loading={query.isLoading} />
        <StatCard icon={Clock} label="Present today" value={totals ? String(totals.present) : "—"} sub={totals ? `${totals.late} late` : ""} loading={query.isLoading} />
        <StatCard icon={Plane} label="Pending leave" value={totals ? String(totals.pending) : "—"} sub="Awaiting decision" loading={query.isLoading} />
        <StatCard icon={Wallet} label="Payroll" value="View" sub="Current period" loading={false} href="/payroll" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-serif">Attendance — last 30 days</CardTitle>
            <CardDescription>Daily check-in count</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {query.isLoading ? <Skeleton className="h-full w-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", fontSize: 12 }} />
                  <Line type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Workforce forecast</CardTitle>
            <CardDescription>AI trend prediction</CardDescription>
          </CardHeader>
          <CardContent>
            {prediction ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="font-serif text-4xl font-semibold">{prediction.nextAvg}</span>
                  <span className="text-sm text-muted-foreground">est. daily attendance next period</span>
                </div>
                <p className="mt-3 flex items-center gap-2 text-sm">
                  {prediction.dirUp ? <TrendingUp className="h-4 w-4 text-primary" /> : prediction.dirDown ? <TrendingDown className="h-4 w-4 text-destructive" /> : null}
                  <span className="text-muted-foreground">
                    {prediction.dirUp ? "Attendance is trending upward." : prediction.dirDown ? "Attendance has been declining." : "Attendance is stable."}
                  </span>
                </p>
              </>
            ) : <p className="text-sm text-muted-foreground">Not enough data yet.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmployeeDash() {
  const { fullName } = useAuth();
  const query = useQuery({
    queryKey: ["emp-dashboard"],
    queryFn: () => apiFetch("/dashboard/employee")
  });

  const att = query.data?.att;
  const balances = query.data?.balances ?? [];
  const lastPay = query.data?.lastPay;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">Welcome, {fullName.split(" ")[0] || "there"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="font-serif text-lg">Today</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {query.isLoading ? <Skeleton className="h-16" /> : att ? (
              <>
                <div className="text-sm">
                  <div>Check-in: <strong>{att.checkInTime ? new Date(att.checkInTime).toLocaleTimeString() : "—"}</strong></div>
                  <div>Check-out: <strong>{att.checkOutTime ? new Date(att.checkOutTime).toLocaleTimeString() : "—"}</strong></div>
                </div>
                {att.status === 'LATE' && <Badge variant="destructive">Late</Badge>}
              </>
            ) : <p className="text-sm text-muted-foreground">No attendance yet today.</p>}
            <Link to="/attendance"><Button size="sm" className="w-full">Go to attendance <ArrowRight className="ml-1 h-3 w-3" /></Button></Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="font-serif text-lg">Leave balance</CardTitle></CardHeader>
          <CardContent>
            {query.isLoading ? <Skeleton className="h-16" /> : (
              <div className="space-y-1 text-sm">
                {balances.map((b: any) => (
                  <div key={b.id} className="flex justify-between"><span className="capitalize text-muted-foreground">{b.leaveType?.name}</span><span className="font-medium">{Number(b.balanceDays)} days</span></div>
                ))}
                {balances.length === 0 && <p className="text-muted-foreground">No balance data.</p>}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="font-serif text-lg">Latest payslip</CardTitle></CardHeader>
          <CardContent>
            {query.isLoading ? <Skeleton className="h-16" /> : lastPay ? (
              <>
                <div className="font-serif text-2xl font-semibold">{formatCurrency(Number(lastPay.netPay))}</div>
                <p className="text-xs text-muted-foreground">
                  {String(lastPay.payrollPeriod?.month).padStart(2, "0")}/{lastPay.payrollPeriod?.year} · {lastPay.payrollPeriod?.status}
                </p>
              </>
            ) : <p className="text-sm text-muted-foreground">No payroll yet.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, loading, href }: { icon: any; label: string; value: string; sub?: string; loading: boolean; href?: string }) {
  const inner = (
    <Card className={href ? "transition-colors hover:border-primary/50" : ""}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-8 w-24" /> : <div className="font-serif text-3xl font-semibold">{value}</div>}
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
  return href ? <Link to={href}>{inner}</Link> : inner;
}
