import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Bell, CheckCheck, LogIn, LogOut, AlertTriangle,
  IndianRupee, Clock, ShieldAlert
} from "lucide-react";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: Notifications,
});

const TYPE_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  CHECK_IN:          { icon: LogIn,       color: "text-green-600",  label: "Check-in" },
  CHECK_OUT:         { icon: LogOut,      color: "text-blue-600",   label: "Check-out" },
  LATE:              { icon: Clock,       color: "text-amber-600",  label: "Late" },
  ABSENT:            { icon: AlertTriangle, color: "text-red-600",  label: "Absent" },
  FACE_FAIL:         { icon: ShieldAlert, color: "text-red-600",    label: "Face Fail" },
  PAYROLL_GENERATED: { icon: IndianRupee, color: "text-primary",    label: "Payroll" },
  DEFAULT:           { icon: Bell,        color: "text-muted-foreground", label: "Info" },
};

function Notifications() {
  const qc = useQueryClient();
  const router = useRouter();

  const list = useQuery({
    queryKey: ["notifs"],
    queryFn: () => apiFetch("/notifications").catch(() => []),
    refetchInterval: 5000,
  });

  const markAllRead = async () => {
    try {
      await apiFetch("/notifications/read", { method: "POST" });
      qc.invalidateQueries({ queryKey: ["notifs"] });
      qc.invalidateQueries({ queryKey: ["notif-unread"] });
      toast.success("All notifications marked as read");
    } catch (e: any) {
      toast.error(e.message || "Failed");
    }
  };

  const handleClick = (n: any) => {
    if (n.actionUrl) {
      // Mark as read then navigate
      apiFetch(`/notifications/read`, { method: "POST" }).catch(() => {});
      qc.invalidateQueries({ queryKey: ["notif-unread"] });
      router.navigate({ to: n.actionUrl });
    }
  };

  const unread = (list.data ?? []).filter((n: any) => !n.isRead).length;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unread > 0 ? `${unread} unread` : "All caught up"}
          </p>
        </div>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="mr-1.5 h-4 w-4" /> Mark all read
          </Button>
        )}
      </div>

      {list.isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : (list.data ?? []).length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Bell className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No notifications yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {(list.data as any[]).map((n) => {
            const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.DEFAULT;
            const Icon = cfg.icon;
            const isUnread = !n.isRead;
            const isClickable = !!n.actionUrl;
            return (
              <Card
                key={n.id}
                className={`transition-all ${isUnread ? "border-primary/30 bg-primary/5" : ""} ${isClickable ? "cursor-pointer hover:border-primary/50 hover:shadow-sm" : ""}`}
                onClick={() => isClickable && handleClick(n)}
              >
                <CardContent className="flex items-start gap-3 py-4 px-4">
                  <div className={`mt-0.5 shrink-0 rounded-full p-1.5 bg-muted ${cfg.color}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm leading-snug ${isUnread ? "font-medium" : ""}`}>
                        {n.message}
                      </p>
                      {isUnread && (
                        <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px] px-1.5">{cfg.label}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {timeAgo(new Date(n.createdAt))}
                      </span>
                      {isClickable && (
                        <span className="text-xs text-primary">Tap to view →</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
