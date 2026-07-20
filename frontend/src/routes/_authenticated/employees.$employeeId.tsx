import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ArrowLeft, ScanFace, User, Briefcase, IndianRupee, Clock,
  CheckCircle2, AlertCircle, Edit2, Save, X, Camera
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { FaceCamera } from "@/components/FaceCamera";

export const Route = createFileRoute("/_authenticated/employees/$employeeId")({
  component: EmployeeDetailPage,
});

const DEPARTMENTS = ["Engineering", "Operations", "HR", "Finance", "Sales", "Marketing", "Legal", "Admin"];

function EmployeeDetailPage() {
  const { employeeId } = Route.useParams();
  const qc = useQueryClient();
  const router = useRouter();
  const [editMode, setEditMode] = useState(false);
  const [faceDialog, setFaceDialog] = useState(false);
  const [busyFace, setBusyFace] = useState(false);
  const [form, setForm] = useState<any>(null);

  const query = useQuery({
    queryKey: ["employee", employeeId],
    queryFn: () => apiFetch(`/employees/${employeeId}`),
  });

  const emp = query.data;

  const startEdit = () => {
    setForm({
      name: emp.name,
      phone: emp.phone ?? "",
      govtId: emp.govtId ?? "",
      address: emp.address ?? "",
      department: emp.department,
      designation: emp.designation ?? "",
      paymentType: emp.paymentType,
      baseSalary: emp.baseSalary ?? "",
      hourlyRate: emp.hourlyRate ?? "",
      status: emp.status,
      photoUrl: emp.photoUrl ?? "",
    });
    setEditMode(true);
  };

  const saveMutation = useMutation({
    mutationFn: (data: any) => apiFetch(`/employees/${employeeId}`, {
      method: "PUT", body: JSON.stringify(data)
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee", employeeId] });
      qc.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employee updated successfully");
      setEditMode(false);
    },
    onError: (e: any) => toast.error(e.message || "Update failed"),
  });

  const handleSave = () => {
    const data: any = { ...form };
    if (form.paymentType === "MONTHLY") { data.hourlyRate = null; }
    if (form.paymentType === "HOURLY") { data.baseSalary = null; }
    if (data.baseSalary) data.baseSalary = Number(data.baseSalary);
    if (data.hourlyRate) data.hourlyRate = Number(data.hourlyRate);
    saveMutation.mutate(data);
  };

  const handleFaceRegister = async (descriptor: Float32Array) => {
    setBusyFace(true);
    try {
      await apiFetch(`/employees/${employeeId}/register-face`, {
        method: "POST",
        body: JSON.stringify({ descriptor: Array.from(descriptor) }),
      });
      toast.success("Face registered successfully!");
      qc.invalidateQueries({ queryKey: ["employee", employeeId] });
      qc.invalidateQueries({ queryKey: ["employees"] });
      setFaceDialog(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to register face");
    } finally {
      setBusyFace(false);
    }
  };

  if (query.isLoading) return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );

  if (!emp) return (
    <div className="py-20 text-center">
      <p className="text-muted-foreground">Employee not found.</p>
      <Link to="/employees"><Button variant="outline" className="mt-4">Back to Employees</Button></Link>
    </div>
  );

  const hasFace = emp.faceEmbeddings?.length > 0;
  const recentAttendance = emp.attendanceRecords ?? [];
  const monthEarnings = recentAttendance
    .filter((r: any) => {
      const d = new Date(r.date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s: number, r: any) => s + (r.dailyEarnings ?? 0), 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Breadcrumb + Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/employees">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          {emp.photoUrl ? (
            <img src={emp.photoUrl} alt={emp.name} className="h-12 w-12 shrink-0 rounded-full object-cover shadow-sm border border-border" />
          ) : (
            <div className="h-12 w-12 shrink-0 rounded-full bg-muted flex items-center justify-center font-bold text-lg text-muted-foreground border border-border">
              {emp.name.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold">{emp.name}</h1>
            <p className="text-sm text-muted-foreground">{emp.employeeCode} · {emp.designation || emp.department}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setFaceDialog(true)}>
            <Camera className="mr-1.5 h-4 w-4" />
            {hasFace ? "Re-register Face" : "Register Face"}
          </Button>
          {!editMode ? (
            <Button size="sm" onClick={startEdit}>
              <Edit2 className="mr-1.5 h-4 w-4" /> Edit
            </Button>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={() => setEditMode(false)}>
                <X className="mr-1.5 h-4 w-4" /> Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending}>
                <Save className="mr-1.5 h-4 w-4" />
                {saveMutation.isPending ? "Saving…" : "Save"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Status" value={emp.status} badge />
        <StatCard label="Payment" value={emp.paymentType === "HOURLY" ? `₹${emp.hourlyRate}/hr` : `₹${emp.baseSalary?.toLocaleString("en-IN")}/mo`} />
        <StatCard label="Face" value={hasFace ? "Registered" : "Not set"} faceStatus={hasFace} />
        <StatCard label="This Month" value={`₹${monthEarnings.toFixed(0)}`} />
      </div>

      <Tabs defaultValue="info">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="info" className="flex-1 sm:flex-none"><User className="mr-1.5 h-3.5 w-3.5" />Profile</TabsTrigger>
          <TabsTrigger value="payroll" className="flex-1 sm:flex-none"><IndianRupee className="mr-1.5 h-3.5 w-3.5" />Payroll</TabsTrigger>
          <TabsTrigger value="attendance" className="flex-1 sm:flex-none"><Clock className="mr-1.5 h-3.5 w-3.5" />Attendance</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="info" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="border-b pb-3">
              <CardTitle className="font-serif text-base flex items-center gap-2">
                <User className="h-4 w-4" /> Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 pt-4 sm:grid-cols-2">
              {editMode ? (
                <>
                  <EditField label="Full Name" value={form.name} onChange={v => setForm({ ...form, name: v })} />
                  <EditField label="Phone" value={form.phone} onChange={v => setForm({ ...form, phone: v })} />
                  <EditField label="Government ID" value={form.govtId} onChange={v => setForm({ ...form, govtId: v })} />
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Department</Label>
                    <Select value={form.department} onValueChange={v => setForm({ ...form, department: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <EditField label="Designation" value={form.designation} onChange={v => setForm({ ...form, designation: v })} />
                  <EditField label="Photo URL" value={form.photoUrl} onChange={v => setForm({ ...form, photoUrl: v })} />
                  <div className="sm:col-span-2">
                    <EditField label="Address" value={form.address} onChange={v => setForm({ ...form, address: v })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <>
                  <InfoRow label="Full Name" value={emp.name} />
                  <InfoRow label="Phone" value={emp.phone || "—"} />
                  <InfoRow label="Government ID" value={emp.govtId || "—"} />
                  <InfoRow label="Department" value={emp.department} />
                  <InfoRow label="Designation" value={emp.designation || "—"} />
                  <InfoRow label="Date of Joining" value={new Date(emp.dateOfJoining).toLocaleDateString("en-IN")} />
                  <div className="sm:col-span-2">
                    <InfoRow label="Address" value={emp.address || "—"} />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payroll Tab */}
        <TabsContent value="payroll" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="border-b pb-3">
              <CardTitle className="font-serif text-base flex items-center gap-2">
                <IndianRupee className="h-4 w-4" /> Payroll Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {editMode ? (
                <>
                  <div className="flex gap-3">
                    {(["MONTHLY", "HOURLY"] as const).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setForm({ ...form, paymentType: type })}
                        className={`flex-1 rounded-xl border-2 p-4 text-left transition-all ${
                          form.paymentType === type ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                        }`}
                      >
                        <div className="font-semibold text-sm">{type === "MONTHLY" ? "Monthly Paid" : "Hourly Paid"}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {type === "MONTHLY" ? "Fixed salary ÷ 26 working days" : "Paid per hour worked"}
                        </div>
                      </button>
                    ))}
                  </div>
                  {form.paymentType === "MONTHLY" ? (
                    <EditField label="Monthly Salary (₹)" value={String(form.baseSalary)} onChange={v => setForm({ ...form, baseSalary: v })} type="number" />
                  ) : (
                    <EditField label="Hourly Rate (₹)" value={String(form.hourlyRate)} onChange={v => setForm({ ...form, hourlyRate: v })} type="number" />
                  )}
                </>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoRow label="Payment Type" value={emp.paymentType} />
                  {emp.paymentType === "MONTHLY" ? (
                    <>
                      <InfoRow label="Monthly Salary" value={`₹${emp.baseSalary?.toLocaleString("en-IN")}`} />
                      <InfoRow label="Daily Rate (÷26)" value={`₹${(emp.baseSalary / 26).toFixed(0)}`} />
                      <InfoRow label="Half-day Rate" value={`₹${(emp.baseSalary / 52).toFixed(0)}`} />
                    </>
                  ) : (
                    <>
                      <InfoRow label="Hourly Rate" value={`₹${emp.hourlyRate}/hr`} />
                      <InfoRow label="8-hour Day" value={`₹${(emp.hourlyRate * 8).toFixed(0)}`} />
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payroll Entries */}
          {emp.payrollEntries?.length > 0 && (
            <Card>
              <CardHeader className="border-b pb-3">
                <CardTitle className="font-serif text-base">Payroll History</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Earnings</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emp.payrollEntries.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium text-sm">
                          {new Date(p.payrollPeriod.year, p.payrollPeriod.month - 1).toLocaleString("en-IN", { month: "long", year: "numeric" })}
                        </TableCell>
                        <TableCell className="text-sm">{p.totalDays} ({p.fullDays}F {p.halfDays}H)</TableCell>
                        <TableCell className="text-sm">{Number(p.totalHours).toFixed(1)}h</TableCell>
                        <TableCell className="text-sm font-medium">₹{Number(p.netPay).toLocaleString("en-IN", { minimumFractionDigits: 0 })}</TableCell>
                        <TableCell>
                          <Badge variant={p.payrollPeriod.status === "FINALIZED" ? "default" : "secondary"} className="text-[10px]">
                            {p.payrollPeriod.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="mt-4">
          <Card>
            <CardHeader className="border-b pb-3">
              <CardTitle className="font-serif text-base">Recent Attendance</CardTitle>
              <CardDescription>Last 60 records</CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {recentAttendance.length === 0 ? (
                <div className="p-10 text-center text-sm text-muted-foreground">No attendance records yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Check-in</TableHead>
                      <TableHead>Check-out</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Day Type</TableHead>
                      <TableHead>Earnings</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentAttendance.slice(0, 30).map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm font-medium">
                          {new Date(r.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                        </TableCell>
                        <TableCell className="text-sm">
                          {r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}
                        </TableCell>
                        <TableCell className="text-sm">{r.hoursWorked ? `${Number(r.hoursWorked).toFixed(1)}h` : "—"}</TableCell>
                        <TableCell>
                          {r.checkInTime
                            ? r.isHalfDay
                              ? <Badge variant="outline" className="text-[10px]">Half</Badge>
                              : <Badge variant="outline" className="border-green-500 text-green-700 text-[10px]">Full</Badge>
                            : "—"}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {r.dailyEarnings ? `₹${Number(r.dailyEarnings).toFixed(0)}` : "—"}
                        </TableCell>
                        <TableCell>
                          {r.status === "LATE"
                            ? <Badge variant="destructive" className="text-[10px]">Late</Badge>
                            : r.status === "PRESENT"
                            ? <Badge variant="outline" className="border-green-500 text-green-700 text-[10px]">Present</Badge>
                            : <Badge variant="secondary" className="text-[10px]">{r.status}</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Face Registration Dialog */}
      <Dialog open={faceDialog} onOpenChange={o => { if (!busyFace) setFaceDialog(o); }}>
        <DialogContent className="max-w-md mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-serif">
              <ScanFace className="h-5 w-5" /> Register Face — {emp.name}
            </DialogTitle>
            <DialogDescription>
              {hasFace
                ? "This will replace the existing face registration. Position the employee clearly."
                : "Position the employee's face clearly in the frame and click Capture."}
            </DialogDescription>
          </DialogHeader>
          <FaceCamera
            mode="register"
            onCapture={handleFaceRegister}
            onCancel={() => setFaceDialog(false)}
            busy={busyFace}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium">{value}</p>
    </div>
  );
}

function EditField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input type={type} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

function StatCard({ label, value, badge, faceStatus }: { label: string; value: string; badge?: boolean; faceStatus?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        {badge ? (
          <Badge variant={value === "ACTIVE" ? "outline" : "secondary"} className={value === "ACTIVE" ? "border-green-500 text-green-700" : ""}>
            {value}
          </Badge>
        ) : faceStatus !== undefined ? (
          <div className={`flex items-center gap-1 text-sm font-medium ${faceStatus ? "text-green-600" : "text-amber-600"}`}>
            {faceStatus ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {value}
          </div>
        ) : (
          <p className="text-sm font-semibold">{value}</p>
        )}
      </CardContent>
    </Card>
  );
}
