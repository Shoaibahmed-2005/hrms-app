import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Manager Sign in - Cleans HRMS" },
      { name: "description", content: "Manager sign in for Cleans HRMS." },
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
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/dashboard", replace: true });
  }, [user, navigate]);

  async function onSubmit(event: FormEvent) {
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
    /* Full-page wrapper with bg image shared across both halves */
    <div className="relative min-h-screen grid grid-cols-1 lg:grid-cols-2 overflow-hidden">

      {/* Shared full-page background: bg.png */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: "url('/bg.png')",
          backgroundSize: "500px",
          backgroundRepeat: "repeat",
          backgroundPosition: "center",
        }}
      />

      {/* Single smooth gradient overlay — blue → teal → green like the logo */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background: "linear-gradient(to right, rgba(30,58,138,0.70) 0%, rgba(6,95,111,0.60) 45%, rgba(6,95,70,0.60) 55%, rgba(22,101,52,0.68) 100%)",
        }}
      />

      {/* LEFT PANEL */}
      <div className="hidden flex-col justify-center items-center p-10 lg:flex text-white relative z-10">
        <div className="w-full max-w-md flex flex-col items-center text-center space-y-6">
          <img src="/cleans-logo.png?v=1" alt="Cleans Logo" className="w-72 h-auto object-contain drop-shadow-xl rounded-3xl" />
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-white drop-shadow-md">
            The clean command center for your outlets.
          </h2>
          <p className="max-w-md text-sm text-blue-50 opacity-100 drop-shadow">
            Secure attendance, geospatial tracking, and automated payroll management.
          </p>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex items-center justify-center p-6 sm:p-10 relative z-10">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden text-slate-900 border border-slate-200">
          {/* Gradient accent strip */}
          <div className="h-2 w-full bg-gradient-to-r from-[#5B9BD5] to-[#8BC34A]" />
          
          <div className="p-8">
            <div className="mb-8 text-center lg:text-left">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Manager Sign in</h1>
              <p className="mt-2 text-sm text-slate-500">
                Sign in to manage your outlet's attendance and payroll.
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
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full border-[#5B9BD5] text-[#5B9BD5] hover:bg-[#5B9BD5] hover:text-white transition-colors"
              onClick={() => {
                const savedEmail = localStorage.getItem("manager_email") ?? "";
                const savedPassword = localStorage.getItem("manager_password") ?? "";
                if (!savedEmail) {
                  toast.error("No saved credentials found. Please sign up first.");
                  return;
                }
                setEmail(savedEmail);
                setPassword(savedPassword);
              }}
            >
              Fill Manager Credentials
            </Button>
            <Button type="submit" className="w-full bg-[#5B9BD5] hover:bg-[#4a82b4] text-white" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
            <div className="pt-4 text-center text-xs text-slate-500 border-t border-slate-100 mt-6">
              Need a manager account?{" "}
              <Link to="/signup" className="text-[#5B9BD5] hover:underline font-medium">
                Create one
              </Link>
            </div>
          </form>
          </div>
        </div>
      </div>
    </div>
  );
}
