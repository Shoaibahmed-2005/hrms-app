import { Router } from 'express';
import prisma from '../../database/db';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { PayrollStatus } from '@prisma/client';

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res: any) => {
  try {
    const periods = await prisma.payrollPeriod.findMany({
      include: {
        entries: {
          where: req.user.role === 'MANAGER' ? {} : { employeeId: req.user.employee?.id },
          include: { employee: { select: { name: true, employeeCode: true, baseSalary: true } } }
        }
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }]
    });
    res.json(periods);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/generate', requireAuth, async (req: AuthRequest, res: any) => {
  try {
    if (req.user.role !== 'MANAGER') return res.status(403).json({ error: 'Unauthorized' });
    const { month, year } = req.body;

    // Check if period already exists
    let period = await prisma.payrollPeriod.findUnique({
      where: { month_year: { month, year } }
    });

    if (!period) {
      period = await prisma.payrollPeriod.create({
        data: { month, year, status: PayrollStatus.DRAFT }
      });
    }

    const employees = await prisma.employee.findMany();
    
    // For each employee, compute entries
    // This is a naive computation for demo purposes
    for (const emp of employees) {
      const gross = emp.baseSalary / 12;
      const netPay = gross; // Simplified
      
      const existing = await prisma.payrollEntry.findUnique({
        where: { payrollPeriodId_employeeId: { payrollPeriodId: period.id, employeeId: emp.id } }
      });

      if (existing) {
        await prisma.payrollEntry.update({
          where: { id: existing.id },
          data: { gross, netPay }
        });
      } else {
        await prisma.payrollEntry.create({
          data: {
            payrollPeriodId: period.id,
            employeeId: emp.id,
            gross,
            netPay
          }
        });
      }
    }
    
    res.json({ message: 'Payroll generated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/finalize', requireAuth, async (req: AuthRequest, res: any) => {
  try {
    if (req.user.role !== 'MANAGER') return res.status(403).json({ error: 'Unauthorized' });
    const { id } = req.params;

    const period = await prisma.payrollPeriod.findUnique({ where: { id } });
    if (!period) return res.status(404).json({ error: 'Period not found' });
    if (period.status === PayrollStatus.FINALIZED) {
      return res.status(400).json({ error: 'Period is already finalized' });
    }

    const updated = await prisma.payrollPeriod.update({
      where: { id },
      data: { status: PayrollStatus.FINALIZED }
    });

    res.json({ message: 'Payroll finalized successfully', period: updated });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
