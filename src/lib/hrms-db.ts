import { isSupabaseConfigured, supabase } from "./supabase";


export type IncentiveRow = {
  id: string;
  employee_id: string;
  type: string;
  reason: string;
  amount: number;
  month: string;
  created_by: string;
  created_at?: string;
};

export type Announcement = {
  id: string;
  title: string;
  body: string;
  active: boolean;
  createdAt: string;
  createdBy: string;
};

export type AnnouncementRow = {
  id: string;
  title: string;
  body: string | null;
  active: boolean;
  created_at: string;
  created_by: string;
};

export type DbEmployee = {
  id: string;
  empCode: string;
  name: string;
  email: string;
  role: string;
  department: string;
  phone: string;
  payType: "monthly" | "hourly";
  salary: number;
  monthlySalary: number;
  hourlyRate: number;
  fixedBonus: number;
  manager: string;
  initialLogin: string;
  status: "Active" | "On Leave" | "Inactive" | string;
  joinDate: string;
  userId: string | null;
  profileImage: string | null;
};

export type Department = {
  id: string;
  name: string;
  active: boolean;
};

export type Designation = {
  id: string;
  name: string;
  absentDayDeduction: number;
  active: boolean;
  department: string;
};

export type FaceRegistryEntry = {
  employeeId: string;
  empCode: string;
  name: string;
  designation: string;
  department: string;
  descriptor: number[];
  updatedAt: string;
};

export type DashboardData = {
  configured: boolean;
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  onLeaveToday: number;
  payrollTotal: number;
  attendanceTrend: Array<{ day: string; present: number; absent: number }>;
  recentActivities: Array<{ id: string; who: string; what: string; when: string; tag: string }>;
};

type EmployeeRow = {
  id: string;
  emp_code: string;
  full_name: string;
  email: string | null;
  role: string;
  department: string;
  phone: string | null;
  pay_type?: "monthly" | "hourly" | null;
  salary: number | string | null;
  monthly_salary?: number | string | null;
  hourly_rate?: number | string | null;
  fixed_bonus?: number | string | null;
  manager: string | null;
  initial_login: string | null;
  status: string;
  join_date: string;
  user_id: string | null;
  profile_image?: string | null;
};

type DepartmentRow = {
  id: string;
  name: string;
  active: boolean;
};

type AttendanceRow = {
  id: string;
  user_id?: string | null;
  employee_id?: string | null;
  outlet_id?: string | null;
  date: string;
  status: string;
  check_in?: string | null;
  check_out?: string | null;
  face_verified?: boolean | null;
  face_confidence?: number | string | null;
  hours_worked?: number | string | null;
  created_at?: string;
};

type DesignationDeductionRow = {
  id: string;
  designation: string;
  absent_day_deduction: number | string;
};

type DesignationRow = {
  id: string;
  name: string;
  absent_day_deduction: number | string;
  active: boolean;
  department: string;
};

export type CompanySettings = {
  faceThreshold: number;
  shiftStart: string;
  shiftEnd: string;
  overtimeMultiplier: number;
  attendanceCooldownMinutes: number;
  halfDayThreshold?: number;
  fullDayHours?: number;
  graceMinutes?: number;
  perfectAttendanceReward?: number;
  otAutomated?: boolean;
  leaveDays?: string[];
  automatedIncentivesEnabled?: boolean;
};

export type DesignationDeduction = {
  id: string;
  designation: string;
  absentDayDeduction: number;
};

export type AttendanceEntry = {
  id: string;
  userId: string | null;
  employeeIdRaw: string | null;
  employee?: string;
  employeeId?: string;
  department?: string;
  date: string;
  checkIn: string;
  checkOut: string;
  checkInRaw: string;
  checkOutRaw: string;
  hours: number;
  status: string;
  confidence: number;
  outletId?: string | null;
  outletName?: string | null;
};

export type FaceResetRequest = {
  id: string;
  userId: string;
  employee: string;
  employeeId: string;
  reason: string;
  status: string;
  requestedAt: string;
  managerNote: string;
};

export type DailyAttendance = {
  id: string;
  employeeIdRaw: string | null;
  employee?: string;
  employeeId?: string;
  department?: string;
  date: string;
  firstIn: string;
  lastOut: string;
  sessions: AttendanceEntry[];
  totalHours: number;
  status: string;
  confidence: number;
};

export type ManagerAttendanceData = {
  configured: boolean;
  rows: DailyAttendance[];
  resetRequests: FaceResetRequest[];
  settings: CompanySettings;
};

export type SalaryReportRow = {
  employeeId: string;
  empCode: string;
  name: string;
  designation: string;
  department: string;
  payType: "monthly" | "hourly";
  period: string;
  startDate: string;
  endDate: string;
  expectedDays: number;
  workedDays: number;
  absentDays: number;
  regularHours: number;
  overtimeHours: number;
  base: number;
  overtime: number;
  bonus: number;
  deductions: number;
  net: number;
  status: string;
  incentives?: number;
  profileImage?: string | null;
  globalRegularHours?: number;
  globalOvertimeHours?: number;
  globalBase?: number;
  globalOvertime?: number;
  globalNet?: number;
};

export type CompanyReportData = {
  configured: boolean;
  startDate: string;
  endDate: string;
  employeeCount: number;
  attendanceRows: DailyAttendance[];
  payrollRows: SalaryReportRow[];
  totals: {
    present: number;
    absent: number;
    hours: number;
    overtime: number;
    bonuses: number;
    incentives: number;
    deductions: number;
    net: number;
  };
};

export type WorkforceInsight = {
  id: string;
  title: string;
  summary: string;
  severity: "Low" | "Medium" | "High";
  metric: string;
  recommendation: string;
};

export type AIInsightsData = {
  configured: boolean;
  startDate: string;
  endDate: string;
  riskScore: number;
  predictedAttendanceRate: number;
  predictedOvertimeHours: number;
  predictedAbsences: number;
  insights: WorkforceInsight[];
  trend: Array<{
    day: string;
    attendanceRate: number;
    late: number;
    overtime: number;
    absent: number;
  }>;
};

