import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
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
import {
  Camera,
  CheckCircle2,
  Download,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  ScanFace,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import {
  createEmployee,
  deleteEmployee,
  fetchDepartments,
  fetchDesignations,
  fetchEmployees,
  fetchFaceRegistry,
  initials,
  isDbReady,
  saveEmployeeFaceDescriptor,
  saveEmployeeProfileImage,
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
import { getDescriptorFromVideo, loadFaceModels, euclidean, MATCH_THRESHOLD } from "@/lib/face";

export const Route = createFileRoute("/_app/employees")({
  validateSearch: z.object({
    edit: z.string().optional(),
  }),
  head: () => ({ meta: [{ title: "Employees - Cleans HRMS" }] }),
  component: EmployeesPage,
});

type CamState = "idle" | "loading" | "streaming" | "captured";

function EmployeesPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [employees, setEmployees] = useState<DbEmployee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [faceDetected, setFaceDetected] = useState(false);
  const [dept, setDept] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "face">("details");
  const [editing, setEditing] = useState<DbEmployee | null>(null);
  const [savedEmployeeId, setSavedEmployeeId] = useState<string | null>(null);

  // Face capture state
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camState, setCamState] = useState<CamState>("idle");
  const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(null);
  const [camError, setCamError] = useState<string | null>(null);
  const [faceCapturing, setFaceCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

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
      const [rows, departmentRows, designationRows, registry] = await Promise.all([
        fetchEmployees(),
        fetchDepartments(),
        fetchDesignations(),
        fetchFaceRegistry(),
      ]);
      setEmployees(rows);
      setDepartments(departmentRows);
      setDesignations(designationRows);
      setRegisteredIds(new Set(registry.map((r) => r.employeeId)));
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
    return () => stopCamera();
  }, []);

  // Handle deep-link to edit an employee
  useEffect(() => {
    if (search.edit && employees.length > 0) {
      const emp = employees.find(e => e.id === search.edit);
      if (emp && !editing && !open) {
        startEdit(emp);
        // Clear the search param so it doesn't re-trigger
        navigate({ search: {}, replace: true });
      }
    }
  }, [search.edit, employees, editing, open, navigate]);

  // Poll face detection in preview
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (camState === "streaming" && videoRef.current) {
      interval = setInterval(async () => {
        if (videoRef.current) {
          const descriptor = await getDescriptorFromVideo(videoRef.current);
          setFaceDetected(!!descriptor);
        }
      }, 800);
    } else {
      setFaceDetected(false);
    }
    return () => clearInterval(interval);
  }, [camState]);

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
  
  // Filter designations based on selected department in the form
  const filteredDesignations = designations.filter(d => 
    !form.department || !d.department || d.department === form.department
  ).map(d => d.name);

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
        manager: "System Manager",
      };
      const saved = editing
        ? await updateEmployee(editing.id, { ...payload, status: form.status })
        : await createEmployee(payload);
      setEmployees((prev) =>
        editing ? prev.map((row) => (row.id === saved.id ? saved : row)) : [saved, ...prev],
      );
      setSavedEmployeeId(saved.id);
      toast.success(`${form.name} ${editing ? "updated" : "saved"} — now register their face`);
      // Switch to face tab
      setActiveTab("face");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save employee");
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    stopCamera();
    setCamState("idle");
    setFaceDescriptor(null);
    setCamError(null);
    setActiveTab("details");
    setSavedEmployeeId(null);
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
    stopCamera();
    setCamState("idle");
    setFaceDescriptor(null);
    setCamError(null);
    setActiveTab("details");
    setSavedEmployeeId(employee.id);
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

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function startCamera() {
    setCamError(null);
    setCamState("loading");
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera not supported. Use HTTPS or localhost.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      await loadFaceModels();
      setCamState("streaming");
    } catch (e) {
      setCamError(e instanceof Error ? e.message : "Camera unavailable");
      setCamState("idle");
    }
  }

  async function captureFace() {
    if (!videoRef.current) return;
    setFaceCapturing(true);
    try {
      // Capture a still image frame from the video stream
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
      const imageDataUrl = canvas.toDataURL("image/jpeg", 0.7);
      setCapturedImage(imageDataUrl);

      const descriptor = await getDescriptorFromVideo(videoRef.current);
      if (!descriptor) throw new Error("No face detected — improve lighting and get closer");
      setFaceDescriptor(descriptor.descriptor);
      setCamState("captured");
      stopCamera();
      toast.success("Face captured! Click 'Save face' to register.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Capture failed");
    } finally {
      setFaceCapturing(false);
    }
  }

  async function saveFace() {
    const employeeId = savedEmployeeId ?? editing?.id;
    if (!employeeId || !faceDescriptor) return;
    
    // Prevent duplicate registrations
    try {
      const registry = await fetchFaceRegistry();
      for (const entry of registry) {
        if (!entry.descriptor || entry.employeeId === employeeId) continue;
        const distance = euclidean(faceDescriptor, entry.descriptor);
        if (distance < MATCH_THRESHOLD) {
          toast.error("This face is already registered to another employee. Please contact an admin if this is a mistake.");
          return;
        }
      }
    } catch (e) {
      console.error("Failed to verify face uniqueness", e);
      toast.error("Failed to verify face uniqueness. Please try again.");
      return;
    }

    try {
      await saveEmployeeFaceDescriptor(employeeId, faceDescriptor);
      if (capturedImage) {
        await saveEmployeeProfileImage(employeeId, capturedImage);
      }
      setRegisteredIds((prev) => new Set([...prev, employeeId]));
      toast.success("Face registered successfully!");
      setOpen(false);
      resetForm();
      void loadEmployees(); // Reload to show updated profile image
    } catch (e: any) {
      console.error("Save face error:", e);
      toast.error(e?.message || e?.details || "Could not save face: " + JSON.stringify(e));
    }
  }

  function skipFace() {
    setOpen(false);
    resetForm();
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

  const currentEmployeeId = savedEmployeeId ?? editing?.id ?? null;
  const isAlreadyRegistered = currentEmployeeId ? registeredIds.has(currentEmployeeId) : false;

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
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editing ? "Edit employee" : "Add employee"}</DialogTitle>
                </DialogHeader>

                {/* Tabs */}
                <div className="flex gap-1 rounded-lg border bg-muted/40 p-1">
                  <button
                    type="button"
                    className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      activeTab === "details"
                        ? "bg-background shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setActiveTab("details")}
                  >
                    Details
                  </button>
                  <button
                    type="button"
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      activeTab === "face"
                        ? "bg-background shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setActiveTab("face")}
                  >
                    <ScanFace className="h-3.5 w-3.5" />
                    Face Registration
                    {isAlreadyRegistered && (
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                    )}
                  </button>
                </div>

                {/* Details Tab */}
                {activeTab === "details" && (
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
                      <Field label="Designation / Role">
                        <select
                          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                          value={form.role}
                          onChange={(event) => setForm({ ...form, role: event.target.value })}
                        >
                          {designations.length === 0 && (
                            <option value="">Loading roles...</option>
                          )}
                          {filteredDesignations.map((designation) => (
                            <option key={designation} value={designation}>
                              {designation}
                            </option>
                          ))}
                        </select>
                        <p className="mt-1 text-[11px] text-muted-foreground">Select the employee's job role in the outlet.</p>
                      </Field>
                      <Field label="Department">
                        <select
                          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                          value={form.department}
                          onChange={(event) => {
                            const newDept = event.target.value;
                            // Find the first designation for this new department
                            const firstRoleForDept = designations.find(d => !d.department || d.department === newDept)?.name || "";
                            setForm({ ...form, department: newDept, role: firstRoleForDept });
                          }}
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
                          placeholder="+92 3..."
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
                      {editing
                        ? "Update details then switch to the Face Registration tab to update the biometric."
                        : "Save the employee first, then you'll be taken to register their face for attendance."}
                    </div>
                    <DialogFooter>
                      <Button
                        type="submit"
                        disabled={saving || departments.length === 0 || designations.length === 0}
                      >
                        {saving ? "Saving..." : editing ? "Update & Register Face →" : "Save & Register Face →"}
                      </Button>
                    </DialogFooter>
                  </form>
                )}

                {/* Face Tab */}
                {activeTab === "face" && (
                  <div className="space-y-3">
                    {!currentEmployeeId ? (
                      <div className="rounded-md border bg-muted/40 p-4 text-center text-sm text-muted-foreground">
                        <ScanFace className="mx-auto mb-2 h-8 w-8 opacity-40" />
                        Save the employee details first, then register their face here.
                        <br />
                        <button
                          type="button"
                          className="mt-2 text-primary underline underline-offset-2"
                          onClick={() => setActiveTab("details")}
                        >
                          ← Go to Details
                        </button>
                      </div>
                    ) : (
                      <>
                        {isAlreadyRegistered && camState === "idle" && !faceDescriptor && (
                          <div className="flex items-center gap-2 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            Face already registered. You can re-capture to update it.
                          </div>
                        )}

                        {/* Camera view */}
                        <div className={`relative mx-auto flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border-4 bg-muted transition-all duration-300 ${
                          camState === "streaming" 
                            ? faceDetected 
                              ? "border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]" 
                              : "border-slate-300"
                            : "border-border"
                        }`}>
                          <video
                            ref={videoRef}
                            className="h-full w-full scale-x-[-1] object-cover"
                            muted
                            playsInline
                          />

                          {camState === "streaming" && (
                            <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1 ${
                              faceDetected 
                                ? "bg-emerald-500 text-white animate-pulse" 
                                : "bg-slate-700/80 text-slate-100"
                            }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${faceDetected ? "bg-white" : "bg-slate-400"}`} />
                              {faceDetected ? "FACE DETECTED" : "ALIGN FACE IN FRAME"}
                            </div>
                          )}

                          {camState === "captured" && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80 text-sm">
                              <CheckCircle2 className="h-10 w-10 text-green-500" />
                              <span className="font-medium">Face captured successfully</span>
                              <span className="text-xs text-muted-foreground">
                                Click "Save face" to register, or re-capture
                              </span>
                            </div>
                          )}

                          {(camState === "idle" || camState === "loading") && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/80">
                              {camState === "loading" ? (
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                              ) : (
                                <Camera className="h-8 w-8 opacity-40" />
                              )}
                              <span className="text-sm text-muted-foreground">
                                {camState === "loading" ? "Starting camera & loading models..." : "Camera preview"}
                              </span>
                              {camState === "idle" && (
                                <Button size="sm" onClick={startCamera}>
                                  <Camera className="mr-1.5 h-4 w-4" />
                                  Start camera
                                </Button>
                              )}
                            </div>
                          )}
                        </div>

                        {camError && (
                          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                            <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            {camError}
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex gap-2">
                          {camState === "streaming" && (
                            <>
                              <Button
                                className="flex-1"
                                onClick={captureFace}
                                disabled={faceCapturing || !faceDetected}
                              >
                                {faceCapturing ? (
                                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                ) : (
                                  <ScanFace className="mr-1.5 h-4 w-4" />
                                )}
                                {faceCapturing ? "Detecting..." : "Capture face"}
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  stopCamera();
                                  setCamState("idle");
                                }}
                              >
                                Cancel
                              </Button>
                            </>
                          )}
                          {camState === "captured" && faceDescriptor && (
                            <>
                              <Button className="flex-1" onClick={saveFace}>
                                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                                Save face
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setFaceDescriptor(null);
                                  setCamState("idle");
                                }}
                              >
                                Re-capture
                              </Button>
                            </>
                          )}
                          {camState === "idle" && (
                            <Button variant="ghost" size="sm" className="ml-auto" onClick={skipFace}>
                              Skip for now
                            </Button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
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

      <div className="overflow-hidden rounded-2xl border border-slate-100 dark:border-[#1B3A5C] bg-card shadow-xl shadow-slate-200/50 dark:shadow-none">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Employee</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Pay type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Face</TableHead>
              <TableHead className="text-right">Pay</TableHead>
              <TableHead className="w-8"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                  {loading ? "Loading employees..." : "No employee records found in the database."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((employee) => (
                <TableRow 
                  key={employee.id} 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate({ to: "/employees/$id", params: { id: employee.id } })}
                >
                  <TableCell>
                    <Link
                      to="/employees/$id"
                      params={{ id: employee.id }}
                      className="flex items-center gap-3"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold overflow-hidden">
                        {employee.profileImage
                          ? <img src={employee.profileImage} alt={employee.name} className="h-8 w-8 rounded-full object-cover" />
                          : initials(employee.name)
                        }
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
                  <TableCell>
                    {registeredIds.has(employee.id) ? (
                      <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Registered
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <XCircle className="h-3.5 w-3.5" />
                        Missing
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    Rs {employee.salary.toLocaleString("en-IN")}
                    <div className="text-xs text-muted-foreground">
                      + Rs {employee.fixedBonus.toLocaleString("en-IN")} bonus
                    </div>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
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
