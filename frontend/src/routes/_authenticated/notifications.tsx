import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: Notifications,
});

function Notifications() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["notifs"],
    queryFn: () => apiFetch("/notifications").catch(() => []),
  });

  const markAllRead = async () => {
    try {
      await apiFetch("/notifications/read", { method: "POST" });
      toast.success("Marked all as read");
      qc.invalidateQueries();
    } catch (e: any) {
      toast.error(e.message || "Failed to mark as read");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="font-serif text-3xl font-semibold tracking-tight">Notifications</h1><p className="mt-1 text-sm text-muted-foreground">Your recent activity</p></div>
        <Button variant="outline" onClick={markAllRead}><CheckCheck className="mr-1 h-4 w-4" /> Mark all read</Button>
      </div>
      {list.isLoading ? <Skeleton className="h-32" /> :
        (list.data ?? []).length === 0 ? (
          <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">You're all caught up.</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {list.data!.map((n: any) => (
              <Card key={n.id} className={n.readAt ? "" : "border-primary/40 bg-accent/30"}>
                <CardContent className="flex items-start gap-3 py-4">
                  <Bell className="mt-0.5 h-4 w-4 text-primary" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{n.title}</div>
                    {n.body && <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
    </div>
  );
}
