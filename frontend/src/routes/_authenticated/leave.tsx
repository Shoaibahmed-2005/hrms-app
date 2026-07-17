import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/leave")({
  component: LeavePage,
});

function LeavePage() {
  const { role } = useAuth();
  return role === "manager" ? <ManagerLeave /> : <EmployeeLeave />;
}

function EmployeeLeave() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ leave_kind: "casual", start_date: "", end_date: "", is_half_day: false, reason: "" });

  const balances = useQuery({
    queryKey: ["balances"],
    queryFn: () => apiFetch("/leaves/balances"),
  });
  
  const requests = useQuery({
    queryKey: ["my-leaves"],
    queryFn: () => apiFetch("/leaves"),
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Find the leave type ID (mock behavior: assuming leave type 'name' matches leave_kind)
      // Since backend expects leaveTypeId, and balances contains leaveType objects
      const leaveType = balances.data?.find((b: any) => b.leaveType?.name.toLowerCase() === form.leave_kind.toLowerCase())?.leaveType;
      
      await apiFetch("/leaves", {
        method: "POST",
        body: JSON.stringify({
          leaveTypeId: leaveType?.id || form.leave_kind,
          startDate: form.start_date,
          endDate: form.end_date,
          isHalfDay: form.is_half_day,
          reason: form.reason
        })
      });
      toast.success("Leave request submitted");
      setOpen(false);
      setForm({ leave_kind: "casual", start_date: "", end_date: "", is_half_day: false, reason: "" });
      qc.invalidateQueries();
    } catch (e: any) {
      toast.error(e.message || "Failed to submit request");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight">Leave</h1>
          <p className="mt-1 text-sm text-muted-foreground">Request time off and view history</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" /> New request</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-serif">New leave request</DialogTitle><DialogDescription>Submit for manager approval.</DialogDescription></DialogHeader>
            <form onSubmit={submit} className="space-y-3">
              <div className="space-y-2"><Label>Type</Label>
                <Select value={form.leave_kind} onValueChange={(v) => setForm({ ...form, leave_kind: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sick">Sick</SelectItem><SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="earned">Earned</SelectItem><SelectItem value="unpaid">Unpaid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2"><Label>From</Label><Input required type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
                <div className="space-y-2"><Label>To</Label><Input required type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
              </div>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.is_half_day} onCheckedChange={(v) => setForm({ ...form, is_half_day: !!v })} /> Half day</label>
              <div className="space-y-2"><Label>Reason</Label><Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} maxLength={500} /></div>
              <DialogFooter><Button type="submit">Submit</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {(balances.data ?? []).map((b: any) => (
          <Card key={b.id}>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium capitalize text-muted-foreground">{b.leaveType?.name}</CardTitle></CardHeader>
            <CardContent><div className="font-serif text-3xl font-semibold">{Number(b.balanceDays)}</div><p className="text-xs text-muted-foreground">days remaining</p></CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="font-serif">My requests</CardTitle></CardHeader>
        <CardContent className="p-0">
          {requests.isLoading ? <div className="p-6"><Skeleton className="h-24" /></div> :
            (requests.data ?? []).length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">No requests yet.</div> : (
              <Table>
                <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Dates</TableHead><TableHead>Reason</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {requests.data!.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="capitalize">{r.leaveType?.name}{r.isHalfDay && " (½)"}</TableCell>
                      <TableCell className="text-sm">{new Date(r.startDate).toLocaleDateString()} → {new Date(r.endDate).toLocaleDateString()}</TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-muted-foreground">{r.reason}</TableCell>
                      <TableCell><StatusBadge status={r.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

function ManagerLeave() {
  const qc = useQueryClient();
  const [comment, setComment] = useState("");
  const requests = useQuery({
    queryKey: ["all-leaves"],
    queryFn: () => apiFetch("/leaves")
  });

  const act = async (id: string, approve: boolean) => {
    try {
      await apiFetch(`/leaves/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          status: approve ? 'APPROVED' : 'REJECTED',
          reviewComment: comment || undefined
        })
      });
      toast.success(approve ? "Approved" : "Rejected");
      setComment("");
      qc.invalidateQueries();
    } catch (e: any) {
      toast.error(e.message || "Failed to update status");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">Leave</h1>
        <p className="mt-1 text-sm text-muted-foreground">All employee leave requests</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="font-serif">Requests</CardTitle></CardHeader>
        <CardContent className="p-0">
          {requests.isLoading ? <div className="p-6"><Skeleton className="h-24" /></div> :
            (requests.data ?? []).length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">No leave requests.</div> : (
              <Table>
                <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Type</TableHead><TableHead>Dates</TableHead><TableHead>Reason</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {requests.data!.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell><div className="font-medium">{r.employee?.name}</div><div className="text-xs text-muted-foreground">{r.employee?.employeeCode}</div></TableCell>
                      <TableCell className="capitalize">{r.leaveType?.name}{r.isHalfDay && " (½)"}</TableCell>
                      <TableCell className="text-sm">{new Date(r.startDate).toLocaleDateString()} → {new Date(r.endDate).toLocaleDateString()}</TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-muted-foreground">{r.reason}</TableCell>
                      <TableCell><StatusBadge status={r.status} /></TableCell>
                      <TableCell className="text-right space-x-1">
                        {r.status === "PENDING" ? (
                          <>
                            <Button size="sm" onClick={() => act(r.id, true)}>Approve</Button>
                            <Button size="sm" variant="outline" onClick={() => act(r.id, false)}>Reject</Button>
                          </>
                        ) : <span className="text-xs text-muted-foreground">{r.reviewComment || "—"}</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = (status || '').toLowerCase();
  const v = s === "approved" ? "default" : s === "rejected" ? "destructive" : "secondary";
  return <Badge variant={v as any} className="capitalize">{s}</Badge>;
}
