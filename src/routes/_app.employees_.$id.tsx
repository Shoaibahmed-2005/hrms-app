import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Mail, Phone } from "lucide-react";
import {
  fetchEmployeeAttendance,
  fetchEmployeeById,
  initials,
  type DbEmployee,
} from "@/lib/hrms-db";

export const Route = createFileRoute("/_app/employees_/$id")({
  head: ({ params }) => ({ meta: [{ title: `Employee ${params.id} - Cleans HRMS` }] }),
  loader: async ({ params }) => {
    const employee = await fetchEmployeeById(params.id);
    if (!employee) throw notFound();
    const attendance = await fetchEmployeeAttendance(employee.id, employee.userId);
    return { employee, attendance };
  },
  notFoundComponent: () => (
    <div className="p-8 text-sm text-muted-foreground">
      Employee not found.{" "}
      <Link to="/employees" className="text-primary hover:underline">
        Back to list
      </Link>
    </div>
  ),
  errorComponent: () => (
    <div className="p-8 text-sm text-destructive">Something went wrong loading this profile.</div>
  ),
  component: EmployeeProfile,
});

function EmployeeProfile() {
  const data = Route.useLoaderData();
  if (!data) return null;
  const { employee, attendance } = data as { employee: any, attendance: any };
  return (
    <div>
      <Link
        to="/employees"
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All employees
      </Link>
      <PageHeader
        title={employee.name}
        description={`${employee.role} - ${employee.department}`}
        actions={
          <Button size="sm" asChild>
            <Link to="/employees" search={{ edit: employee.id }}>
              Edit profile
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <EmployeeCard employee={employee} />

        <div className="lg:col-span-2 rounded-2xl border border-slate-100 dark:border-[#1B3A5C] bg-card p-5 shadow-xl shadow-slate-200/50 dark:shadow-none">
          <div className="mb-4 text-sm font-semibold">Recent attendance</div>
          <div className="divide-y">
            {attendance.length ? (
              attendance.map((row: any) => (
                <div key={row.id} className="grid grid-cols-5 items-center py-2.5 text-sm">
                  <div className="col-span-2 tabular-nums text-muted-foreground">{row.date}</div>
                  <div className="tabular-nums">{row.checkIn}</div>
                  <div className="tabular-nums">{row.checkOut}</div>
                  <div className="text-right">
                    <StatusBadge status={row.status} />
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed bg-background p-8 text-center text-sm text-muted-foreground">
                No attendance records found for this employee.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmployeeCard({ employee }: { employee: DbEmployee }) {
  return (
    <div className="rounded-2xl border border-slate-100 dark:border-[#1B3A5C] bg-card p-5 shadow-xl shadow-slate-200/50 dark:shadow-none">
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 overflow-hidden items-center justify-center rounded-full bg-accent text-base font-semibold">
          {employee.profileImage 
            ? <img src={employee.profileImage} alt={employee.name} className="h-full w-full object-cover" />
            : initials(employee.name)
          }
        </div>
        <div>
          <div className="text-sm font-semibold">{employee.name}</div>
          <div className="text-xs text-muted-foreground">{employee.empCode}</div>
          <Badge variant={employee.status === "Active" ? "secondary" : "outline"} className="mt-1">
            {employee.status}
          </Badge>
        </div>
      </div>
      <div className="mt-5 space-y-2 text-sm">
        <Row icon={Mail} label={employee.email || "No email"} />
        <Row icon={Phone} label={employee.phone || "-"} />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <Info label="Joined" value={employee.joinDate} />
        <Info label="Manager" value={employee.manager || "-"} />
        <Info label="Department" value={employee.department} />
        <Info
          label={employee.payType === "hourly" ? "Hourly rate" : "Monthly salary"}
          value={`Rs ${employee.salary.toLocaleString("en-IN")}`}
        />
        <Info label="Pay type" value={employee.payType === "hourly" ? "Hourly" : "Monthly"} />
        <Info label="Fixed bonus" value={`Rs ${employee.fixedBonus.toLocaleString("en-IN")}`} />
      </div>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon className="h-3.5 w-3.5" />
      <span className="text-foreground">{label}</span>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-medium">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Present:
      "border-[oklch(var(--success))]/30 bg-[oklch(var(--success))]/15 text-[oklch(var(--success))]",
    Late: "border-[oklch(var(--warning))]/30 bg-[oklch(var(--warning))]/15 text-[oklch(var(--warning))]",
    Leave: "border-primary/25 bg-primary/10 text-primary",
    Weekend: "border-border bg-muted text-muted-foreground",
    Absent: "border-destructive/30 bg-destructive/10 text-destructive",
  };
  return (
    <span
      className={`inline-flex h-5 items-center rounded-md border px-1.5 text-[10px] font-medium ${map[status] ?? "border-border bg-muted text-muted-foreground"}`}
    >
      {status}
    </span>
  );
}
