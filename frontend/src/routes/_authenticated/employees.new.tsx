import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, ScanFace, CheckCircle2, Clock, IndianRupee, User
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { FaceCamera } from "@/components/FaceCamera";

export const Route = createFileRoute("/_authenticated/employees/new")({
  component: NewEmployee,
});

const DEPARTMENTS = ["Engineering", "Operations", "HR", "Finance", "Sales", "Marketing", "Legal", "Admin"];

function NewEmployee() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [faceDescriptor, setFaceDescriptor] = useState<Float32Array | null>(null);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    name: "",
    employeeCode: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
    govtId: "",
    phone: "",
    address: "",
    department: "",
    designation: "",
    dateOfJoining: new Date().toISOString().slice(0, 10),
    paymentType: "MONTHLY" as "MONTHLY" | "HOURLY",
    baseSalary: "30000",
    hourlyRate: "150",
  });

  const f = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: e.target.value });

  const handleFaceCapture = (descriptor: Float32Array, imageUrl?: string) => {
    setFaceDescriptor(descriptor);
    if (imageUrl) {
      setForm(prev => ({ ...prev, photoUrl: imageUrl }));
    }
    toast.success("Face captured! Now fill in the employee details.");
    setStep(2);
  };

  const skipFace = () => {
    setFaceDescriptor(null);
    setStep(2);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Please enter a Full Name");
    if (!form.employeeCode.trim()) return toast.error("Please enter an Employee Code");
    if (!form.department) return toast.error("Please select a Department");
    if (form.paymentType === "MONTHLY" && !form.baseSalary) return toast.error("Please enter a Monthly Salary");
    if (form.paymentType === "HOURLY" && !form.hourlyRate) return toast.error("Please enter an Hourly Rate");

    setBusy(true);
    try {
      const payload: any = {
        name: form.name,
        employeeCode: form.employeeCode,
        govtId: form.govtId || undefined,
        phone: form.phone || undefined,
        address: form.address || undefined,
        department: form.department,
        designation: form.designation,
        dateOfJoining: form.dateOfJoining,
        paymentType: form.paymentType,
        baseSalary: form.paymentType === "MONTHLY" ? Number(form.baseSalary) : undefined,
        hourlyRate: form.paymentType === "HOURLY" ? Number(form.hourlyRate) : undefined,
        photoUrl: (form as any).photoUrl || undefined,
      };
      if (faceDescriptor) {
        payload.faceDescriptor = Array.from(faceDescriptor);
      }
      await apiFetch("/employees", { method: "POST", body: JSON.stringify(payload) });
      toast.success(`${form.name} registered successfully!${!faceDescriptor ? " (Face can be registered later from their profile)" : ""}`);
      router.navigate({ to: "/employees" });
    } catch (e: any) {
      toast.error(e.message || "Failed to create employee");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/employees">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight">Register Employee</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Step {step} of 2</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-3">
        <StepDot n={1} current={step} label="Face Capture" />
        <div className="h-px flex-1 bg-border" />
        <StepDot n={2} current={step} label="Employee Details" />
      </div>

      {/* Step 1: Face Capture */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-serif">
              <ScanFace className="h-5 w-5 text-primary" /> Capture Employee Face
            </CardTitle>
            <CardDescription>
              Position the employee's face clearly in the frame and click Capture. This is used for attendance verification.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FaceCamera
              mode="register"
              onCapture={handleFaceCapture}
              onCancel={() => router.navigate({ to: "/employees" })}
              busy={false}
            />
            <div className="text-center">
              <button
                type="button"
                onClick={skipFace}
                className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                Skip for now — register face later from employee profile
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Employee Details */}
      {step === 2 && (
        <form onSubmit={submit} className="space-y-5">
          {faceDescriptor ? (
            <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/30">
              <CardContent className="flex items-center gap-3 py-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">
                    Face captured and ready to save
                  </p>
                  {(form as any).photoUrl?.startsWith('data:image') && (
                    <p className="text-xs text-green-600/80 mt-0.5">This picture will also be used as their profile photo!</p>
                  )}
                </div>
                {(form as any).photoUrl && (
                  <img src={(form as any).photoUrl} alt="Captured face" className="h-10 w-10 shrink-0 rounded-full object-cover border-2 border-green-200" />
                )}
                <button
                  type="button"
                  className="ml-auto text-xs underline text-green-600"
                  onClick={() => setStep(1)}
                >
                  Re-capture
                </button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/30">
              <CardContent className="flex items-center gap-3 py-3">
                <ScanFace className="h-5 w-5 shrink-0 text-amber-600" />
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  No face captured — you can register it later from the employee profile
                </p>
                <button type="button" className="ml-auto text-xs underline text-amber-600" onClick={() => setStep(1)}>
                  Add face
                </button>
              </CardContent>
            </Card>
          )}

          {/* Personal Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 font-serif text-base">
                <User className="h-4 w-4" /> Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Full Name *">
                <Input value={form.name} onChange={f("name")} placeholder="e.g. Ravi Kumar" />
              </Field>
              <Field label="Employee Code *">
                <Input value={form.employeeCode} onChange={f("employeeCode")} />
              </Field>
              <Field label="Government ID (Aadhaar / PAN)">
                <Input value={form.govtId} onChange={f("govtId")} placeholder="e.g. XXXX-XXXX-XXXX" />
              </Field>
              <Field label="Phone Number">
                <Input value={form.phone} onChange={f("phone")} placeholder="+91 98765 43210" />
              </Field>
              <Field label="Photo URL (Optional)">
                <Input value={(form as any).photoUrl || ""} onChange={(e) => setForm({ ...form, photoUrl: e.target.value } as any)} placeholder="https://..." />
                <p className="mt-1 text-[10px] text-muted-foreground">Leave empty to auto-generate avatar</p>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Address">
                  <Input value={form.address} onChange={f("address")} placeholder="Full address" />
                </Field>
              </div>
            </CardContent>
          </Card>

          {/* Job Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 font-serif text-base">
                <Clock className="h-4 w-4" /> Job Details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Department *">
                <Select value={form.department} onValueChange={v => setForm({ ...form, department: v })}>
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Designation">
                <Input value={form.designation} onChange={f("designation")} placeholder="e.g. Senior Developer" />
              </Field>
              <Field label="Date of Joining">
                <Input type="date" value={form.dateOfJoining} onChange={f("dateOfJoining")} />
              </Field>
            </CardContent>
          </Card>

          {/* Payroll Config */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 font-serif text-base">
                <IndianRupee className="h-4 w-4" /> Payroll Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                {(["MONTHLY", "HOURLY"] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm({ ...form, paymentType: type })}
                    className={`flex-1 rounded-xl border-2 p-4 text-left transition-all ${
                      form.paymentType === type
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div className="font-semibold text-sm capitalize">{type.toLowerCase()} Paid</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {type === "MONTHLY" ? "Fixed salary per month (÷26 working days)" : "Paid per hour worked"}
                    </div>
                  </button>
                ))}
              </div>
              {form.paymentType === "MONTHLY" ? (
                <Field label="Monthly Salary (₹) *">
                  <Input type="number" min="0" value={form.baseSalary} onChange={f("baseSalary")} />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Daily rate = ₹{(Number(form.baseSalary) / 26).toFixed(0)} &nbsp;·&nbsp; Half-day = ₹{(Number(form.baseSalary) / 52).toFixed(0)}
                  </p>
                </Field>
              ) : (
                <Field label="Hourly Rate (₹) *">
                  <Input type="number" min="0" value={form.hourlyRate} onChange={f("hourlyRate")} />
                  <p className="mt-1 text-xs text-muted-foreground">
                    8-hour day = ₹{(Number(form.hourlyRate) * 8).toFixed(0)}
                  </p>
                </Field>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => router.navigate({ to: "/employees" })}>
              Cancel
            </Button>
            <Button type="button" variant="ghost" onClick={() => setStep(1)}>
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Face Capture
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Registering…" : "Register Employee"}
              {!busy && <ArrowRight className="ml-1.5 h-4 w-4" />}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}

function StepDot({ n, current, label }: { n: number; current: number; label: string }) {
  const done = current > n;
  const active = current === n;
  return (
    <div className="flex items-center gap-2">
      <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors
        ${done ? "bg-green-500 text-white" : active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
        {done ? <CheckCircle2 className="h-4 w-4" /> : n}
      </div>
      <span className={`hidden sm:block text-sm font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
    </div>
  );
}
