import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Building2, Clock, Pencil, Plus, Save, ShieldCheck, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fetchCompanySettings,
  fetchDepartments,
  fetchDesignations,
  deleteDepartment,
  deleteDesignation,
  saveDepartment,
  saveDesignationDeduction,
  updateDepartment,
  updateDesignation,
  updateCompanySettings,
  type CompanySettings,
  type Department,
  type Designation,
} from "@/lib/hrms-db";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings - Hivetree" }] }),
  component: SettingsPage,
});

const FALLBACK: CompanySettings = {
  faceThreshold: 80,
  shiftStart: "09:30",
  shiftEnd: "18:30",
  overtimeMultiplier: 1.5,
  attendanceCooldownMinutes: 1,
};

function SettingsPage() {
  const [form, setForm] = useState<CompanySettings>(FALLBACK);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designationForm, setDesignationForm] = useState({
    name: "",
    absentDayDeduction: "",
  });
  const [departmentName, setDepartmentName] = useState("");
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [editingDesignation, setEditingDesignation] = useState<Designation | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([fetchCompanySettings(), fetchDesignations(), fetchDepartments()])
      .then(([settings, designationRows, departmentRows]) => {
        setForm(settings);
        setDesignations(designationRows);
        setDepartments(departmentRows);
      })
      .catch((error) => {
        console.error(error);
        toast.error(error instanceof Error ? error.message : "Could not load settings");
      });
  }, []);

  async function save() {
    setSaving(true);
    try {
      await updateCompanySettings({
        ...form,
        faceThreshold: Number(form.faceThreshold),
        overtimeMultiplier: Number(form.overtimeMultiplier),
        attendanceCooldownMinutes: Number(form.attendanceCooldownMinutes),
      });
      toast.success("Company settings saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  }

  async function addDepartment(event: FormEvent) {
    event.preventDefault();
    if (!departmentName.trim()) return toast.error("Department name is required");
    setSaving(true);
    try {
      if (editingDepartment) {
        await updateDepartment(editingDepartment.id, departmentName);
      } else {
        await saveDepartment(departmentName);
      }
      setDepartments(await fetchDepartments());
      setDepartmentName("");
      setEditingDepartment(null);
      toast.success(`Department ${editingDepartment ? "updated" : "saved"}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save department");
    } finally {
      setSaving(false);
    }
  }

  async function saveDeduction(event: FormEvent) {
    event.preventDefault();
    if (!designationForm.name.trim()) return toast.error("Designation is required");
    setSaving(true);
    try {
      const payload = {
        name: designationForm.name,
        absentDayDeduction: Number(designationForm.absentDayDeduction) || 0,
      };
      if (editingDesignation) {
        await updateDesignation(editingDesignation.id, payload);
      } else {
        await saveDesignationDeduction({
          designation: payload.name,
          absentDayDeduction: payload.absentDayDeduction,
        });
      }
      setDesignations(await fetchDesignations());
      setDesignationForm({ name: "", absentDayDeduction: "" });
      setEditingDesignation(null);
      toast.success(`Designation ${editingDesignation ? "updated" : "saved"}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save deduction rule");
    } finally {
      setSaving(false);
    }
  }

  async function removeDepartment(row: Department) {
    setSaving(true);
    try {
      await deleteDepartment(row.id);
      setDepartments(await fetchDepartments());
      toast.success(`${row.name} removed`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove department");
    } finally {
      setSaving(false);
    }
  }

  async function removeDesignation(row: Designation) {
    setSaving(true);
    try {
      await deleteDesignation(row.id);
      setDesignations(await fetchDesignations());
      toast.success(`${row.name} removed`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove designation");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Company settings"
        description="Configure biometric strictness, shift timings, and overtime policy."
        actions={
          <Button size="sm" onClick={save} disabled={saving}>
            <Save className="mr-1.5 h-4 w-4" />
            {saving ? "Saving..." : "Save settings"}
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-5 shadow-[var(--shadow-elevate-sm)]">
          <Header icon={ShieldCheck} title="Security settings" />
          <div className="mt-4 grid gap-3">
            <Field label="Face match threshold (%)">
              <Input
                type="number"
                min="50"
                max="99"
                value={form.faceThreshold}
                onChange={(event) =>
                  setForm({ ...form, faceThreshold: Number(event.target.value) })
                }
              />
            </Field>
            <Field label="Attendance scan cooldown (minutes)">
              <Input
                type="number"
                min="1"
                value={form.attendanceCooldownMinutes}
                onChange={(event) =>
                  setForm({ ...form, attendanceCooldownMinutes: Number(event.target.value) })
                }
              />
            </Field>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5 shadow-[var(--shadow-elevate-sm)]">
          <Header icon={Clock} title="Work policies" />
          <div className="mt-4 grid gap-3">
            <Field label="Shift start">
              <Input
                type="time"
                value={form.shiftStart}
                onChange={(event) => setForm({ ...form, shiftStart: event.target.value })}
              />
            </Field>
            <Field label="Shift end">
              <Input
                type="time"
                value={form.shiftEnd}
                onChange={(event) => setForm({ ...form, shiftEnd: event.target.value })}
              />
            </Field>
            <Field label="Overtime multiplier">
              <Input
                type="number"
                step="0.1"
                value={form.overtimeMultiplier}
                onChange={(event) =>
                  setForm({ ...form, overtimeMultiplier: Number(event.target.value) })
                }
              />
            </Field>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5 shadow-[var(--shadow-elevate-sm)] lg:col-span-2">
          <Header icon={Building2} title="Departments" />
          <form className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]" onSubmit={addDepartment}>
            <Field label="Department name">
              <Input
                value={departmentName}
                onChange={(event) => setDepartmentName(event.target.value)}
                placeholder="Department name"
              />
            </Field>
            <Button type="submit" className="self-end" disabled={saving}>
              <Plus className="mr-1.5 h-4 w-4" />
              {editingDepartment ? "Update department" : "Add department"}
            </Button>
          </form>
          <div className="mt-4 flex flex-wrap gap-2">
            {departments.length ? (
              departments.map((department) => (
                <span
                  key={department.id}
                  className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm"
                >
                  {department.name}
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setEditingDepartment(department);
                      setDepartmentName(department.name);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => void removeDepartment(department)}
                    disabled={saving}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))
            ) : (
              <div className="w-full rounded-lg border bg-background px-3 py-6 text-center text-sm text-muted-foreground">
                Add departments here before creating employees.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5 shadow-[var(--shadow-elevate-sm)] lg:col-span-2">
          <Header
            icon={Wallet}
            title="Designation deduction policy (Amount to deduct from salary during absence)"
          />
          <form className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_auto]" onSubmit={saveDeduction}>
            <Field label="Designation">
              <Input
                value={designationForm.name}
                onChange={(event) =>
                  setDesignationForm({ ...designationForm, name: event.target.value })
                }
                placeholder="Designation name"
              />
            </Field>
            <Field label="Absent-day deduction">
              <Input
                type="number"
                value={designationForm.absentDayDeduction}
                onChange={(event) =>
                  setDesignationForm({
                    ...designationForm,
                    absentDayDeduction: event.target.value,
                  })
                }
              />
            </Field>
            <Button type="submit" className="self-end" disabled={saving}>
              <Plus className="mr-1.5 h-4 w-4" />
              {editingDesignation ? "Update designation" : "Add designation"}
            </Button>
          </form>
          <div className="mt-4 divide-y rounded-lg border bg-background">
            {designations.length ? (
              designations.map((row) => (
                <div key={row.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="font-medium">{row.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="tabular-nums text-muted-foreground">
                      Rs {row.absentDayDeduction.toLocaleString("en-IN")} / absent day
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => {
                        setEditingDesignation(row);
                        setDesignationForm({
                          name: row.name,
                          absentDayDeduction: String(row.absentDayDeduction),
                        });
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive"
                      onClick={() => void removeDesignation(row)}
                      disabled={saving}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                No deduction rules configured.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Header({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent">
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-sm font-semibold">{title}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