export function isDbReady() {
  return Boolean(isSupabaseConfigured && supabase);
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function mapEmployee(row: EmployeeRow): DbEmployee {
  return {
    id: row.id,
    empCode: row.emp_code,
    name: row.full_name,
    email: row.email ?? "",
    role: row.role,
    department: row.department,
    phone: row.phone ?? "",
    payType: row.pay_type === "hourly" ? "hourly" : "monthly",
    salary: Number(row.salary ?? 0),
    monthlySalary: Number(row.monthly_salary ?? row.salary ?? 0),
    hourlyRate: Number(row.hourly_rate ?? 0),
    fixedBonus: Number(row.fixed_bonus ?? 0),
    manager: row.manager ?? "",
    initialLogin: row.initial_login ?? "",
    status: row.status,
    joinDate: row.join_date,
    userId: row.user_id,
    profileImage: row.profile_image ?? null,
  };
}

function mapDepartment(row: DepartmentRow): Department {
  return {
    id: row.id,
    name: row.name,
    active: row.active,
  };
}

function mapDesignation(row: DesignationRow): Designation {
  return {
    id: row.id,
    name: row.name,
    absentDayDeduction: Number(row.absent_day_deduction ?? 0),
    active: row.active,
    department: row.department ?? "",
  };
}

function dateKey(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return localDateKey(d);
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dayLabel(iso: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(new Date(`${iso}T00:00:00`));
}

function relativeWhen(value?: string) {
  if (!value) return "recently";
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return value;
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function formatClock(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function hoursBetween(start: string, end: string) {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) return 0;
  return Math.round(((endMs - startMs) / 3_600_000) * 100) / 100;
}

function secondsBetween(start: string, end: string) {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.round((endMs - startMs) / 1000));
}

function attendanceHours(row: AttendanceRow) {
  if (row.check_in && row.check_out) return hoursBetween(row.check_in, row.check_out);
  return Number(row.hours_worked ?? 0);
}

function mapAttendance(
  row: AttendanceRow,
  employeeByUser?: Map<string | null, DbEmployee>,
  employeeById?: Map<string | null, DbEmployee>,
  outletNameById?: Map<string, string>,
): AttendanceEntry {
  const employee =
    employeeById?.get(row.employee_id ?? null) ?? employeeByUser?.get(row.user_id ?? null);
  const outletId = row.outlet_id ?? null;
  return {
    id: row.id,
    userId: row.user_id ?? null,
    employeeIdRaw: row.employee_id ?? null,
    employee: employee?.name,
    employeeId: employee?.empCode,
    department: employee?.department,
    date: row.date,
    checkIn: formatClock(row.check_in),
    checkOut: formatClock(row.check_out),
    checkInRaw: row.check_in ?? "",
    checkOutRaw: row.check_out ?? "",
    hours: attendanceHours(row),
    status: row.status,
    confidence: Number(row.face_confidence ?? 0),
    outletId,
    outletName: outletId && outletNameById ? (outletNameById.get(outletId) ?? null) : null,
  };
}

function currentWeekStart() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return localDateKey(d);
}

function currentMonthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-01`;
}

function calculateStreak(rows: AttendanceRow[]) {
  const presentDates = new Set(
    rows.filter((row) => ["Present", "Late"].includes(row.status)).map((row) => row.date),
  );
  const cursor = new Date();
  if (!presentDates.has(localDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  for (let i = 0; i < 120; i += 1) {
    const key = localDateKey(cursor);
    if (!presentDates.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function timeToMinutes(value: string) {
  const [h = "0", m = "0"] = value.split(":");
  return Number(h) * 60 + Number(m);
}

function attendanceStatusFor(checkInIso: string, settings: CompanySettings) {
  const checkIn = new Date(checkInIso);
  const minutes = checkIn.getHours() * 60 + checkIn.getMinutes();
  const shiftStartMinutes = timeToMinutes(settings.shiftStart);
  // Late comers: add grace time. 9 to 9.30, 8 to 8.30.
  return minutes > (shiftStartMinutes + 30) ? "Late" : "Present";
}

function employeeSelect(extra = "") {
  return [
    "id",
    "emp_code",
    "full_name",
    "email",
    "role",
    "department",
    "phone",
    "pay_type",
    "salary",
    "monthly_salary",
    "hourly_rate",
    "fixed_bonus",
    "manager",
    "initial_login",
    "status",
    "join_date",
    "user_id",
    "profile_image",
    extra,
  ]
    .filter(Boolean)
    .join(", ");
}

function attendanceSelect(extra = "") {
  return [
    "id",
    "employee_id",
    "outlet_id",
    "date",
    "check_in",
    "check_out",
    "hours_worked",
    "status",
    "face_confidence",
    extra,
  ]
    .filter(Boolean)
    .join(", ");
}

function eachDate(startDate: string, endDate: string) {
  const dates: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  while (!Number.isNaN(cursor.getTime()) && cursor <= end) {
    dates.push(localDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function isWorkday(iso: string) {
  const day = new Date(`${iso}T00:00:00`).getDay();
  return day !== 0;
}

function shiftHours(settings: CompanySettings) {
  return Math.max(
    1,
    Math.round(
      ((timeToMinutes(settings.shiftEnd) - timeToMinutes(settings.shiftStart)) / 60) * 100,
    ) / 100,
  );
}

function rangeLabel(startDate: string, endDate: string) {
  return startDate === endDate ? startDate : `${startDate} to ${endDate}`;
}

function calculatePayrollRows(
  employees: DbEmployee[],
  attendance: AttendanceRow[],
  settings: CompanySettings,
  startDate: string,
  endDate: string,
  deductions: DesignationDeduction[] = [],
  holidays: Set<string> = new Set(),
  manualIncentives: IncentiveRow[] = [],
  outletId?: string,
): SalaryReportRow[] {
  const workDates = eachDate(startDate, endDate).filter(isWorkday);
  const expectedDays = workDates.length;
  const payableHoursPerDay = 10; // Rule: 11 hours standard, 10 hours billable (1 hr lunch)
  const expectedHours = expectedDays * payableHoursPerDay;
  const standardMonthDays = 30; // Rule: Salary is allocated strictly across a 30-day month

  const attendanceByEmployee = new Map<string, AttendanceRow[]>();
  const deductionByDesignation = new Map(
    deductions.map((deduction) => [
      deduction.designation.trim().toLowerCase(),
      deduction.absentDayDeduction,
    ]),
  );

  attendance.forEach((row) => {
    if (!row.employee_id) return;
    const list = attendanceByEmployee.get(row.employee_id) ?? [];
    list.push(row);
    attendanceByEmployee.set(row.employee_id, list);
  });

  return employees
    .filter((employee) => employee.status !== "Inactive")
    .map((employee) => {
      const allRows = attendanceByEmployee.get(employee.id) ?? [];
      const localRows = outletId ? allRows.filter(r => r.outlet_id === outletId) : allRows;

      function calcMetrics(targetRows: AttendanceRow[]) {
        const hoursByDate = new Map<string, number>();
        targetRows.forEach((row) => {
          const h = attendanceHours(row);
          if (h <= 0) return;
          const prev = hoursByDate.get(row.date) ?? 0;
          hoursByDate.set(row.date, prev + h);
        });

        const halfDay = 5; 
        let workedDays = 0;
        let totalPayableHours = 0;

        hoursByDate.forEach((rawHours) => {
          const dailyPayable = Math.min(rawHours, payableHoursPerDay);
          if (rawHours >= halfDay) workedDays++;
          totalPayableHours += dailyPayable;
        });

        holidays.forEach(hDate => {
          if (hDate >= startDate && hDate <= endDate && isWorkday(hDate)) {
            const logged = hoursByDate.get(hDate) || 0;
            if (logged < halfDay) {
               workedDays++;
               totalPayableHours += Math.max(0, payableHoursPerDay - logged);
            }
          }
        });

        totalPayableHours = Math.round(totalPayableHours * 100) / 100;
        const absentDays = Math.max(0, expectedDays - workedDays);
        const regularHours = Math.min(totalPayableHours, expectedHours);
        const overtimeHours = Math.max(0, Math.round((totalPayableHours - expectedHours) * 100) / 100);
        
        const bonus = overtimeHours > 0 ? employee.fixedBonus : 0;
        const hourlyRate = employee.payType === "hourly"
            ? employee.hourlyRate
            : (employee.monthlySalary / standardMonthDays) / payableHoursPerDay;

        const expectedBase = employee.payType === "hourly" 
            ? expectedHours * hourlyRate 
            : (employee.monthlySalary / standardMonthDays) * expectedDays;

        const missingHours = Math.max(0, expectedHours - regularHours);
        const designationRule = deductions.find(d => d.designation === employee.role);
        const customDeductionRate = designationRule ? designationRule.absentDayDeduction : 0;
        // customDeductionRate is a daily penalty, so we divide by payableHoursPerDay for the hourly equivalent
        const customHourlyDeductionRate = customDeductionRate > 0 ? customDeductionRate / payableHoursPerDay : 0;
        const deductionRate = customHourlyDeductionRate > 0 ? customHourlyDeductionRate : hourlyRate;
        const hourlyDeduction = missingHours * deductionRate;

        let automatedIncentive = 0;
        const rewardAmount = settings.perfectAttendanceReward ?? 0;
        if (settings.automatedIncentivesEnabled && rewardAmount > 0 && workedDays >= expectedDays) {
            automatedIncentive = rewardAmount;
        }

        const employeeManualIncentives = manualIncentives
          .filter(i => i.employee_id === employee.id)
          .reduce((sum, i) => sum + Number(i.amount || 0), 0);
        const totalIncentives = automatedIncentive + employeeManualIncentives;

        const overtime = overtimeHours * hourlyRate * settings.overtimeMultiplier;
        
        // Penalties/deductions for absence should only eat into the base pay.
        // Overtime, bonuses, and manual incentives are guaranteed additions.
        const earnedBase = Math.max(0, expectedBase - hourlyDeduction);
        const net = earnedBase + overtime + bonus + totalIncentives;

        return {
          workedDays, absentDays, regularHours, overtimeHours,
          base: Math.round(expectedBase),
          overtime: Math.round(overtime),
          bonus: Math.round(bonus),
          incentives: Math.round(totalIncentives),
          deductions: Math.round(hourlyDeduction),
          net: Math.round(net)
        };
      }

      const globalMetrics = calcMetrics(allRows);
      const localMetrics = calcMetrics(localRows);

      return {
        employeeId: employee.id,
        empCode: employee.empCode,
        name: employee.name,
        designation: employee.role,
        department: employee.department,
        payType: employee.payType,
        period: rangeLabel(startDate, endDate),
        startDate,
        endDate,
        expectedDays,
        profileImage: employee.profileImage ?? null,
        
        workedDays: localMetrics.workedDays,
        absentDays: localMetrics.absentDays,
        regularHours: localMetrics.regularHours,
        overtimeHours: localMetrics.overtimeHours,
        base: localMetrics.base,
        overtime: localMetrics.overtime,
        bonus: localMetrics.bonus,
        incentives: localMetrics.incentives,
        deductions: localMetrics.deductions,
        net: localMetrics.net,
        status: allRows.some((row) => !row.check_out) ? "Ongoing" : "Calculated",

        globalRegularHours: globalMetrics.regularHours,
        globalOvertimeHours: globalMetrics.overtimeHours,
        globalBase: globalMetrics.base,
        globalOvertime: globalMetrics.overtime,
        globalNet: globalMetrics.net,
      };
    });
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function linearForecast(values: number[]) {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];
  const n = values.length;
  const xAvg = (n - 1) / 2;
  const yAvg = average(values);
  let numerator = 0;
  let denominator = 0;
  values.forEach((value, index) => {
    numerator += (index - xAvg) * (value - yAvg);
    denominator += (index - xAvg) ** 2;
  });
  const slope = denominator ? numerator / denominator : 0;
  return values[n - 1] + slope;
}

function severity(score: number): WorkforceInsight["severity"] {
  if (score >= 70) return "High";
  if (score >= 35) return "Medium";
  return "Low";
}

export async function fetchEmployees() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("employees")
    .select(employeeSelect())
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as unknown as unknown as EmployeeRow[]).map(mapEmployee);
}

export async function fetchEmployeeById(id: string) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("employees")
    .select(employeeSelect())
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? mapEmployee(data as unknown as EmployeeRow) : null;
}

export async function fetchEmployeeAttendance(employeeId: string, userId?: string | null) {
  if (!supabase || !employeeId) return [];
  let query = supabase
    .from("attendance_sessions")
    .select(attendanceSelect())
    .order("date", { ascending: false })
    .limit(14);

  query = userId
    ? query.or(`employee_id.eq.${employeeId},user_id.eq.${userId}`)
    : query.eq("employee_id", employeeId);

  const { data, error } = await query;

  if (error) throw error;
  return (
    (data ?? []) as unknown as Array<{
      id: string;
      date: string;
      check_in: string | null;
      check_out: string | null;
      hours_worked: number | string | null;
      status: string;
      face_confidence?: number | string | null;
    }>
  ).map((row) => ({
    id: row.id,
    date: row.date,
    checkIn: row.check_in
      ? new Date(row.check_in).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "-",
    checkOut: row.check_out
      ? new Date(row.check_out).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "-",
    hours: Number(row.hours_worked ?? 0),
    status: row.status,
    confidence: Number(row.face_confidence ?? 0),
  }));
}

export async function createEmployee(payload: {
  name: string;
  email?: string;
  role: string;
  department: string;
  payType: "monthly" | "hourly";
  salary: number;
  fixedBonus: number;
  phone: string;
  manager: string;
}) {
  if (!supabase) throw new Error("Supabase is not configured");
  const empCode = `EMP-${Date.now().toString().slice(-6)}`;
  const email = payload.email?.trim() || null;
  const { data, error } = await supabase
    .from("employees")
    .insert({
      emp_code: empCode,
      full_name: payload.name,
      email,
      role: payload.role,
      department: payload.department,
      phone: payload.phone,
      pay_type: payload.payType,
      salary: payload.salary,
      monthly_salary: payload.payType === "monthly" ? payload.salary : 0,
      hourly_rate: payload.payType === "hourly" ? payload.salary : 0,
      fixed_bonus: payload.fixedBonus,
      manager: payload.manager,
      initial_login: null,
      status: "Active",
    })
    .select(employeeSelect())
    .single();

  if (error) throw error;
  return mapEmployee(data as unknown as EmployeeRow);
}

export async function updateEmployee(
  id: string,
  payload: {
    name: string;
    email?: string;
    role: string;
    department: string;
    payType: "monthly" | "hourly";
    salary: number;
    fixedBonus: number;
    phone: string;
    manager: string;
    status: string;
  },
) {
  if (!supabase) throw new Error("Supabase is not configured");
  const email = payload.email?.trim() || null;
  const { data, error } = await supabase
    .from("employees")
    .update({
      full_name: payload.name,
      email,
      role: payload.role,
      department: payload.department,
      phone: payload.phone,
      pay_type: payload.payType,
      salary: payload.salary,
      monthly_salary: payload.payType === "monthly" ? payload.salary : 0,
      hourly_rate: payload.payType === "hourly" ? payload.salary : 0,
      fixed_bonus: payload.fixedBonus,
      manager: payload.manager,
      status: payload.status,
    })
    .eq("id", id)
    .select(employeeSelect())
    .single();

  if (error) throw error;
  return mapEmployee(data as unknown as EmployeeRow);
}

export async function fetchDepartments() {
  if (!supabase) return [] as Department[];
  const { data, error } = await supabase
    .from("departments")
    .select("id, name, active")
    .eq("active", true)
    .order("name", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as DepartmentRow[]).map(mapDepartment);
}

export async function saveDepartment(name: string) {
  if (!supabase) throw new Error("Supabase is not configured");
  const cleanName = name.trim();
  if (!cleanName) throw new Error("Department name is required");

  const { data, error } = await supabase
    .from("departments")
    .upsert(
      {
        name: cleanName,
        active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "name" },
    )
    .select("id, name, active")
    .single();

  if (error) throw error;
  return mapDepartment(data as DepartmentRow);
}

export async function updateDepartment(id: string, name: string) {
  if (!supabase) throw new Error("Supabase is not configured");
  const cleanName = name.trim();
  if (!cleanName) throw new Error("Department name is required");

  const { data, error } = await supabase
    .from("departments")
    .update({ name: cleanName, active: true, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, name, active")
    .single();

  if (error) throw error;
  return mapDepartment(data as DepartmentRow);
}

export async function deleteDepartment(id: string) {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase
    .from("departments")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteEmployee(id: string) {
  if (!supabase) throw new Error("Supabase is not configured");
  
  // Explicitly delete related records to prevent orphans if ON DELETE CASCADE is missing
  await supabase.from("face_descriptors").delete().eq("employee_id", id);
  await supabase.from("attendance_sessions").delete().eq("employee_id", id);
  
  const { error } = await supabase.from("employees").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchDashboardData(outletId?: string): Promise<DashboardData> {
  if (!supabase) {
    return {
      configured: false,
      totalEmployees: 0,
      presentToday: 0,
      absentToday: 0,
      onLeaveToday: 0,
      payrollTotal: 0,
      attendanceTrend: [],
      recentActivities: [],
    };
  }

  const today = dateKey();
  const weekStart = dateKey(-6);
  const monthStart = currentMonthStart();
  const [settings, deductionRules] = await Promise.all([
    fetchCompanySettings(),
    fetchDesignationDeductions(),
  ]);
  const [employeesRes, attendanceRes] = await Promise.all([
    supabase
      .from("employees")
      .select(employeeSelect("created_at"))
      .order("created_at", { ascending: false }),
    outletId 
      ? supabase
          .from("attendance_sessions")
          .select(attendanceSelect())
          .gte("date", monthStart)
          .lte("date", today)
          .eq("outlet_id", outletId)
      : supabase
          .from("attendance_sessions")
          .select(attendanceSelect())
          .gte("date", monthStart)
          .lte("date", today),
  ]);

  const error = employeesRes.error ?? attendanceRes.error;
  if (error) throw error;

  const employees = ((employeesRes.data ?? []) as unknown as unknown as EmployeeRow[]).map(mapEmployee);
  const attendance = (attendanceRes.data ?? []) as unknown as unknown as AttendanceRow[];
  const activeEmployees = employees.filter((e) => e.status !== "Inactive");
  const employeeById = new Map(employees.map((e) => [e.id, e]));

  const todayAttendance = attendance.filter((row) => row.date === today);
  const presentToday = new Set(
    todayAttendance
      .filter((row) => ["Present", "Late", "Completed", "Active", "Half Day"].includes(row.status))
      .map((row) => row.employee_id)
  ).size;
  const absentToday = Math.max(0, activeEmployees.length - presentToday);

  const attendanceTrend = Array.from({ length: 7 }).map((_, index) => {
    const iso = dateKey(index - 6);
    const dayAttendance = attendance.filter((row) => row.date === iso);
    const present = new Set(
      dayAttendance
        .filter((row) => ["Present", "Late", "Completed", "Active", "Half Day"].includes(row.status))
        .map((row) => row.employee_id)
    ).size;
    return {
      day: dayLabel(iso),
      present,
      absent: Math.max(0, activeEmployees.length - present),
    };
  });

  const holidays = await fetchHolidays(monthStart, today);

  const payrollRows = calculatePayrollRows(
    activeEmployees,
    attendance,
    settings,
    monthStart,
    today,
    deductionRules,
    holidays,
    [],
    outletId
  );

  const recentActivities = [
    ...todayAttendance.slice(0, 4).map((row) => ({
      id: `attendance-${row.id}`,
      who: employeeById.get(row.employee_id ?? "")?.name ?? "Employee",
      what: `marked ${row.status.toLowerCase()}`,
      when: row.check_in ? relativeWhen(row.check_in) : row.date,
      tag: "Attendance",
    })),
    ...employees.slice(0, 2).map((employee) => ({
      id: `employee-${employee.id}`,
      who: employee.name,
      what: "is in the directory",
      when: employee.joinDate,
      tag: "Employee",
    })),
  ].slice(0, 6);

  return {
    configured: true,
    totalEmployees: employees.length,
    presentToday,
    absentToday,
    onLeaveToday: 0,
    payrollTotal: payrollRows.reduce((sum, row) => sum + row.net, 0),
    attendanceTrend,
    recentActivities,
  };
}

export async function fetchCompanySettings(): Promise<CompanySettings> {
  if (!supabase) {
    return {
      faceThreshold: 80,
      shiftStart: "09:30",
      shiftEnd: "18:30",
      overtimeMultiplier: 1.5,
      attendanceCooldownMinutes: 1,
      halfDayThreshold: 4,
      fullDayHours: 8,
      graceMinutes: 10,
      leaveDays: ["Sunday"],
      otAutomated: false,
      perfectAttendanceReward: 0,
      automatedIncentivesEnabled: false,
    };
  }

  const { data, error } = await supabase
    .from("company_settings")
    .select("*")
    .eq("id", true)
    .maybeSingle();

  if (error) throw error;
  const legacyCooldownSeconds = Number(data?.attendance_cooldown_seconds ?? 60);
  return {
    faceThreshold: Number(data?.face_threshold ?? 80),
    shiftStart: String(data?.shift_start ?? "09:30").slice(0, 5),
    shiftEnd: String(data?.shift_end ?? "18:30").slice(0, 5),
    overtimeMultiplier: Number(data?.overtime_multiplier ?? 1.5),
    attendanceCooldownMinutes: Number(
      data?.attendance_cooldown_minutes ?? Math.max(1, Math.ceil(legacyCooldownSeconds / 60)),
    ),
    halfDayThreshold: Number(data?.half_day_threshold ?? 4),
    fullDayHours: Number(data?.full_day_hours ?? 8),
    graceMinutes: Number(data?.grace_minutes ?? 10),
    leaveDays: Array.isArray(data?.leave_days) ? data.leave_days : ["Sunday"],
    otAutomated: Boolean(data?.ot_automated ?? false),
    perfectAttendanceReward: Number(data?.perfect_attendance_reward ?? 0),
    automatedIncentivesEnabled: Boolean(data?.automated_incentives_enabled ?? false),
  };
}

export async function updateCompanySettings(payload: CompanySettings) {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.from("company_settings").upsert({
    id: true,
    face_threshold: payload.faceThreshold,
    shift_start: payload.shiftStart,
    shift_end: payload.shiftEnd,
    overtime_multiplier: payload.overtimeMultiplier,
    attendance_cooldown_minutes: payload.attendanceCooldownMinutes,
    half_day_threshold: payload.halfDayThreshold ?? 4,
    full_day_hours: payload.fullDayHours ?? 8,
    grace_minutes: payload.graceMinutes ?? 10,
    leave_days: payload.leaveDays ?? ["Sunday"],
    ot_automated: payload.otAutomated ?? false,
    perfect_attendance_reward: payload.perfectAttendanceReward ?? 0,
    automated_incentives_enabled: payload.automatedIncentivesEnabled ?? false,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function fetchDesignationDeductions() {
  if (!supabase) return [] as DesignationDeduction[];
  const { data, error } = await supabase
    .from("designations")
    .select("id, name, absent_day_deduction, active")
    .eq("active", true)
    .order("name", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as DesignationRow[]).map((row) => ({
    id: row.id,
    designation: row.name,
    absentDayDeduction: Number(row.absent_day_deduction ?? 0),
  }));
}

export async function fetchDesignations() {
  if (!supabase) return [] as Designation[];
  const { data, error } = await supabase
    .from("designations")
    .select("id, name, absent_day_deduction, active, department")
    .eq("active", true)
    .order("name", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as DesignationRow[]).map(mapDesignation);
}

export async function saveDesignationDeduction(payload: {
  designation: string;
  absentDayDeduction: number;
  department?: string;
}) {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.from("designations").upsert(
    {
      name: payload.designation.trim(),
      absent_day_deduction: payload.absentDayDeduction,
      department: payload.department ?? "",
      active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "name" },
  );
  if (error) throw error;
}

export async function updateDesignation(
  id: string,
  payload: {
    name: string;
    absentDayDeduction: number;
  },
) {
  if (!supabase) throw new Error("Supabase is not configured");
  const cleanName = payload.name.trim();
  if (!cleanName) throw new Error("Designation name is required");

  const { data, error } = await supabase
    .from("designations")
    .update({
      name: cleanName,
      absent_day_deduction: payload.absentDayDeduction,
      active: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, name, absent_day_deduction, active")
    .single();

  if (error) throw error;
  return mapDesignation(data as DesignationRow);
}

export async function deleteDesignation(id: string) {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase
    .from("designations")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function fetchFaceDescriptor(userId: string) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("face_descriptors")
    .select("descriptor, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  const descriptor = data?.descriptor;
  return Array.isArray(descriptor) ? descriptor.map(Number) : null;
}

export async function fetchEmployeeFaceDescriptor(employeeId: string) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("face_descriptors")
    .select("descriptor, updated_at")
    .eq("employee_id", employeeId)
    .maybeSingle();

  if (error) throw error;
  const descriptor = data?.descriptor;
  return Array.isArray(descriptor) ? descriptor.map(Number) : null;
}

export async function saveFaceDescriptor(userId: string, descriptor: number[]) {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.from("face_descriptors").upsert({
    user_id: userId,
    descriptor,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function saveEmployeeFaceDescriptor(employeeId: string, descriptor: number[]) {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data: employee, error: employeeError } = await supabase
    .from("employees")
    .select("user_id")
    .eq("id", employeeId)
    .single();

  if (employeeError) throw employeeError;

  const { error } = await supabase.from("face_descriptors").upsert(
    {
      employee_id: employeeId,
      user_id: employee?.user_id ?? null,
      descriptor,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "employee_id" },
  );
  if (error) throw error;
}

export async function saveEmployeeProfileImage(employeeId: string, base64Image: string) {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase
    .from("employees")
    .update({ profile_image: base64Image })
    .eq("id", employeeId);
  if (error) {
    // Silently ignore if column doesn't exist yet (column not yet added to DB)
    if (!error.message.includes("profile_image")) throw error;
    console.warn("profile_image column not yet created in DB. Add it via Supabase dashboard.");
  }
}

export async function fetchFaceRegistry() {
  if (!supabase) return [] as FaceRegistryEntry[];

  const [facesRes, employeesRes] = await Promise.all([
    supabase.from("face_descriptors").select("employee_id, descriptor, updated_at"),
    supabase.from("employees").select("id, emp_code, full_name, role, department"),
  ]);

  const error = facesRes.error ?? employeesRes.error;
  if (error) throw error;

  const employeeById = new Map(
    (
      (employeesRes.data ?? []) as unknown as Array<{
        id: string;
        emp_code: string;
        full_name: string;
        role: string;
        department: string;
      }>
    ).map((row) => [
      row.id,
      {
        empCode: row.emp_code,
        name: row.full_name,
        designation: row.role,
        department: row.department,
      },
    ]),
  );

  return (
    (facesRes.data ?? []) as unknown as Array<{
      employee_id: string | null;
      descriptor: number[];
      updated_at: string;
    }>
  )
    .filter((row) => row.employee_id && Array.isArray(row.descriptor) && row.descriptor.length > 0)
    .map((row) => {
      const employee = employeeById.get(row.employee_id!);
      return {
        employeeId: row.employee_id!,
        empCode: employee?.empCode ?? row.employee_id!.slice(0, 8),
        name: employee?.name ?? "Employee",
        designation: employee?.designation ?? "Employee",
        department: employee?.department ?? "Team",
        descriptor: row.descriptor.map(Number),
        updatedAt: row.updated_at,
      };
    });
}

export async function fetchApprovedFaceReset(userId: string) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("face_reset_requests")
    .select("id, status")
    .eq("user_id", userId)
    .eq("status", "Approved")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? { id: data.id as string } : null;
}

export async function completeFaceReset(id: string) {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase
    .from("face_reset_requests")
    .update({ status: "Completed" })
    .eq("id", id);
  if (error) throw error;
}

export async function createFaceResetRequest(userId: string, reason: string) {
  if (!supabase) throw new Error("Supabase is not configured");
  const existing = await supabase
    .from("face_reset_requests")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "Pending")
    .maybeSingle();

  if (existing.error) throw existing.error;
  if (existing.data) return false;

  const { error } = await supabase.from("face_reset_requests").insert({
    user_id: userId,
    reason,
    status: "Pending",
  });
  if (error) throw error;
  return true;
}

export async function fetchFaceResetRequests(userId?: string) {
  if (!supabase) return [] as FaceResetRequest[];

  const query = supabase
    .from("face_reset_requests")
    .select("id, user_id, reason, status, manager_note, created_at")
    .order("created_at", { ascending: false });

  if (userId) query.eq("user_id", userId);

  const [requestsRes, employeesRes] = await Promise.all([
    query,
    supabase.from("employees").select(employeeSelect()),
  ]);

  const error = requestsRes.error ?? employeesRes.error;
  if (error) throw error;

  const employeeByUser = new Map(
    ((employeesRes.data ?? []) as unknown as unknown as EmployeeRow[]).map((row) => [row.user_id, mapEmployee(row)]),
  );
  const employeeById = new Map(
    ((employeesRes.data ?? []) as unknown as unknown as EmployeeRow[]).map((row) => [row.id, mapEmployee(row)]),
  );

  return (
    (requestsRes.data ?? []) as unknown as Array<{
      id: string;
      user_id: string;
      reason: string;
      status: string;
      manager_note: string | null;
      created_at: string;
    }>
  ).map((row) => {
    const employee = employeeByUser.get(row.user_id);
    return {
      id: row.id,
      userId: row.user_id,
      employee: employee?.name ?? "Employee",
      employeeId: employee?.empCode ?? row.user_id.slice(0, 8),
      reason: row.reason,
      status: row.status,
      managerNote: row.manager_note ?? "",
      requestedAt: relativeWhen(row.created_at),
    };
  });
}

export async function decideFaceResetRequest(
  id: string,
  status: "Approved" | "Rejected",
  managerId: string,
  managerNote = "",
) {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase
    .from("face_reset_requests")
    .update({
      status,
      manager_note: managerNote,
      decided_by: managerId,
      decided_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function recordAttendanceCheckIn(payload: { userId: string; faceConfidence: number }) {
  if (!supabase) throw new Error("Supabase is not configured");
  const settings = await fetchCompanySettings();
  const now = new Date().toISOString();
  const status = attendanceStatusFor(now, settings);
  const { data: existing, error: existingError } = await supabase
    .from("attendance_sessions")
    .select("id, check_in")
    .eq("user_id", payload.userId)
    .eq("date", dateKey())
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing?.check_in) return { alreadyCheckedIn: true, status };

  const { error } = await supabase.from("attendance_sessions").upsert(
    {
      user_id: payload.userId,
      date: dateKey(),
      check_in: now,
      face_verified: true,
      face_confidence: Math.round(payload.faceConfidence),
      status,
      hours_worked: 0,
    },
    { onConflict: "user_id,date" },
  );
  if (error) throw error;
  return { alreadyCheckedIn: false, status };
}

export async function recordAttendanceCheckOut(userId: string) {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase
    .from("attendance_sessions")
    .select("id, check_in, check_out")
    .eq("user_id", userId)
    .eq("date", dateKey())
    .maybeSingle();

  if (error) throw error;
  if (!data?.check_in) throw new Error("You need to check in before checking out.");
  if (data.check_out)
    return { alreadyCheckedOut: true, hours: hoursBetween(data.check_in, data.check_out) };

  const now = new Date().toISOString();
  const hours = hoursBetween(data.check_in, now);
  const update = await supabase
    .from("attendance_sessions")
    .update({ check_out: now, hours_worked: hours })
    .eq("id", data.id);

  if (update.error) throw update.error;
  return { alreadyCheckedOut: false, hours };
}

export async function recordFaceAttendance(payload: {
  employeeId: string;
  faceConfidence: number;
  action?: "in" | "out";
  deviceSecret?: string;
  lat?: number;
  long?: number;
}) {
  if (!supabase) throw new Error("Supabase is not configured");

  if (!payload.deviceSecret) {
    return { status: "error", message: "Unregistered tablet. Click the header 5 times to register." };
  }

  const { data, error } = await supabase.rpc("mark_session_attendance", {
    _device_secret: payload.deviceSecret,
    _lat: payload.lat || 0,
    _long: payload.long || 0,
    _employee_id: payload.employeeId,
    _action: payload.action || "in"
  });

  if (error) {
    console.error("RPC Error:", error);
    return { status: "error", message: error.message };
  }

  if (data && data.success === false) {
    return { status: "error", message: data.error };
  }

  return {
    action: payload.action === "in" ? "check-in" as const : "check-out" as const,
    status: data.message,
    hours: 0,
  };
}


export async function fetchManagerAttendanceData(date: string): Promise<ManagerAttendanceData> {
  const settings = await fetchCompanySettings();
  if (!supabase) return { configured: false, rows: [], resetRequests: [], settings };

  const [employeesRes, attendanceRes, resetsRes, outletsRes] = await Promise.all([
    supabase.from("employees").select(employeeSelect()),
    supabase
      .from("attendance_sessions")
      .select(attendanceSelect())
      .eq("date", date)
      .order("check_in", { ascending: false }),
    fetchFaceResetRequests(),
    supabase.from("outlets").select("id, name"),
  ]);

  const error = employeesRes.error ?? attendanceRes.error;
  if (error) throw error;

  const employeeByUser = new Map(
    ((employeesRes.data ?? []) as unknown as EmployeeRow[]).map((row) => [row.user_id, mapEmployee(row)]),
  );
  const employeeById = new Map(
    ((employeesRes.data ?? []) as unknown as EmployeeRow[]).map((row) => [row.id, mapEmployee(row)]),
  );
  const outletNameById = new Map<string, string>(
    ((outletsRes.data ?? []) as { id: string; name: string }[]).map((o) => [o.id, o.name]),
  );

  const rawEntries = ((attendanceRes.data ?? []) as unknown as AttendanceRow[]).map((row) =>
    mapAttendance(row, employeeByUser, employeeById, outletNameById),
  );

  return {
    configured: true,
    settings,
    resetRequests: resetsRes,
    rows: aggregateDailyAttendance(rawEntries, settings),
  };
}

export async function fetchSalaryReportRows(startDate = currentMonthStart(), endDate = dateKey(), outletId?: string) {
  if (!supabase) return [] as SalaryReportRow[];

  const [settings, deductionRules, employeesRes, attendanceRes, holidays, incentives] = await Promise.all([
    fetchCompanySettings(),
    fetchDesignationDeductions(),
    supabase.from("employees").select(employeeSelect()).order("full_name", { ascending: true }),
    supabase
      .from("attendance_sessions")
      .select(attendanceSelect())
      .gte("date", startDate)
      .lte("date", endDate),
    fetchHolidays(startDate, endDate),
    fetchIncentives(startDate, endDate)
  ]);

  const error = employeesRes.error ?? attendanceRes.error;
  if (error) throw error;

  const employees = ((employeesRes.data ?? []) as unknown as EmployeeRow[]).map(mapEmployee);
  const attendance = (attendanceRes.data ?? []) as unknown as AttendanceRow[];
  return calculatePayrollRows(employees, attendance, settings, startDate, endDate, deductionRules, holidays, incentives, outletId);
}

export type Outlet = {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  geofence_radius_meters: number;
  active: boolean;
  device_secret?: string; // Automatically populated
};

export async function fetchOutlets(includeInactive = false) {
  if (!supabase) return [];
  let query = supabase.from("outlets").select("*, kiosk_devices(device_secret)");
  if (!includeInactive) {
    query = query.eq("active", true);
  }
  const { data, error } = await query.order("name");
  if (error) throw error;
  
  const mapped = await Promise.all(data.map(async (row: any) => {
    let secret = row.kiosk_devices?.[0]?.device_secret;
    // Auto-create a device if none exists for this outlet
    if (!secret && supabase) {
      const { data: newDevice } = await supabase
        .from("kiosk_devices")
        .insert({ outlet_id: row.id, name: `${row.name} Main Kiosk` })
        .select("device_secret")
        .single();
      if (newDevice) secret = newDevice.device_secret;
    }
    return {
      id: row.id,
      name: row.name,
      latitude: row.latitude,
      longitude: row.longitude,
      geofence_radius_meters: row.geofence_radius_meters,
      active: row.active,
      device_secret: secret
    } as Outlet;
  }));
  return mapped;
}

export async function createOutlet(outlet: Partial<Outlet>) {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.from("outlets").insert(outlet);
  if (error) throw error;
}

export async function updateOutlet(id: string, outlet: Partial<Outlet>) {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.from("outlets").update(outlet).eq("id", id);
  if (error) throw error;
}

export async function setOutletActive(id: string, active: boolean) {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.from("outlets").update({ active }).eq("id", id);
  if (error) throw error;
}

function aggregateDailyAttendance(entries: AttendanceEntry[], settings: CompanySettings): DailyAttendance[] {
  const grouped = new Map<string, AttendanceEntry[]>();
  entries.forEach(entry => {
    const key = (entry.employeeIdRaw ?? "") + "_" + entry.date;
    const list = grouped.get(key) || [];
    list.push(entry);
    grouped.set(key, list);
  });

  const result: DailyAttendance[] = [];
  const halfDayThreshold = settings.halfDayThreshold ?? 4;
  const fullDayHours = settings.fullDayHours ?? 8;
  const lunchBreakHours = Number((settings as any).lunchBreakMinutes ?? 60) / 60;

  grouped.forEach((sessions, _key) => {
    // Sort chronologically using the raw ISO string, not the formatted "02:30 PM" string
    sessions.sort((a, b) => a.checkInRaw.localeCompare(b.checkInRaw));
    const firstIn = sessions[0].checkIn;
    const lastSession = sessions[sessions.length - 1];
    const lastOut = lastSession.checkOut !== "-" ? lastSession.checkOut : "-";

    const rawHours = sessions.reduce((sum, s) => sum + s.hours, 0);
    const payableHours = Math.max(0, rawHours - lunchBreakHours);

    let status = "Absent";
    const isActive = sessions.some(s => s.checkOut === "-");

    if (isActive) {
      status = "Active";
    } else if (payableHours >= fullDayHours - 0.5) {
      status = "Completed";
    } else if (payableHours >= halfDayThreshold) {
      status = "Half Day";
    } else {
      status = rawHours > 0 ? "Incomplete" : "Absent";
    }

    const rep = sessions[0];
    result.push({
      id: (rep.employeeIdRaw ?? "") + "_" + rep.date,
      employeeIdRaw: rep.employeeIdRaw,
      employee: rep.employee,
      employeeId: rep.employeeId,
      department: rep.department,
      date: rep.date,
      firstIn,
      lastOut,
      sessions,
      totalHours: payableHours,
      status,
      confidence: rep.confidence,
    });
  });

  result.sort((a, b) => b.date.localeCompare(a.date) || (a.employee ?? "").localeCompare(b.employee ?? ""));
  return result;
}

export async function fetchAttendanceHistory(startDate = dateKey(), endDate = dateKey()): Promise<DailyAttendance[]> {
  if (!supabase) return [];

  const [employeesRes, attendanceRes, settings] = await Promise.all([
    supabase.from("employees").select(employeeSelect()),
    supabase
      .from("attendance_sessions")
      .select(attendanceSelect())
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: false })
      .order("check_in", { ascending: false }),
    fetchCompanySettings(),
  ]);

  const error = employeesRes.error ?? attendanceRes.error;
  if (error) throw error;

  const employees = ((employeesRes.data ?? []) as unknown as EmployeeRow[]).map(mapEmployee);
  const employeeByUser = new Map(employees.map((employee) => [employee.userId, employee]));
  const employeeById = new Map(employees.map((employee) => [employee.id, employee]));

  const rawEntries = ((attendanceRes.data ?? []) as unknown as AttendanceRow[]).map((row) =>
    mapAttendance(row, employeeByUser, employeeById),
  );

  return aggregateDailyAttendance(rawEntries, settings);
}

export async function fetchCompanyReport(
  startDate = currentMonthStart(),
  endDate = dateKey(),
): Promise<CompanyReportData> {
  if (!supabase) {
    return {
      configured: false,
      startDate,
      endDate,
      employeeCount: 0,
      attendanceRows: [],
      payrollRows: [],
      totals: {
        present: 0,
        absent: 0,
        hours: 0,
        overtime: 0,
        bonuses: 0,
        incentives: 0,
        deductions: 0,
        net: 0,
      },
    };
  }

  const [employeesRes, attendanceRows, payrollRows] = await Promise.all([
    supabase.from('employees').select(employeeSelect()),
    fetchAttendanceHistory(startDate, endDate),
    fetchSalaryReportRows(startDate, endDate),
  ]);

  if (employeesRes.error) throw employeesRes.error;
  const employees = ((employeesRes.data ?? []) as unknown as unknown as EmployeeRow[]).map(mapEmployee);
  const workDays = eachDate(startDate, endDate).filter(isWorkday).length;
  const expectedAttendances =
    employees.filter((employee) => employee.status !== 'Inactive').length * workDays;
  const present = attendanceRows.filter((row) =>
    ['Present', 'Late', 'Completed'].includes(row.status),
  ).length;

  return {
    configured: true,
    startDate,
    endDate,
    employeeCount: employees.length,
    attendanceRows,
    payrollRows,
    totals: {
      present,
      absent: Math.max(0, expectedAttendances - present),
      hours: Math.round(attendanceRows.reduce((sum, row) => sum + row.totalHours, 0) * 100) / 100,
      overtime: payrollRows.reduce((sum, row) => sum + row.overtime, 0),
      bonuses: payrollRows.reduce((sum, row) => sum + row.bonus, 0),
      incentives: payrollRows.reduce((sum, row) => sum + (row.incentives || 0), 0),
      deductions: payrollRows.reduce((sum, row) => sum + row.deductions, 0),
      net: payrollRows.reduce((sum, row) => sum + row.net, 0),
    },
  };
}


export async function fetchAIInsights(): Promise<AIInsightsData> {
  const endDate = dateKey();
  const startDate = dateKey(-29);

  if (!supabase) {
    return {
      configured: false,
      startDate,
      endDate,
      riskScore: 0,
      predictedAttendanceRate: 0,
      predictedOvertimeHours: 0,
      predictedAbsences: 0,
      insights: [],
      trend: [],
    };
  }

  const [settings, deductionRules, employeesRes, attendanceRes] = await Promise.all([
    fetchCompanySettings(),
    fetchDesignationDeductions(),
    supabase.from("employees").select(employeeSelect()),
    supabase
      .from("attendance_sessions")
      .select(attendanceSelect())
      .gte("date", startDate)
      .lte("date", endDate),
  ]);

  const error = employeesRes.error ?? attendanceRes.error;
  if (error) throw error;

  const employees = ((employeesRes.data ?? []) as unknown as unknown as EmployeeRow[]).map(mapEmployee);
  const activeEmployees = employees.filter((employee) => employee.status !== "Inactive");
  const attendance = (attendanceRes.data ?? []) as unknown as unknown as AttendanceRow[];
  const standardHours = shiftHours(settings);
  const dates = eachDate(startDate, endDate);
  const workDates = dates.filter(isWorkday);

  const trend = dates.map((iso) => {
    const rows = attendance.filter((row) => row.date === iso);
    const present = rows.filter((row) => ["Present", "Late", "Completed"].includes(row.status));
    const late = rows.filter((row) => row.status === "Late").length;
    const overtime =
      Math.round(
        rows.reduce((sum, row) => sum + Math.max(0, attendanceHours(row) - standardHours), 0) * 100,
      ) / 100;
    const absent = isWorkday(iso) ? Math.max(0, activeEmployees.length - present.length) : 0;
    const attendanceRate = activeEmployees.length
      ? Math.round((present.length / activeEmployees.length) * 100)
      : 0;
    return {
      day: iso,
      attendanceRate,
      late,
      overtime,
      absent,
    };
  });

  const workdayTrend = trend.filter((row) => workDates.includes(row.day));
  const attendanceRates = workdayTrend.map((row) => row.attendanceRate);
  const absentCounts = workdayTrend.map((row) => row.absent);
  const overtimeHours = workdayTrend.map((row) => row.overtime);
  const lateCounts = workdayTrend.map((row) => row.late);
  const holidays = await fetchHolidays(startDate, endDate);
  const incentives = await fetchIncentives(startDate, endDate);
  
  const payrollRows = calculatePayrollRows(
    activeEmployees,
    attendance,
    settings,
    startDate,
    endDate,
    deductionRules,
    holidays,
    incentives
  );

  const predictedAttendanceRate = Math.max(
    0,
    Math.min(100, Math.round(linearForecast(attendanceRates))),
  );
  const predictedAbsences = Math.max(0, Math.round(linearForecast(absentCounts)));
  const predictedOvertimeHours = Math.round(Math.max(0, linearForecast(overtimeHours)) * 10) / 10;
  const avgLate = average(lateCounts);
  const avgAbsences = average(absentCounts);
  const avgAttendance = average(attendanceRates);
  const overtimeTotal = payrollRows.reduce((sum, row) => sum + row.overtimeHours, 0);
  const highAbsenceEmployees = payrollRows
    .filter((row) => row.expectedDays > 0 && row.absentDays / row.expectedDays >= 0.2)
    .sort((a, b) => b.absentDays - a.absentDays);

  const riskScore = Math.round(
    Math.min(
      100,
      (100 - avgAttendance) * 0.55 +
        Math.min(30, avgLate * 8) +
        Math.min(25, predictedOvertimeHours * 4) +
        Math.min(25, avgAbsences * 5),
    ),
  );

  const insights: WorkforceInsight[] = [
    {
      id: "attendance-forecast",
      title: "Next-day attendance forecast",
      summary: `The local trend model predicts ${predictedAttendanceRate}% attendance for the next workday, with about ${predictedAbsences} likely absences.`,
      severity: severity(100 - predictedAttendanceRate),
      metric: `${predictedAttendanceRate}%`,
      recommendation:
        predictedAttendanceRate < 85
          ? "Review recent absence clusters and confirm staffing coverage before the next shift."
          : "Attendance trend is healthy; keep monitoring late arrivals and sudden drops.",
    },
    {
      id: "overtime-pressure",
      title: "Overtime pressure",
      summary: `Recent records project ${predictedOvertimeHours.toFixed(1)} overtime hours for the next comparable workday. Total overtime in this period is ${overtimeTotal.toFixed(1)} hours.`,
      severity: severity(predictedOvertimeHours * 18),
      metric: `${predictedOvertimeHours.toFixed(1)}h`,
      recommendation:
        predictedOvertimeHours > 2
          ? "Check workload distribution and consider temporary roster balancing for teams with repeat overtime."
          : "Overtime is currently controlled; no immediate payroll pressure detected.",
    },
    {
      id: "late-arrivals",
      title: "Late arrival pattern",
      summary: `The average late-arrival count is ${avgLate.toFixed(1)} employees per workday in the selected history window.`,
      severity: severity(avgLate * 16),
      metric: `${avgLate.toFixed(1)} late/day`,
      recommendation:
        avgLate >= 2
          ? "Identify recurring late employees and compare against shift start policy in Settings."
          : "Late arrivals are low; keep the current shift policy.",
    },
  ];

  if (highAbsenceEmployees.length) {
    const top = highAbsenceEmployees[0];
    insights.push({
      id: "employee-absence-risk",
      title: "Employee absence risk",
      summary: `${top.name} has ${top.absentDays} absent days out of ${top.expectedDays} expected workdays in this period.`,
      severity: severity((top.absentDays / Math.max(1, top.expectedDays)) * 100),
      metric: `${top.absentDays} days`,
      recommendation:
        "Review the employee attendance history and confirm whether missing scans, roster exceptions, or actual absence caused the risk.",
    });
  }

  return {
    configured: true,
    startDate,
    endDate,
    riskScore,
    predictedAttendanceRate,
    predictedOvertimeHours,
    predictedAbsences,
    insights,
    trend,
  };
}


export async function recordManualCheckIn(employeeId: string, managerId: string, outletId?: string) {
  if (!supabase) throw new Error("Supabase is not configured");

  // Check only the LATEST session — not any row with check_out=null.
  // Orphaned rows from the old double-check-in bug also have check_out=null,
  // and we must not let them block legitimate second check-ins after a checkout.
  const { data: latestSession, error: latestErr } = await supabase
    .from("attendance_sessions")
    .select("id, check_out, status")
    .eq("employee_id", employeeId)
    .eq("date", dateKey())
    .order("check_in", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestErr) throw latestErr;
  if (latestSession && !latestSession.check_out) {
    throw new Error("Employee is already checked in. Please check out first.");
  }

  const [{ data: employee }, settings, { data: firstOutlet }] = await Promise.all([
    supabase.from("employees").select("user_id").eq("id", employeeId).single(),
    fetchCompanySettings(),
    outletId ? Promise.resolve({ data: { id: outletId } }) : supabase.from("outlets").select("id").eq("active", true).limit(1).maybeSingle()
  ]);

  const now = new Date().toISOString();
  const status = latestSession?.status || attendanceStatusFor(now, settings);

  const { error } = await supabase.from("attendance_sessions").insert({
    employee_id: employeeId,
    user_id: employee?.user_id ?? null,
    outlet_id: outletId ?? firstOutlet?.id ?? null,
    date: dateKey(),
    check_in: now,
    status,
    hours_worked: 0
  });
  if (error) throw error;
  return { status };
}

export async function recordManualCheckOut(employeeId: string, managerId: string) {
  if (!supabase) throw new Error("Supabase is not configured");

  // Find the latest open session for this employee today
  const { data, error } = await supabase.from("attendance_sessions")
    .select("id, check_in")
    .eq("employee_id", employeeId)
    .eq("date", dateKey())
    .is("check_out", null)
    .order("check_in", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("No open check-in session found for today.");

  const now = new Date().toISOString();
  const hours = hoursBetween(data.check_in, now);

  const update = await supabase.from("attendance_sessions").update({
    check_out: now,
    hours_worked: hours
  }).eq("id", data.id);

  if (update.error) throw update.error;
  return { hours };
}

export async function fetchIncentives(startDate: string, endDate: string) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("incentives")
    .select("*")
    .eq("month", startDate.slice(0, 7));
  if (error) throw error;
  return data as unknown as IncentiveRow[];
}

export async function saveIncentive(payload: { employeeId: string; type: string; reason: string; amount: number; month: string; createdBy: string }) {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.from("incentives").insert({
    employee_id: payload.employeeId,
    type: payload.type,
    reason: payload.reason,
    amount: payload.amount,
    month: payload.month,
    created_by: payload.createdBy || null
  });
  if (error) throw error;
}

export async function deleteIncentive(id: string) {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.from("incentives").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchAnnouncements() {
  if (!supabase) return [] as Announcement[];
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as AnnouncementRow[]).map(row => ({
    id: row.id,
    title: row.title,
    body: row.body ?? "",
    active: row.active,
    createdAt: row.created_at,
    createdBy: row.created_by
  }));
}

export async function fetchHolidays(startDate: string, endDate: string) {
  const announcements = await fetchAnnouncements();
  const holidays = new Set<string>();
  
  announcements.forEach((a) => {
    if (a.active && a.title.toUpperCase().includes("[HOLIDAY]")) {
      const match = a.body.match(/\b\d{4}-\d{2}-\d{2}\b/);
      if (match) {
        holidays.add(match[0]);
      } else {
        holidays.add(a.createdAt.slice(0, 10));
      }
    }
  });
  return holidays;
}

export async function saveAnnouncement(payload: { id?: string; title: string; body: string; active: boolean; createdBy: string }) {
  if (!supabase) throw new Error("Supabase is not configured");
  if (payload.id) {
    const { error } = await supabase.from("announcements").update({
      title: payload.title,
      body: payload.body,
      active: payload.active
    }).eq("id", payload.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("announcements").insert({
      title: payload.title,
      body: payload.body,
      active: payload.active,
      created_by: payload.createdBy
    });
    if (error) throw error;
  }
}

export async function deleteAnnouncement(id: string) {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) throw error;
}
