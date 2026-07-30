import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string | number;
  delta?: string;
  trend?: "up" | "down" | "flat";
  icon?: LucideIcon;
  className?: string;
};

export function StatCard({ label, value, delta, trend = "flat", icon: Icon, className }: Props) {
  const trendColor =
    trend === "up"
      ? "text-[oklch(var(--success))]"
      : trend === "down"
        ? "text-destructive"
        : "text-muted-foreground";
  return (
    <div
      className={cn("rounded-2xl border border-border bg-card p-6 shadow-xl shadow-slate-200/50 dark:shadow-none", className)}
    >
      <div className="flex items-start justify-between">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        {Icon ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
      </div>
      <div className="mt-3 text-2xl font-semibold tabular-nums">{value}</div>
      {delta ? <div className={cn("mt-1 text-xs", trendColor)}>{delta}</div> : null}
    </div>
  );
}
