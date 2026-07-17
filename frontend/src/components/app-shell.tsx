import { Link, useRouterState, useRouter } from "@tanstack/react-router";
import { LayoutDashboard, Users, Clock, Plane, Wallet, Megaphone, Bell, MessageSquare, BarChart3, Settings, Moon, Sun, LogOut, Menu } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; roles: Array<"manager" | "employee"> };
const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["manager", "employee"] },
  { to: "/employees", label: "Employees", icon: Users, roles: ["manager"] },
  { to: "/attendance", label: "Attendance", icon: Clock, roles: ["manager", "employee"] },
  { to: "/leave", label: "Leave", icon: Plane, roles: ["manager", "employee"] },
  { to: "/payroll", label: "Payroll", icon: Wallet, roles: ["manager", "employee"] },
  { to: "/announcements", label: "Announcements", icon: Megaphone, roles: ["manager", "employee"] },
  { to: "/chat", label: "Chat", icon: MessageSquare, roles: ["manager", "employee"] },
  { to: "/reports", label: "Reports", icon: BarChart3, roles: ["manager"] },
  { to: "/settings", label: "Settings", icon: Settings, roles: ["manager"] },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { role, fullName, user } = useAuth();
  const { theme, toggle } = useTheme();
  const router = useRouter();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const qc = useQueryClient();

  const { data: unread = 0 } = useQuery({
    queryKey: ["notif-unread"],
    enabled: !!user,
    queryFn: () => apiFetch("/notifications/unread-count").then(d => d.count ?? 0).catch(() => 0),
    refetchInterval: 3000,
  });

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    router.navigate({ to: "/auth", replace: true });
  };

  const items = NAV.filter((n) => role && n.roles.includes(role));

  const SidebarInner = (
    <>
      <div className="flex items-center gap-2 border-b border-sidebar-border px-6 py-5">
        <div className="h-8 w-8 rounded-sm bg-primary" />
        <div>
          <div className="font-serif text-lg font-semibold leading-none">HRMS</div>
          <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">Workforce</div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {items.map((item) => {
          const active = path === item.to || path.startsWith(item.to + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border px-3 py-4">
        <button onClick={signOut} className="flex w-full items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="hidden w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        {SidebarInner}
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar">{SidebarInner}</aside>
        </div>
      )}
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}><Menu className="h-5 w-5" /></Button>
            <div className="hidden text-sm text-muted-foreground md:block">
              {new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/notifications">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-4 w-4" />
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">{unread}</span>
                )}
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <div className="ml-2 flex items-center gap-2 border-l border-border pl-3">
              <div className="hidden text-right sm:block">
                <div className="text-sm font-medium leading-tight">{fullName}</div>
                <Badge variant="outline" className="mt-0.5 text-[10px] font-normal uppercase tracking-wider">{role ?? "—"}</Badge>
              </div>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">{(fullName || "?").slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-x-auto p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
