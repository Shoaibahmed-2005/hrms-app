import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Wallet,
  BarChart3,
  BarChart2,
  Settings,
  Megaphone,
  Menu,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: Array<"manager">;
};
type NavGroup = { label: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { to: "/dashboard", label: "Manager Dashboard", icon: LayoutDashboard, roles: ["manager"] },
    ],
  },
  {
    label: "Workforce",
    items: [
      { to: "/employees", label: "Employees", icon: Users, roles: ["manager"] },
      {
        to: "/attendance-history",
        label: "Attendance Management",
        icon: CalendarDays,
        roles: ["manager"],
      },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/analytics", label: "Analytics", icon: BarChart2, roles: ["manager"] },
      { to: "/announcements", label: "Announcements", icon: Megaphone, roles: ["manager"] },
      { to: "/outlets", label: "Outlets", icon: Building2, roles: ["manager"] },
      { to: "/payroll", label: "Payroll", icon: Wallet },
      { to: "/reports", label: "Reports", icon: BarChart3, roles: ["manager"] },
      { to: "/settings", label: "Settings", icon: Settings, roles: ["manager"] },
    ],
  },
];

export function AppSidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
      <SidebarContent />
    </aside>
  );
}

export function MobileSidebar() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open sidebar</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-72 border-r bg-sidebar p-0 text-sidebar-foreground sm:max-w-xs"
      >
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SidebarContent mobile />
      </SheetContent>
    </Sheet>
  );
}

function SidebarContent({ mobile = false }: { mobile?: boolean }) {
  const { user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const role = user?.role ?? "manager";

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 border-b border-[#141E2E] px-4">
        <img src="/cleans-logo.png" alt="Cleans" className="h-8 w-auto object-contain" />
        <div className="text-lg font-bold tracking-tight text-white">Cleans</div>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        {NAV.map((group) => {
          const items = group.items.filter((it) => !it.roles || it.roles.includes(role as "manager"));
          if (items.length === 0) return null;
          return (
            <div key={group.label} className="mb-5">
              <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                {group.label}
              </div>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const active = pathname === item.to;
                  const Icon = item.icon;
                  return (
                    <li key={item.to}>
                      {mobile ? (
                        <SheetClose asChild>
                          <Link to={item.to} className={navClass(active)}>
                            <Icon className="h-4 w-4 opacity-80" />
                            <span className="truncate">{item.label}</span>
                          </Link>
                        </SheetClose>
                      ) : (
                        <Link to={item.to} className={navClass(active)}>
                          <Icon className="h-4 w-4 opacity-80" />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
      <div className="border-t p-3">
        <div className="flex items-center gap-2 rounded-md p-2 hover:bg-sidebar-accent/60">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-semibold">
            {user?.initials ?? "?"}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{user?.name ?? "Guest"}</div>
            <div className="truncate text-xs text-muted-foreground capitalize">{role}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function navClass(active: boolean) {
  return cn(
    "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
    active
      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
  );
}
