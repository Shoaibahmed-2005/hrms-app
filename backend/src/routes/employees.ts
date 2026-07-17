import { Router } from 'express';
import prisma from '../../database/db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res: any) => {
  try {
    const employees = await prisma.employee.findMany({
      include: {
        user: { select: { email: true, role: true } },
        reportingTo: { select: { name: true } }
      }
    });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', requireAuth, async (req: AuthRequest, res: any) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { email: true, role: true } },
        reportingTo: { select: { name: true } }
      }
    });
    if (!employee) return res.status(404).json({ error: 'Not found' });
    res.json(employee);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
