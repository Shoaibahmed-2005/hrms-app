import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import {
  createEmployee,
  deleteEmployee,
  fetchDepartments,
  fetchDesignations,
  fetchEmployees,
  initials,
  isDbReady,
  updateEmployee,
  type Department,
  type Designation,
  type DbEmployee,
} from "@/lib/hrms-db";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadCSV } from "@/lib/csv";

export const Route = createFileRoute("/_app/employees")({
  head: () => ({ meta: [{ title: "Employees - Hivetree" }] }),
  component: EmployeesPage,
});

function EmployeesPage() {
  const [employees, setEmployees] = useState<DbEmployee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [dept, setDept] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DbEmployee | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "",
    department: "",
    payType: "monthly" as "monthly" | "hourly",
    salary: "",
    fixedBonus: "",
    phone: "",
    manager: "",
    status: "Active",
  });

  async function loadEmployees() {
    setLoading(true);
    try {
      const [rows, departmentRows, designationRows] = await Promise.all([
        fetchEmployees(),
        fetchDepartments(),
        fetchDesignations(),
      ]);
      setEmployees(rows);
      setDepartments(departmentRows);
      setDesignations(designationRows);
      setForm((current) => ({
        ...current,
        department: current.department || departmentRows[0]?.name || "",
        role: current.role || designationRows[0]?.name || "",
      }));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load employees");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadEmployees();
  }, []);

  const filtered = useMemo(
    () =>
      employees.filter((employee) => {
        if (dept !== "all" && employee.department !== dept) return false;
        if (status !== "all" && employee.status !== status) return false;
        if (
          q &&
          !`${employee.name} ${employee.email} ${employee.role}`
            .toLowerCase()
            .includes(q.toLowerCase())
        ) {
          return false;
        }
        return true;
      }),
    [q, dept, status, employees],
  );
  const departmentNames = departments.map((department) => department.name);
  const designationNames = designations.map((designation) => designation.name);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isDbReady()) return toast.error("Connect Supabase before adding employees");
    if (!form.name.trim()) return toast.error("Name is required");
    if (!form.department) return toast.error("Create a department in Settings first");

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        role: form.role || designationNames[0] || "Employee",
        department: form.department,
        payType: form.payType,
        salary: Number(form.salary) || 0,
        fixedBonus: Number(form.fixedBonus) || 0,
        phone: form.phone,
        manager: form.manager,
      };
      const saved = editing
        ? await updateEmployee(editing.id, { ...payload, status: form.status })
        : await createEmployee(payload);
      setEmployees((prev) =>
        editing ? prev.map((row) => (row.id === saved.id ? saved : row)) : [saved, ...prev],
      );
      toast.success(`${form.name} ${editing ? "updated" : "saved"} to database`);
      setOpen(false);
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save employee");
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setEditing(null);
    setForm({
      name: "",
      email: "",
      role: designations[0]?.name || "",
      department: departments[0]?.name || "",
      payType: "monthly",
      salary: "",
      fixedBonus: "",
      phone: "",
      manager: "",
      status: "Active",
    });
  }

  function startEdit(employee: DbEmployee) {
    setEditing(employee);
    setForm({
      name: employee.name,
      email: employee.email,
      role: employee.role,
      department: employee.department,
      payType: employee.payType,
      salary: String(employee.salary),
      fixedBonus: String(employee.fixedBonus),
      phone: employee.phone,
      manager: employee.manager,
      status: employee.status || "Active",
    });
    setOpen(true);
  }

  async function removeEmployee(employee: DbEmployee) {
    try {
      await deleteEmployee(employee.id);
      setEmployees((prev) => prev.filter((row) => row.id !== employee.id));
      toast.success(`${employee.name} removed`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove employee");
    }
  }

  function exportCsv() {
    downloadCSV(
      "employees.csv",
      filtered.map((e) => ({
        id: e.id,
        empCode: e.empCode,
        name: e.name,
        email: e.email,
        department: e.department,
        role: e.role,
        status: e.status,
        payType: e.payType,
        salary: e.salary,
        fixedBonus: e.fixedBonus,
        joinDate: e.joinDate,
      })),
    );
    toast.success("Employees exported");
  }

  return (
    <div>
      <PageHeader
        title="Employees"
        description={`${employees.length} database records across ${departments.length} departments`}
        actions={
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={exportCsv}
              disabled={filtered.length === 0}
            >
              <Download className="mr-1.5 h-4 w-4" />
              Export CSV
            </Button>
            <Dialog
              open={open}
              onOpenChange={(next) => {
                setOpen(next);
                if (!next) resetForm();
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm" onClick={resetForm}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add employee
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editing ? "Edit employee" : "Add employee"}</DialogTitle>
                </DialogHeader>
                <form className="grid gap-3" onSubmit={submit}>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Full name">
                      <Input
                        value={form.name}
                        onChange={(event) => setForm({ ...form, name: event.target.value })}
                        required
                      />
                    </Field>
                    <Field label="Email">
                      <Input
                        type="email"
                        value={form.email}
                        onChange={(event) => setForm({ ...form, email: event.target.value })}
                        placeholder="optional"
                      />
                    </Field>
                    <Field label="Designation">
                      <select
                        className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                        value={form.role}
                        onChange={(event) => setForm({ ...form, role: event.target.value })}
                        disabled={designations.length === 0}
                      >
                        {designations.length === 0 ? (
                          <option value="">Add designations in Settings</option>
                        ) : null}
                        {designationNames.map((designation) => (
                          <option key={designation} value={designation}>
                            {designation}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Department">
                      <select
                        className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                        value={form.department}
                        onChange={(event) => setForm({ ...form, department: event.target.value })}
                        disabled={departments.length === 0}
                      >
                        {departments.length === 0 ? (
                          <option value="">Add departments in Settings</option>
                        ) : null}
                        {departmentNames.map((department) => (
                          <option key={department} value={department}>
                            {department}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Pay type">
                      <select
                        className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                        value={form.payType}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            payType: event.target.value as "monthly" | "hourly",
                          })
                        }
                      >
                        <option value="monthly">Monthly paid</option>
                        <option value="hourly">Hourly paid</option>
                      </select>
                    </Field>
                    <Field label={form.payType === "hourly" ? "Hourly rate" : "Monthly salary"}>
                      <Input
                        type="number"
                        value={form.salary}
                        onChange={(event) => setForm({ ...form, salary: event.target.value })}
                      />
                    </Field>
                    <Field label="Fixed bonus">
                      <Input
                        type="number"
                        value={form.fixedBonus}
                        onChange={(event) => setForm({ ...form, fixedBonus: event.target.value })}
                      />
                    </Field>
                    <Field label="Contact number">
                      <Input
                        value={form.phone}
                        onChange={(event) => setForm({ ...form, phone: event.target.value })}
                        placeholder="+91 9..."
                      />
                    </Field>
                    <Field label="Reporting manager">
                      <Input
                        value={form.manager}
                        onChange={(event) => setForm({ ...form, manager: event.target.value })}
                      />
                    </Field>
                    {editing ? (
                      <Field label="Status">
                        <select
                          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                          value={form.status}
                          onChange={(event) => setForm({ ...form, status: event.target.value })}
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      </Field>
                    ) : null}
                  </div>
                  <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
                    This saves the employee profile row to Supabase. Actual login accounts should be
                    created through Supabase Auth or your admin provisioning flow.
                  </div>
                  <DialogFooter>
                    <Button
                      type="submit"
                      disabled={saving || departments.length === 0 || designations.length === 0}
                    >
                      {saving ? "Saving..." : editing ? "Update employee" : "Save employee"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      {error ? <Notice tone="error">{error}</Notice> : null}
      {!isDbReady() ? <Notice>Connect Supabase in `.env` to load employee records.</Notice> : null}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Search by name, email, role"
            className="h-9 pl-8"
          />
        </div>
        <Select value={dept} onValueChange={setDept}>
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {departmentNames.map((department) => (
              <SelectItem key={department} value={department}>
                {department}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="On Leave">On Leave</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-elevate-sm)]">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Employee</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Pay type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Pay</TableHead>
              <TableHead className="w-8"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                  {loading ? "Loading employees..." : "No employee records found in the database."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>
                    <Link
                      to="/employees/$id"
                      params={{ id: employee.id }}
                      className="flex items-center gap-3"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-semibold">
                        {initials(employee.name)}
                      </span>
                      <div>
                        <div className="text-sm font-medium">{employee.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {employee.email || "No email"}
                        </div>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{employee.department}</TableCell>
                  <TableCell className="text-sm">{employee.role}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {employee.payType === "hourly" ? "Hourly" : "Monthly"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        employee.status === "Active"
                          ? "secondary"
                          : employee.status === "On Leave"
                            ? "outline"
                            : "destructive"
                      }
                    >
                      {employee.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    Rs {employee.salary.toLocaleString("en-IN")}
                    <div className="text-xs text-muted-foreground">
                      + Rs {employee.fixedBonus.toLocaleString("en-IN")} bonus
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => startEdit(employee)}>
                          <Pencil className="mr-2 h-3.5 w-3.5" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => void removeEmployee(employee)}
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Notice({
  children,
  tone = "info",
}: {
  children: React.ReactNode;
  tone?: "info" | "error";
}) {
  return (
    <div
      className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
        tone === "error"
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "bg-card text-muted-foreground"
      }`}
    >
      {children}
    </div>
  );
}
