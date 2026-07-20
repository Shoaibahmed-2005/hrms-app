import { Router } from 'express';
import prisma from '../../database/db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/manager', requireAuth, async (req: AuthRequest, res: any) => {
  try {
    if (req.user.role !== 'MANAGER') return res.status(403).json({ error: 'Unauthorized' });

    const localStr = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0');
    const today = new Date(`${localStr}T00:00:00.000Z`);

    const [totalEmp, activeEmp, pendingLeave, attRecords] = await Promise.all([
      prisma.employee.count(),
      prisma.employee.count({ where: { status: 'ACTIVE' } }),
      prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
      prisma.attendanceRecord.findMany({ where: { date: today } })
    ]);

    const present = attRecords.length;
    const late = attRecords.filter(a => a.status === 'LATE').length;

    // Trend (last 30 days)
    const start = new Date();
    start.setDate(start.getDate() - 29);
    start.setHours(0,0,0,0);

    const trendData = await prisma.attendanceRecord.findMany({
      where: { date: { gte: start } },
      select: { date: true }
    });

    const byDay = new Map<string, number>();
    for (let i = 0; i < 30; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      byDay.set(d.toISOString().slice(0, 10), 0);
    }
    trendData.forEach(r => {
      const d = r.date.toISOString().slice(0, 10);
      byDay.set(d, (byDay.get(d) ?? 0) + 1);
    });
    
    const trend = Array.from(byDay.entries()).map(([d, count]) => ({ date: d, count }));

    res.json({
      totals: { total: totalEmp, active: activeEmp, pending: pendingLeave, present, late },
      trend
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/employee', requireAuth, async (req: AuthRequest, res: any) => {
  try {
    const employeeId = req.user.employee?.id;
    if (!employeeId) return res.status(404).json({ error: 'Employee not found' });

    const localStr = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0');
    const today = new Date(`${localStr}T00:00:00.000Z`);

    const att = await prisma.attendanceRecord.findUnique({
      where: { employeeId_date: { employeeId, date: today } }
    });

    const balances = await prisma.leaveBalance.findMany({
      where: { employeeId },
      include: { leaveType: true }
    });

    const lastPay = await prisma.payrollEntry.findFirst({
      where: { employeeId },
      include: { payrollPeriod: true },
      orderBy: { id: 'desc' } // naive ordering, should be by period
    });

    res.json({ att, balances, lastPay });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
