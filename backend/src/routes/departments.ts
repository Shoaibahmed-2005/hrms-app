import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import prisma from '../../database/db';

const router = Router();

// Get all distinct department names (derived from employees table)
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await prisma.employee.findMany({
      select: { department: true },
      distinct: ['department'],
      orderBy: { department: 'asc' }
    });
    // Return in {id, name} shape expected by frontend
    const departments = result.map((r, i) => ({ id: r.department, name: r.department }));
    res.json(departments);
  } catch (error) {
    console.error('Fetch departments error:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

export default router;
