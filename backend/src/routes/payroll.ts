import { Router } from 'express';
import prisma from '../../database/db';
import { requireAuth, requireManager, AuthRequest } from '../middleware/auth';
import { PayrollStatus } from '@prisma/client';

const router = Router();

// ── GET /payroll ───────────────────────────────────────────────────────────────
router.get('/', requireAuth, requireManager, async (_req: any, res: any) => {
  try {
    const periods = await prisma.payrollPeriod.findMany({
      include: {
        entries: {
          include: {
            employee: { select: { id: true, name: true, employeeCode: true, department: true, paymentType: true, baseSalary: true, hourlyRate: true } }
          }
        }
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }]
    });
    res.json(periods);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

// ── POST /payroll/generate ─────────────────────────────────────────────────────
// Generates payroll for a specific month/year based on actual attendance records
router.post('/generate', requireAuth, requireManager, async (req: AuthRequest, res: any) => {
  try {
    const { month, year } = req.body;
    if (!month || !year) return res.status(400).json({ error: 'month and year are required' });

    // Get or create payroll period
    let period = await prisma.payrollPeriod.findUnique({ where: { month_year: { month, year } } });
    if (!period) {
      period = await prisma.payrollPeriod.create({ data: { month, year, status: PayrollStatus.DRAFT } });
    } else if (period.status === PayrollStatus.FINALIZED) {
      return res.status(400).json({ error: 'This period is already finalized and cannot be regenerated' });
    }

    // Date range for this month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const employees = await prisma.employee.findMany({ where: { status: 'ACTIVE' } });

    for (const emp of employees) {
      // Get all attendance records for this employee in this month
      const records = await prisma.attendanceRecord.findMany({
        where: {
          employeeId: emp.id,
          date: { gte: startDate, lte: endDate },
          checkInTime: { not: null }  // only days they actually worked
        }
      });

      const totalDays = records.length;
      const halfDays = records.filter(r => r.isHalfDay).length;
      const fullDays = totalDays - halfDays;
      const totalHours = records.reduce((s, r) => s + (r.hoursWorked ?? 0), 0);

      // Use pre-computed dailyEarnings if available, otherwise compute from scratch
      let totalEarnings = records.reduce((s, r) => s + (r.dailyEarnings ?? 0), 0);
      let totalExtraWages = records.reduce((s, r) => s + (r.extraWages ?? 0), 0);

      // Fallback calculation if dailyEarnings wasn't stored
      if (totalEarnings === 0 && totalDays > 0) {
        if (emp.paymentType === 'HOURLY' && emp.hourlyRate) {
          totalEarnings = totalHours * emp.hourlyRate;
        } else if (emp.paymentType === 'MONTHLY' && emp.baseSalary) {
          const dailyRate = emp.baseSalary / 26;
          totalEarnings = (fullDays * dailyRate) + (halfDays * dailyRate * 0.5);
        }
      }

      const gross = Math.round((totalEarnings + totalExtraWages) * 100) / 100;
      const netPay = gross; // future: apply deductions here

      await prisma.payrollEntry.upsert({
        where: { payrollPeriodId_employeeId: { payrollPeriodId: period.id, employeeId: emp.id } },
        update: { totalDays, fullDays, halfDays, totalHours, totalEarnings, extraWages: totalExtraWages, gross, netPay },
        create: { payrollPeriodId: period.id, employeeId: emp.id, totalDays, fullDays, halfDays, totalHours, totalEarnings, extraWages: totalExtraWages, gross, netPay }
      });
    }

    // Notify managers
    const managers = await prisma.user.findMany({ where: { role: 'MANAGER' } });
    await prisma.notification.createMany({
      data: managers.map(m => ({
        userId: m.id,
        type: 'PAYROLL_GENERATED',
        message: `💰 Payroll generated for ${new Date(year, month - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' })} — ${employees.length} employees processed`,
        actionUrl: '/payroll'
      }))
    });

    res.json({ message: 'Payroll generated successfully', periodId: period.id });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

// ── POST /payroll/:id/finalize ─────────────────────────────────────────────────
router.post('/:id/finalize', requireAuth, requireManager, async (req: any, res: any) => {
  try {
    const period = await prisma.payrollPeriod.findUnique({ where: { id: req.params.id } });
    if (!period) return res.status(404).json({ error: 'Period not found' });
    if (period.status === PayrollStatus.FINALIZED) {
      return res.status(400).json({ error: 'Already finalized' });
    }
    const updated = await prisma.payrollPeriod.update({
      where: { id: req.params.id },
      data: { status: PayrollStatus.FINALIZED }
    });
    res.json({ message: 'Payroll finalized', period: updated });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

export default router;
