import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Manager Sign in - Hivetree HRMS" },
      { name: "description", content: "Manager sign in for Hivetree HRMS." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (user) navigate({ to: "/dashboard", replace: true });
  }, [user, navigate]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const signedIn = await signIn(email, password);
      toast.success(`Welcome, ${signedIn.name}`);
      navigate({ to: "/dashboard", replace: true });
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <div className="hidden flex-col justify-between border-r bg-sidebar p-10 lg:flex">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            H
          </div>
          <div className="text-sm font-semibold">Hivetree</div>
        </div>
        <div>
          <h2 className="max-w-md text-3xl font-semibold leading-tight tracking-tight">
            The calm command center for growing teams.
          </h2>
          <p className="mt-4 max-w-md text-sm text-muted-foreground">
            Attendance, payroll, and workforce insights with face recognition attendance capture.
          </p>
        </div>
        <div className="text-xs text-muted-foreground">Hivetree Labs</div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">Manager sign in</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Employees do not log in. Attendance is captured from the face scanner.
            </p>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                type="email"
                placeholder="manager@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                  Forgot?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
            <div className="pt-1 text-center text-xs text-muted-foreground">
              Need a manager account?{" "}
              <Link to="/signup" className="text-primary hover:underline">
                Create one
              </Link>
            </div>
            <div className="text-center text-xs">
              <Link to="/attendance" className="text-primary hover:underline">
                Open attendance scanner
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
