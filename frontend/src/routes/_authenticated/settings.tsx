import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/settings")({
  component: Settings,
});

function Settings() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: () => apiFetch("/settings").catch(() => null),
  });
  
  const [form, setForm] = useState<any>(null);
  
  useEffect(() => { 
    if (data) {
      setForm(data); 
    } else if (!isLoading) {
      // Mock data if no backend settings yet
      setForm({
        companyName: "Acme Corp",
        officeLat: 0,
        officeLng: 0,
        geofenceRadiusM: 100,
        shiftStart: "09:00",
        shiftEnd: "17:00",
        overtimeRate: 15.0,
        overtimeOffsetsLeave: false,
        faceMatchThreshold: 0.6
      });
    }
  }, [data, isLoading]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch("/settings", {
        method: "PUT",
        body: JSON.stringify({
          companyName: form.companyName,
          officeLat: Number(form.officeLat), 
          officeLng: Number(form.officeLng),
          geofenceRadiusM: Number(form.geofenceRadiusM),
          shiftStart: form.shiftStart, 
          shiftEnd: form.shiftEnd,
          overtimeRate: Number(form.overtimeRate), 
          overtimeOffsetsLeave: form.overtimeOffsetsLeave,
          faceMatchThreshold: Number(form.faceMatchThreshold),
        })
      });
      toast.success("Settings saved");
      qc.invalidateQueries();
    } catch (e: any) {
      toast.error(e.message || "Failed to save settings");
    }
  };

  const useMyLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (p) => { setForm({ ...form, officeLat: p.coords.latitude, officeLng: p.coords.longitude }); toast.success("Location captured"); },
      () => toast.error("Could not read location")
    );
  };

  if (isLoading || !form) return <div className="mx-auto max-w-3xl"><Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Loading…</CardContent></Card></div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div><h1 className="font-serif text-3xl font-semibold tracking-tight">Settings</h1><p className="mt-1 text-sm text-muted-foreground">Company and payroll configuration</p></div>
      <form onSubmit={save} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="font-serif">Company</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>Company name</Label><Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} /></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="font-serif">Geofence & shift</CardTitle><CardDescription>Attendance is only accepted inside this radius, during shift.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Office latitude</Label><Input value={form.officeLat} onChange={(e) => setForm({ ...form, officeLat: e.target.value })} /></div>
              <div className="space-y-2"><Label>Office longitude</Label><Input value={form.officeLng} onChange={(e) => setForm({ ...form, officeLng: e.target.value })} /></div>
            </div>
            <Button type="button" variant="outline" onClick={useMyLocation}><MapPin className="mr-1 h-4 w-4" /> Use my current location</Button>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Radius (m)</Label><Input type="number" value={form.geofenceRadiusM} onChange={(e) => setForm({ ...form, geofenceRadiusM: e.target.value })} /></div>
              <div className="space-y-2"><Label>Shift start</Label><Input type="time" value={form.shiftStart} onChange={(e) => setForm({ ...form, shiftStart: e.target.value })} /></div>
              <div className="space-y-2"><Label>Shift end</Label><Input type="time" value={form.shiftEnd} onChange={(e) => setForm({ ...form, shiftEnd: e.target.value })} /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="font-serif">Payroll policy</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Overtime rate (per hour)</Label><Input type="number" step="0.01" value={form.overtimeRate} onChange={(e) => setForm({ ...form, overtimeRate: e.target.value })} /></div>
              <div className="space-y-2"><Label>Face match threshold (0–1)</Label><Input type="number" step="0.01" min="0" max="1" value={form.faceMatchThreshold} onChange={(e) => setForm({ ...form, faceMatchThreshold: e.target.value })} /></div>
            </div>
            <label className="flex items-center gap-3 rounded-md border border-border p-3">
              <Switch checked={form.overtimeOffsetsLeave} onCheckedChange={(v) => setForm({ ...form, overtimeOffsetsLeave: v })} />
              <div><div className="text-sm font-medium">Overtime offsets leave deductions</div><div className="text-xs text-muted-foreground">If on, overtime pay reduces unpaid-leave deductions.</div></div>
            </label>
          </CardContent>
        </Card>
        <div className="flex justify-end"><Button type="submit">Save changes</Button></div>
      </form>
    </div>
  );
}
