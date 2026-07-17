import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/employees/new")({
  component: NewEmployee,
});

function NewEmployee() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [depts, setDepts] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    full_name: "", email: "", password: "", employee_code: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
    phone: "", designation: "", department_id: "", date_of_joining: new Date().toISOString().slice(0, 10),
    base_salary: "30000",
  });

  useEffect(() => {
    // We expect a /departments endpoint in the backend, or we can just mock it for now
    apiFetch("/departments").then(data => setDepts(data ?? [])).catch(() => setDepts([]));
  }, []);

  const genPassword = () => {
    const pw = Array.from({ length: 12 }, () => "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 55)]).join("");
    setForm({ ...form, password: pw });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await apiFetch("/employees", {
        method: "POST",
        body: JSON.stringify({
          name: form.full_name, 
          email: form.email, 
          password: form.password, 
          employeeCode: form.employee_code,
          phone: form.phone || null, 
          designation: form.designation || null,
          departmentId: form.department_id || null, 
          dateOfJoining: form.date_of_joining,
          baseSalary: Number(form.base_salary),
        }),
      });
      toast.success("Employee created. Share credentials securely.");
      router.navigate({ to: "/employees" });
    } catch (e: any) {
      toast.error(e.message || "Failed to create employee");
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/employees" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Back</Link>
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">Add employee</h1>
        <p className="mt-1 text-sm text-muted-foreground">Creates the account and issues initial credentials.</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="font-serif">Employee details</CardTitle><CardDescription>All fields marked with * are required.</CardDescription></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
            <Field label="Full name *"><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
            <Field label="Employee code *"><Input required value={form.employee_code} onChange={(e) => setForm({ ...form, employee_code: e.target.value })} /></Field>
            <Field label="Email *"><Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Department">
              <Select value={form.department_id} onValueChange={(v) => setForm({ ...form, department_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>{depts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Designation"><Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} /></Field>
            <Field label="Date of joining *"><Input required type="date" value={form.date_of_joining} onChange={(e) => setForm({ ...form, date_of_joining: e.target.value })} /></Field>
            <Field label="Base salary (monthly) *"><Input required type="number" min="0" step="1" value={form.base_salary} onChange={(e) => setForm({ ...form, base_salary: e.target.value })} /></Field>
            <div className="md:col-span-2">
              <Label className="text-sm">Initial password *</Label>
              <div className="mt-2 flex gap-2">
                <Input required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                <Button type="button" variant="outline" onClick={genPassword}>Generate</Button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Share this securely with the employee. They should change it on first sign-in.</p>
            </div>
            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => router.navigate({ to: "/employees" })}>Cancel</Button>
              <Button type="submit" disabled={busy}>{busy ? "Creating…" : "Create employee"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label className="text-sm">{label}</Label>{children}</div>;
}
