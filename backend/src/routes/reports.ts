import { Router } from 'express';
import { requireAuth, requireManager } from '../middleware/auth';
import prisma from '../../database/db';

const router = Router();

// Get reports data
router.get('/', requireAuth, requireManager, async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      select: { baseSalary: true, department: { select: { name: true } } }
    });
    
    const deptCostMap = new Map<string, number>();
    employees.forEach(e => {
      const key = e.department?.name || "Unassigned";
      deptCostMap.set(key, (deptCostMap.get(key) || 0) + Number(e.baseSalary));
    });
    
    const deptCost = Array.from(deptCostMap, ([name, value]) => ({ name, value }));

    const leaves = await prisma.leaveRequest.findMany({
      where: { status: 'APPROVED' },
      select: { leaveType: { select: { name: true } } }
    });
    
    const leaveMap = new Map<string, number>();
    leaves.forEach(l => {
      const key = l.leaveType?.name || "Unknown";
      leaveMap.set(key, (leaveMap.get(key) || 0) + 1);
    });
    
    const leaveByKind = Array.from(leaveMap, ([name, value]) => ({ name, value }));
    
    res.json({ deptCost, leaveByKind });
  } catch (error) {
    console.error('Fetch reports error:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

export default router;
