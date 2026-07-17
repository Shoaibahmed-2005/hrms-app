import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const router = useRouter();
  const { user, refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) router.navigate({ to: "/dashboard" });
  }, [user, router]);

  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (data.token) {
        sessionStorage.setItem("token", data.token);
        toast.success("Signed in");
        await refresh();
        router.navigate({ to: "/dashboard" });
      } else {
        toast.error("Invalid response from server");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to sign in");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="hidden bg-primary text-primary-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-sm bg-primary-foreground/90" />
          <span className="font-serif text-xl font-semibold">HRMS</span>
        </div>
        <div>
          <h2 className="font-serif text-4xl font-semibold leading-tight">Workforce operations, done properly.</h2>
          <p className="mt-4 max-w-md text-primary-foreground/80">Attendance, leave, and payroll unified in one classic system built for enterprise reliability.</p>
        </div>
        <p className="text-xs text-primary-foreground/60">© {new Date().getFullYear()} HRMS. All rights reserved.</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md border-border">
          <CardHeader>
            <CardTitle className="font-serif text-2xl">Sign in</CardTitle>
            <CardDescription>Access your workspace with your work email.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={doLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
            </form>

            <div className="mt-6 flex flex-col gap-2 border-t pt-6">
              <p className="text-center text-xs font-medium text-muted-foreground mb-1">Quick Test Logins</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => { setEmail("manager@demohrms.com"); setPassword("Manager@123"); }}
              >
                Fill Manager Credentials
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => { setEmail("employee2@demohrms.com"); setPassword("Employee@123"); }}
              >
                Fill Employee Credentials
              </Button>
            </div>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              <Link to="/" className="hover:underline">← Back to home</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
