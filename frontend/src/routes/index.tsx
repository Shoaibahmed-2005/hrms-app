import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && user) router.navigate({ to: "/dashboard" });
  }, [loading, user, router]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-sm bg-primary" />
            <span className="font-serif text-lg font-semibold">HRMS</span>
          </div>
          <Link to="/auth"><Button variant="default">Sign in</Button></Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-24 text-center">
        <p className="mb-4 text-sm uppercase tracking-widest text-muted-foreground">Enterprise workforce platform</p>
        <h1 className="font-serif text-5xl font-semibold tracking-tight md:text-6xl">
          Modern HR, run with precision.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground md:text-lg">
          Attendance with face-verification and geofencing, leave, payroll, and workforce analytics — in one classic, secure system.
        </p>
        <div className="mt-10 flex justify-center gap-3">
          <Link to="/auth"><Button size="lg">Sign in to your workspace</Button></Link>
        </div>
        <div className="mt-16 grid gap-6 text-left sm:grid-cols-3">
          {[
            { t: "Attendance", d: "Face verification and 50m geofence at check-in." },
            { t: "Leave & Payroll", d: "Automatic payroll from attendance and leave data." },
            { t: "Analytics", d: "Workforce trends and predictive insights for managers." },
          ].map((f) => (
            <div key={f.t} className="rounded-md border border-border bg-card p-5">
              <h3 className="font-serif text-lg font-semibold">{f.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
