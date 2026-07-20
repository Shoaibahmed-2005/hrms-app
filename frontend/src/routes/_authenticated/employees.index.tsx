import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Search, Plus, ChevronRight, ScanFace, Users } from "lucide-react";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/employees/")({
  component: EmployeesPage,
});

function EmployeesPage() {
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: () => apiFetch("/employees"),
  });

  const filtered = (data ?? []).filter((e: any) =>
    !q || [e.name, e.employeeCode, e.designation, e.department].some((v: string) =>
      v?.toLowerCase().includes(q.toLowerCase())
    )
  );

  const active = (data ?? []).filter((e: any) => e.status === "ACTIVE").length;
  const withFace = (data ?? []).filter((e: any) => (e._count?.faceEmbeddings ?? 0) > 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight">Employees</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {active} active · {withFace} with face registered
          </p>
        </div>
        <Link to="/employees/new" className={buttonVariants()}>
          <Plus className="mr-1.5 h-4 w-4" /> Register Employee
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Total</span>
            </div>
            <p className="mt-1 text-2xl font-serif font-semibold">{(data ?? []).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-green-600" />
              <span className="text-xs text-muted-foreground">Active</span>
            </div>
            <p className="mt-1 text-2xl font-serif font-semibold text-green-600">{active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ScanFace className="h-4 w-4 text-blue-600" />
              <span className="text-xs text-muted-foreground">Face Registered</span>
            </div>
            <p className="mt-1 text-2xl font-serif font-semibold text-blue-600">{withFace}</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="border-b pb-4">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, code, dept…"
              value={q}
              onChange={e => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="space-y-2 p-6">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-14 text-center text-sm text-muted-foreground">
              {q ? "No employees match your search." : (
                <div className="space-y-3">
                  <p>No employees yet.</p>
                  <Link to="/employees/new" className={buttonVariants({ size: "sm" })}>
                    <Plus className="mr-1.5 h-4 w-4" /> Register your first employee
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="hidden sm:table-cell">Department</TableHead>
                  <TableHead className="hidden md:table-cell">Payment</TableHead>
                  <TableHead className="hidden sm:table-cell">Face</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e: any) => (
                  <TableRow
                    key={e.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => window.location.href = `/employees/${e.id}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {e.photoUrl ? (
                          <img src={e.photoUrl} alt={e.name} className="h-9 w-9 shrink-0 rounded-full object-cover shadow-sm border border-border" />
                        ) : (
                          <div className="h-9 w-9 shrink-0 rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground border border-border">
                            {e.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-sm">{e.name}</div>
                          <div className="text-xs text-muted-foreground">{e.employeeCode} · <span className="sm:hidden">{e.department}</span><span className="hidden sm:inline">{e.designation || e.department}</span></div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">{e.department}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline" className="text-[10px]">{e.paymentType}</Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {(e._count?.faceEmbeddings ?? 0) > 0
                        ? <span className="text-xs text-green-600 font-medium flex items-center gap-1"><ScanFace className="h-3.5 w-3.5" /> Ready</span>
                        : <span className="text-xs text-amber-600 flex items-center gap-1"><ScanFace className="h-3.5 w-3.5" /> Not set</span>}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={e.status === "ACTIVE" ? "outline" : "secondary"}
                        className={e.status === "ACTIVE" ? "border-green-500 text-green-700 text-[10px]" : "text-[10px]"}
                      >
                        {e.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
