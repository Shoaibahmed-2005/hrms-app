import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Trash2, Megaphone, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  fetchAnnouncements,
  saveAnnouncement,
  deleteAnnouncement,
  type Announcement,
} from "@/lib/hrms-db";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_app/announcements")({
  head: () => ({ meta: [{ title: "Announcements - CleanUp" }] }),
  component: AnnouncementsPage,
});

function AnnouncementsPage() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    body: "",
    active: true,
    isHoliday: false,
    holidayDate: "",
  });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const data = await fetchAnnouncements();
      setAnnouncements(data);
    } catch (e) {
      toast.error("Could not load announcements");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setProcessing(true);
    try {
      await saveAnnouncement({
        title: form.isHoliday ? `[HOLIDAY] ${form.title.replace(/\[HOLIDAY\]/gi, "").trim()}` : form.title,
        body: form.isHoliday ? form.holidayDate : form.body,
        active: form.active,
        createdBy: user?.id || "",
      });
      toast.success("Announcement created");
      setOpen(false);
      setForm({ title: "", body: "", active: true, isHoliday: false, holidayDate: "" });
      load();
    } catch (error) {
      toast.error("Failed to save announcement");
    } finally {
      setProcessing(false);
    }
  }

  async function toggleActive(announcement: Announcement, active: boolean) {
    try {
      await saveAnnouncement({
        id: announcement.id,
        title: announcement.title,
        body: announcement.body,
        active,
        createdBy: announcement.createdBy || user?.id || "",
      });
      toast.success(active ? "Announcement activated" : "Announcement disabled");
      load();
    } catch (e) {
      toast.error("Failed to update status");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this announcement?")) return;
    try {
      await deleteAnnouncement(id);
      toast.success("Deleted");
      load();
    } catch (e) {
      toast.error("Failed to delete");
    }
  }

  return (
    <div>
      <PageHeader
        title="Announcements"
        description="Manage notices that appear on the Kiosk page."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1.5 h-4 w-4" />
                New Announcement
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Announcement</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="E.g. Holiday Notice"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Is this a Holiday?</Label>
                  <Switch
                    checked={form.isHoliday}
                    onCheckedChange={(c) => setForm({ ...form, isHoliday: c })}
                  />
                </div>

                {form.isHoliday ? (
                  <div className="space-y-1.5">
                    <Label>Holiday Date</Label>
                    <Input
                      type="date"
                      value={form.holidayDate}
                      onChange={(e) => setForm({ ...form, holidayDate: e.target.value })}
                      required={form.isHoliday}
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label>Body</Label>
                    <Textarea
                      value={form.body}
                      onChange={(e) => setForm({ ...form, body: e.target.value })}
                      placeholder="Details about the announcement..."
                      rows={4}
                    />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <Label>Active (Show on Kiosk)</Label>
                  <Switch
                    checked={form.active}
                    onCheckedChange={(c) => setForm({ ...form, active: c })}
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={processing}>
                    {processing ? "Saving..." : "Save Announcement"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            Loading...
          </div>
        ) : announcements.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            No announcements yet.
          </div>
        ) : (
          announcements.map((a) => (
            <div
              key={a.id}
              className={`relative rounded-xl border bg-card p-5 shadow-sm transition-opacity ${
                !a.active ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-md ${a.title.includes("[HOLIDAY]") ? "bg-primary/20 text-primary" : "bg-accent/20 text-accent"}`}>
                    <Megaphone className="h-4 w-4" />
                  </div>
                  <div className="font-semibold">{a.title.replace(/\[HOLIDAY\]/gi, "").trim()}</div>
                  {a.title.includes("[HOLIDAY]") && (
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">Holiday</span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => handleDelete(a.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-3 text-sm text-muted-foreground line-clamp-3">
                {a.title.includes("[HOLIDAY]") ? `Date: ${a.body}` : (a.body || "No additional details")}
              </p>
              <div className="mt-4 flex items-center justify-between border-t pt-4 text-xs text-muted-foreground">
                <div>By {a.createdBy} on {new Date(a.createdAt).toLocaleDateString()}</div>
                <div className="flex items-center gap-2 font-medium">
                  Active
                  <Switch
                    checked={a.active}
                    onCheckedChange={(c) => toggleActive(a, c)}
                    className="scale-75"
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
