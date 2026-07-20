import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useEffect, useState } from "react";
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
        shiftStart: "09:00",
        shiftEnd: "17:00",
        halfDayThresholdHours: 4.0,
        fullDayHours: 8.0,
        faceMatchThreshold: 0.55
      });
    }
  }, [data, isLoading]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch("/settings", {
        method: "PUT",
        body: JSON.stringify({
          shiftStart: form.shiftStart, 
          shiftEnd: form.shiftEnd,
          halfDayThresholdHours: Number(form.halfDayThresholdHours),
          fullDayHours: Number(form.fullDayHours),
          faceMatchThreshold: Number(form.faceMatchThreshold),
        })
      });
      toast.success("Settings saved");
      qc.invalidateQueries();
    } catch (e: any) {
      toast.error(e.message || "Failed to save settings");
    }
  };

  if (isLoading || !form) return <div className="mx-auto max-w-3xl"><Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Loading…</CardContent></Card></div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div><h1 className="font-serif text-3xl font-semibold tracking-tight">Settings</h1><p className="mt-1 text-sm text-muted-foreground">Company shift timings and verification policies</p></div>
      <form onSubmit={save} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="font-serif">Shift & Timings</CardTitle><CardDescription>Configure standard shift hours for attendance calculation.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Shift start</Label><Input type="time" value={form.shiftStart} onChange={(e) => setForm({ ...form, shiftStart: e.target.value })} /></div>
              <div className="space-y-2"><Label>Shift end</Label><Input type="time" value={form.shiftEnd} onChange={(e) => setForm({ ...form, shiftEnd: e.target.value })} /></div>
              <div className="space-y-2"><Label>Half-day threshold (hours)</Label><Input type="number" step="0.5" value={form.halfDayThresholdHours} onChange={(e) => setForm({ ...form, halfDayThresholdHours: e.target.value })} /></div>
              <div className="space-y-2"><Label>Full-day hours</Label><Input type="number" step="0.5" value={form.fullDayHours} onChange={(e) => setForm({ ...form, fullDayHours: e.target.value })} /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="font-serif">Security Policy</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="max-w-xs space-y-2">
              <Label>Face match threshold (0–1)</Label>
              <Input type="number" step="0.01" min="0" max="1" value={form.faceMatchThreshold} onChange={(e) => setForm({ ...form, faceMatchThreshold: e.target.value })} />
              <p className="text-xs text-muted-foreground">Lower is stricter. Default is 0.55.</p>
            </div>
          </CardContent>
        </Card>
        <div className="flex justify-end"><Button type="submit">Save changes</Button></div>
      </form>
    </div>
  );
}
