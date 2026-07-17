import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";
import { Megaphone, Plus } from "lucide-react";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/announcements")({
  component: Announcements,
});

function Announcements() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", body: "" });

  const list = useQuery({
    queryKey: ["announcements"],
    queryFn: () => apiFetch("/announcements").catch(() => []),
  });

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch("/announcements", {
        method: "POST",
        body: JSON.stringify({ title: form.title, body: form.body }),
      });
      toast.success("Announcement posted");
      setOpen(false);
      setForm({ title: "", body: "" });
      qc.invalidateQueries({ queryKey: ["announcements"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to post announcement");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="font-serif text-3xl font-semibold tracking-tight">Announcements</h1><p className="mt-1 text-sm text-muted-foreground">Company-wide messages</p></div>
        {role === "manager" && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" /> New</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-serif">New announcement</DialogTitle></DialogHeader>
              <form onSubmit={create} className="space-y-3">
                <div className="space-y-2"><Label>Title</Label><Input required maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div className="space-y-2"><Label>Body</Label><Textarea required rows={5} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
                <DialogFooter><Button type="submit">Post</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {list.isLoading ? <Skeleton className="h-32" /> :
        (list.data ?? []).length === 0 ? (
          <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No announcements yet.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {list.data!.map((a: any) => (
              <Card key={a.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 font-serif text-lg"><Megaphone className="h-4 w-4 text-primary" /> {a.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm">{a.body}</p>
                  <p className="mt-3 text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleString()}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
    </div>
  );
}
