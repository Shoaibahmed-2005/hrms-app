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
  halfDayThreshold: 4,
  fullDayHours: 8,
  graceMinutes: 10,
  leaveDays: ["Sunday"],
  otAutomated: false,
  perfectAttendanceReward: 0,
  automatedIncentivesEnabled: false,
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
  // Raw text state for leave days so commas can be typed without being stripped immediately
  const [leaveDaysText, setLeaveDaysText] = useState("");

  useEffect(() => {
    Promise.all([fetchCompanySettings(), fetchDesignations(), fetchDepartments()])
      .then(([settings, designationRows, departmentRows]) => {
        setForm(settings);
        setLeaveDaysText((settings.leaveDays || []).join(" "));
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
        halfDayThreshold: Number(form.halfDayThreshold),
        fullDayHours: Number(form.fullDayHours),
        graceMinutes: Number(form.graceMinutes),
        perfectAttendanceReward: Number(form.perfectAttendanceReward),
        leaveDays: leaveDaysText.split(/\s+/).map((s) => s.trim()).filter(Boolean),
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
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5 shadow-[var(--shadow-elevate-sm)]">
          <Header icon={Clock} title="Shift Timings" />
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
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5 shadow-[var(--shadow-elevate-sm)] lg:col-span-2">
          <Header icon={Clock} title="Attendance Rules" />
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">

            <Field label="Grace time (minutes)">
              <Input
                type="number"
                min="0"
                value={form.graceMinutes}
                onChange={(event) => setForm({ ...form, graceMinutes: Number(event.target.value) })}
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
            <Field label="Automated Overtime">
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  checked={form.otAutomated}
                  onChange={(e) => setForm({ ...form, otAutomated: e.target.checked })}
                  className="h-4 w-4"
                />
                <span className="text-sm">Calculate OT automatically</span>
              </div>
            </Field>
            <Field label="Leave Days (space-separated, e.g. Sunday Friday)">
              <Input
                type="text"
                value={leaveDaysText}
                onChange={(event) => {
                  setLeaveDaysText(event.target.value);
                  setForm({
                    ...form,
                    leaveDays: event.target.value.split(/\s+/).map((s) => s.trim()).filter(Boolean),
                  });
                }}
                placeholder="Sunday Friday"
              />
            </Field>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5 shadow-[var(--shadow-elevate-sm)] lg:col-span-2">
          <Header icon={Wallet} title="Incentives" />
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Enable Automated Incentives">
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  checked={form.automatedIncentivesEnabled}
                  onChange={(e) => setForm({ ...form, automatedIncentivesEnabled: e.target.checked })}
                  className="h-4 w-4"
                />
                <span className="text-sm">Award perfect attendance automatically</span>
              </div>
            </Field>
            <Field label="Perfect Attendance Reward (₹)">
              <Input
                type="number"
                min="0"
                value={form.perfectAttendanceReward}
                onChange={(event) => setForm({ ...form, perfectAttendanceReward: Number(event.target.value) })}
              />
            </Field>
            <Field label="Attendance Incentive Threshold (days)">
              <Input
                type="number"
                min="1"
                max="31"
                value={form.halfDayThreshold ?? 20}
                onChange={(event) => setForm({ ...form, halfDayThreshold: Number(event.target.value) })}
                disabled={!form.automatedIncentivesEnabled}
                placeholder="e.g., 20"
              />
              <p className="text-xs text-muted-foreground mt-1">Reward employees present ≥ this many days</p>
            </Field>
          </div>
        </section>


        <section className="rounded-xl border  bg-card p-5 shadow-[var(--shadow-elevate-sm)]">
          <Header icon={Building2} title="Departments" />
          <form onSubmit={addDepartment} className="mt-4 flex gap-2">
            <Input
              placeholder="Department name"
              value={departmentName}
              onChange={(e) => setDepartmentName(e.target.value)}
            />
            <Button type="submit" disabled={saving}>
              {editingDepartment ? (
                <Save className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </form>

          <div className="mt-4 space-y-2">
            {departments.length ? (
              departments.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between rounded-lg border bg-background p-3 text-sm shadow-[var(--shadow-elevate-sm)]"
                >
                  <div className="font-medium text-foreground">{row.name}</div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      onClick={() => {
                        setEditingDepartment(row);
                        setDepartmentName(row.name);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeDepartment(row)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                No departments configured.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5 shadow-[var(--shadow-elevate-sm)]">
          <Header icon={Building2} title="Designations" />
          <form onSubmit={saveDeduction} className="mt-4 flex gap-2">
            <Input
              placeholder="Designation name"
              value={designationForm.name}
              onChange={(e) => setDesignationForm({ ...designationForm, name: e.target.value })}
              className="flex-1"
            />
            <Input
              type="number"
              step="0.01"
              placeholder="Per-hour deduction (₹)"
              value={designationForm.absentDayDeduction}
              onChange={(e) => setDesignationForm({ ...designationForm, absentDayDeduction: e.target.value })}
              className="w-48"
            />
            <Button type="submit" disabled={saving}>
              {editingDesignation ? (
                <Save className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </form>

          <div className="mt-4 space-y-2">
            {designations.length ? (
              designations.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between rounded-lg border bg-background p-3 text-sm shadow-[var(--shadow-elevate-sm)]"
                >
                  <div>
                    <div className="font-medium text-foreground">{row.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {row.absentDayDeduction > 0 ? `Deducts ₹${row.absentDayDeduction}/hr` : "Uses calculated hourly rate"}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      onClick={() => {
                        setEditingDesignation(row);
                        setDesignationForm({ name: row.name, absentDayDeduction: row.absentDayDeduction.toString() });
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeDesignation(row)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                No designations configured.
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
