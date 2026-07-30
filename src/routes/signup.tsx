import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Create Manager Account - Cleans HRMS HRMS" }] }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const user = await signUp(form.email, form.password, form.name);
      // Save credentials so the login page can autofill them
      localStorage.setItem("manager_email", form.email);
      localStorage.setItem("manager_password", form.password);
      toast.success(`Manager account created for ${user.name}`);
      navigate({ to: "/dashboard", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2 bg-gradient-to-br from-[#0F1B2E] to-[#1B3A5C]">
      {/* Left Panel with Background Image */}
      <div 
        className="hidden flex-col justify-center items-center p-10 lg:flex text-white relative overflow-hidden"
        style={{
          backgroundImage: "url('/bg.png?v=1')",
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}
      >
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-[#0F1B2E]/80 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1B3A5C]/50 to-[#0F1B2E]/90" />
        
        <div className="w-full max-w-md flex flex-col items-center text-center space-y-6 relative z-10">
          <img src="/cleans-logo.png?v=1" alt="Cleans Logo" className="w-72 h-auto object-contain drop-shadow-xl" />
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-white drop-shadow-md">
            The clean command center for your outlets.
          </h2>
          <p className="max-w-md text-sm text-blue-50 opacity-100 drop-shadow">
            Secure attendance, geospatial tracking, and automated payroll management.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10 relative">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden text-slate-900 border border-slate-200">
          {/* Gradient accent strip */}
          <div className="h-2 w-full bg-gradient-to-r from-[#5B9BD5] to-[#8BC34A]" />
          
          <div className="p-8">
            <div className="mb-8 text-center lg:text-left">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create manager account</h1>
              <p className="mt-2 text-sm text-slate-500">
                Employee accounts are not used in this system.
              </p>
            </div>

            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-1.5">
                <Label>Full name</Label>
                <Input
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="Manager Name"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Work Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  placeholder="manager@company.com"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(event) => setForm({ ...form, password: event.target.value })}
                    placeholder="Create a password"
                    minLength={6}
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
              <Button type="submit" className="w-full bg-[#5B9BD5] hover:bg-[#4a82b4] text-white" disabled={loading}>
                {loading ? "Creating..." : "Create manager account"}
              </Button>
              <div className="pt-4 text-center text-xs text-slate-500 border-t border-slate-100 mt-6">
                Have an account?{" "}
                <Link to="/" className="text-[#5B9BD5] hover:underline font-medium">
                  Sign in
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
