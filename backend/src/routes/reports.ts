import { Router } from 'express';
import prisma from '../../database/db';
import { requireAuth, requireManager } from '../middleware/auth';

const router = Router();

// ── GET /reports/earnings ──────────────────────────────────────────────────────
// Query params: employeeId, from (YYYY-MM-DD), to (YYYY-MM-DD)
router.get('/earnings', requireAuth, requireManager, async (req: any, res: any) => {
  try {
    const { employeeId, from, to } = req.query;
    if (!employeeId || !from || !to) {
      return res.status(400).json({ error: 'employeeId, from, and to query params are required' });
    }

    const fromDate = new Date(from as string);
    const toDate = new Date(to as string);
    toDate.setHours(23, 59, 59, 999);

    const employee = await prisma.employee.findUnique({ where: { id: employeeId as string } });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const records = await prisma.attendanceRecord.findMany({
      where: {
        employeeId: employeeId as string,
        date: { gte: fromDate, lte: toDate }
      },
      orderBy: { date: 'asc' }
    });

    // Build row-by-row report
    const rows = records.map(r => {
      const hoursWorked = r.hoursWorked ?? 0;
      let dayType: 'Full Day' | 'Half Day' | 'Absent' = 'Absent';
      if (r.checkInTime) {
        dayType = r.isHalfDay ? 'Half Day' : 'Full Day';
      }

      let dailyEarnings = r.dailyEarnings ?? 0;
      // Recalculate if not stored
      if (!r.dailyEarnings && r.checkInTime) {
        if (employee.paymentType === 'HOURLY' && employee.hourlyRate) {
          dailyEarnings = hoursWorked * employee.hourlyRate;
        } else if (employee.paymentType === 'MONTHLY' && employee.baseSalary) {
          const dailyRate = employee.baseSalary / 26;
          dailyEarnings = r.isHalfDay ? dailyRate / 2 : dailyRate;
        }
        dailyEarnings = Math.round(dailyEarnings * 100) / 100;
      }

      return {
        date: r.date,
        checkInTime: r.checkInTime,
        checkOutTime: r.checkOutTime,
        hoursWorked: Math.round(hoursWorked * 100) / 100,
        dayType,
        status: r.status,
        dailyEarnings,
        faceMatchScore: r.faceMatchScore ? Math.round(r.faceMatchScore * 100) : null,
      };
    });

    // Summary totals
    const workedRows = rows.filter(r => r.dayType !== 'Absent');
    const totalDays = workedRows.length;
    const totalHours = workedRows.reduce((s, r) => s + r.hoursWorked, 0);
    const totalEarnings = workedRows.reduce((s, r) => s + r.dailyEarnings, 0);
    const fullDays = rows.filter(r => r.dayType === 'Full Day').length;
    const halfDays = rows.filter(r => r.dayType === 'Half Day').length;
    const absentDays = rows.filter(r => r.dayType === 'Absent').length;

    res.json({
      employee: {
        id: employee.id,
        name: employee.name,
        employeeCode: employee.employeeCode,
        department: employee.department,
        designation: employee.designation,
        paymentType: employee.paymentType,
        hourlyRate: employee.hourlyRate,
        baseSalary: employee.baseSalary,
      },
      period: { from, to },
      rows,
      summary: {
        totalDays,
        fullDays,
        halfDays,
        absentDays,
        totalHours: Math.round(totalHours * 100) / 100,
        totalEarnings: Math.round(totalEarnings * 100) / 100,
      }
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

// ── GET /reports/dashboard ─────────────────────────────────────────────────────
// Returns stats for the dashboard charts
router.get('/dashboard', requireAuth, requireManager, async (_req: any, res: any) => {
  try {
    const localStr = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0');
    const today = new Date(`${localStr}T00:00:00.000Z`);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [totalActive, todayRecords, monthRecords, deptGroups] = await Promise.all([
      prisma.employee.count({ where: { status: 'ACTIVE' } }),
      prisma.attendanceRecord.findMany({
        where: { date: today, checkInTime: { not: null } },
        select: { status: true, dailyEarnings: true }
      }),
      prisma.attendanceRecord.findMany({
        where: { date: { gte: monthStart }, checkInTime: { not: null } },
        select: { date: true, status: true, dailyEarnings: true, employeeId: true }
      }),
      prisma.employee.groupBy({ by: ['department'], where: { status: 'ACTIVE' }, _count: { id: true } })
    ]);

    const presentToday = todayRecords.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length;
    const lateToday = todayRecords.filter(r => r.status === 'LATE').length;
    const absentToday = totalActive - presentToday;
    const todayEarnings = todayRecords.reduce((s, r) => s + (r.dailyEarnings ?? 0), 0);
    const monthEarnings = monthRecords.reduce((s, r) => s + (r.dailyEarnings ?? 0), 0);

    // 30-day attendance trend
    const trend: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      trend[d.toISOString().slice(0, 10)] = 0;
    }
    monthRecords.forEach(r => {
      const key = new Date(r.date).toISOString().slice(0, 10);
      if (key in trend) trend[key]++;
    });
    const trendData = Object.entries(trend).map(([date, count]) => ({ date: date.slice(5), count }));

    res.json({
      kpi: { totalActive, presentToday, lateToday, absentToday, todayEarnings, monthEarnings },
      trendData,
      departments: deptGroups.map(d => ({ name: d.department, count: d._count.id }))
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

export default router;
