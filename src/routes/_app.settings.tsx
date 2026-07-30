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
  head: () => ({ meta: [{ title: "Settings - Cleans HRMS" }] }),
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
    department: "",
  });
  const [departmentName, setDepartmentName] = useState("");
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [editingDesignation, setEditingDesignation] = useState<Designation | null>(null);
  const [saving, setSaving] = useState(false);
  // Raw text state for leave days so commas can be typed without being stripped immediately
  const [leaveDaysText, setLeaveDaysText] = useState("");

  useEffect(() => {
    async function init() {
      try {
        let [settings, designationRows, departmentRows] = await Promise.all([
          fetchCompanySettings(), fetchDesignations(), fetchDepartments()
        ]);

        // Auto-seed departments if none exist
        if (departmentRows.length === 0) {
          for (const name of ["Cleaning", "Management"]) {
            await saveDepartment(name);
          }
          departmentRows = await fetchDepartments();
        }

        // Auto-seed designations if none exist
        if (designationRows.length === 0) {
          const defaults = [
            { designation: "Cleaner",          absentDayDeduction: 0, department: "Cleaning" },
            { designation: "Washer",            absentDayDeduction: 0, department: "Cleaning" },
            { designation: "Presser / Ironer", absentDayDeduction: 0, department: "Cleaning" },
            { designation: "Spotter",           absentDayDeduction: 0, department: "Cleaning" },
            { designation: "Packer",            absentDayDeduction: 0, department: "Cleaning" },
            { designation: "Supervisor",        absentDayDeduction: 0, department: "Management" },
          ];
          for (const d of defaults) await saveDesignationDeduction(d);
          designationRows = await fetchDesignations();
        }

        setForm(settings);
        setLeaveDaysText((settings.leaveDays || []).join(" "));
        setDesignations(designationRows);
        setDepartments(departmentRows);
      } catch (error) {
        console.error(error);
        toast.error(error instanceof Error ? error.message : "Could not load settings");
      }
    }
    void init();
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
        department: designationForm.department,
      };
      if (editingDesignation) {
        await updateDesignation(editingDesignation.id, payload);
      } else {
        await saveDesignationDeduction({
          designation: payload.name,
          absentDayDeduction: payload.absentDayDeduction,
          department: payload.department,
        });
      }
      setDesignations(await fetchDesignations());
      setDesignationForm({ name: "", absentDayDeduction: "", department: "" });
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
        <section className="rounded-2xl border border-slate-100 dark:border-[#1B3A5C] bg-card p-5 shadow-xl shadow-slate-200/50 dark:shadow-none">
          <Header icon={ShieldCheck} title="Biometric Security" />
          <div className="mt-4 grid gap-3">
            <Field label="Face Match Confidence Threshold (%)">
              <Input
                type="text"
                readOnly
                disabled
                value={form.faceThreshold}
                className="bg-muted cursor-not-allowed text-muted-foreground"
              />
              <p className="mt-1 text-[11px] text-muted-foreground font-medium">Admin only: Modifying this impacts system-wide biometric accuracy. Default is 80%.</p>
            </Field>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-100 dark:border-[#1B3A5C] bg-card p-5 shadow-xl shadow-slate-200/50 dark:shadow-none">
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

        <section className="rounded-2xl border border-slate-100 dark:border-[#1B3A5C] bg-card p-5 shadow-xl shadow-slate-200/50 dark:shadow-none lg:col-span-2">
          <Header icon={Clock} title="Attendance Rules & Overtime" />
          <div className="mt-4 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Field label="Grace Period (Minutes)">
              <select
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={form.graceMinutes}
                onChange={(event) => setForm({ ...form, graceMinutes: Number(event.target.value) })}
              >
                <option value={0}>Strict (0 min)</option>
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
              </select>
              <p className="mt-1 text-[11px] text-muted-foreground">Check-ins within this period are not marked Late.</p>
            </Field>
            
            <Field label="Overtime Pay Multiplier">
              <select
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={form.overtimeMultiplier}
                onChange={(event) => setForm({ ...form, overtimeMultiplier: Number(event.target.value) })}
              >
                <option value={1.0}>1.0x (Standard Pay)</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.5x (Time and a Half)</option>
                <option value={2.0}>2.0x (Double Pay)</option>
              </select>
              <p className="mt-1 text-[11px] text-muted-foreground">Multiplier applied to hourly rate during OT.</p>
            </Field>

            <Field label="Automated Overtime">
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  checked={form.otAutomated}
                  onChange={(e) => setForm({ ...form, otAutomated: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium">Auto-calculate OT</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">Track overtime automatically beyond standard hours.</p>
            </Field>

            <Field label="Weekly Off Days">
              <select
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={leaveDaysText}
                onChange={(event) => {
                  setLeaveDaysText(event.target.value);
                  setForm({
                    ...form,
                    leaveDays: event.target.value.split(" "),
                  });
                }}
              >
                <option value="Sunday">Sunday Only</option>
                <option value="Saturday Sunday">Saturday & Sunday</option>
                <option value="Friday">Friday Only</option>
                <option value="Friday Saturday">Friday & Saturday</option>
              </select>
              <p className="mt-1 text-[11px] text-muted-foreground">Standard weekends not counted as absent.</p>
            </Field>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-100 dark:border-[#1B3A5C] bg-card p-5 shadow-xl shadow-slate-200/50 dark:shadow-none lg:col-span-2">
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


        <section className="rounded-2xl border border-slate-100 dark:border-[#1B3A5C] bg-card p-5 shadow-xl shadow-slate-200/50 dark:shadow-none">
          <Header icon={Building2} title="Departments" />
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
            Departments are the work areas or teams in your outlet — e.g. <span className="font-medium text-foreground">Washing</span>, <span className="font-medium text-foreground">Ironing</span>, <span className="font-medium text-foreground">Delivery</span>. 
            Each employee must be assigned to a department. This helps you filter attendance and payroll reports by team.
          </p>
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
                  className="flex items-center justify-between rounded-lg border bg-background p-3 text-sm shadow-xl shadow-slate-200/50 dark:shadow-none"
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

        <section className="rounded-2xl border border-slate-100 dark:border-[#1B3A5C] bg-card p-5 shadow-xl shadow-slate-200/50 dark:shadow-none">
          <Header icon={Building2} title="Designations" />
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
            Designations are the <span className="font-medium text-foreground">job roles</span> or positions of your employees — e.g. <span className="font-medium text-foreground">Presser</span>, <span className="font-medium text-foreground">Cleaner</span>, <span className="font-medium text-foreground">Supervisor</span>. 
            You can also set a custom <span className="font-medium text-foreground">per-hour salary deduction</span> for each designation. If left at ₹0, the system will auto-calculate based on monthly salary.
          </p>
          <form onSubmit={saveDeduction} className="mt-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">Add a custom designation:</p>
            <div className="flex gap-2">
              <Input
                placeholder="Designation name (e.g. Delivery Rider)"
                value={designationForm.name}
                onChange={(e) => setDesignationForm({ ...designationForm, name: e.target.value })}
                className="flex-1"
              />
              <select
                className="h-9 w-48 rounded-md border bg-background px-3 text-sm"
                value={designationForm.department}
                onChange={(e) => setDesignationForm({ ...designationForm, department: e.target.value })}
                required
              >
                <option value="" disabled>Select Department</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.name}>{dept.name}</option>
                ))}
              </select>
              <Input
                type="number"
                step="0.01"
                placeholder="Per-hour deduction (₹) — optional"
                value={designationForm.absentDayDeduction}
                onChange={(e) => setDesignationForm({ ...designationForm, absentDayDeduction: e.target.value })}
                className="w-52"
              />
              <Button type="submit" disabled={saving}>
                {editingDesignation ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
          </form>

          <div className="mt-4 space-y-2">
            {designations.length ? (
              designations.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between rounded-lg border bg-background p-3 text-sm shadow-xl shadow-slate-200/50 dark:shadow-none"
                >
                  <div>
                    <div className="font-medium text-foreground">{row.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {row.department ? <span className="font-semibold text-primary">{row.department}</span> : <span className="italic">No Dept</span>} • {row.absentDayDeduction > 0 ? `Deducts ₹${row.absentDayDeduction}/hr` : "Uses calculated hourly rate"}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      onClick={() => {
                        setEditingDesignation(row);
                        setDesignationForm({ name: row.name, absentDayDeduction: row.absentDayDeduction.toString(), department: row.department });
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
