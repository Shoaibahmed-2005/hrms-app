import { Search } from "lucide-react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth-context";
import { MobileSidebar } from "@/components/app-sidebar";

export function AppTopbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  
  const isDashboard = location.pathname === "/_app" || location.pathname === "/_app/dashboard";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md md:px-6">
      <MobileSidebar />
      {isDashboard ? (
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search employees, attendance, payroll..." className="h-9 pl-8" />
        </div>
      ) : (
        <div className="flex-1" />
      )}
      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="ml-1 h-9 gap-2 pl-1.5 pr-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-semibold">
                {user?.initials ?? "?"}
              </span>
              <span className="hidden text-sm sm:inline">
                {user?.name?.split(" ")[0] ?? "Guest"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              {user?.name}
              <div className="text-[10px] font-normal text-muted-foreground capitalize">
                {user?.role}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate({ to: "/dashboard" })}>
              Dashboard
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                await signOut();
                navigate({ to: "/" });
              }}
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
