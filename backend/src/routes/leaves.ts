import { Router } from 'express';
import prisma from '../../database/db';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { LeaveStatus } from '@prisma/client';

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res: any) => {
  try {
    const employeeId = req.user.employee?.id;
    const requests = await prisma.leaveRequest.findMany({
      where: req.user.role === 'MANAGER' ? {} : { employeeId },
      include: { 
        employee: { select: { name: true, employeeCode: true } },
        leaveType: true,
        reviewedBy: { select: { email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', requireAuth, async (req: AuthRequest, res: any) => {
  try {
    const { leaveTypeId, startDate, endDate, reason, isHalfDay } = req.body;
    const employeeId = req.user.employee?.id;
    if (!employeeId) return res.status(400).json({ error: 'User is not an employee' });

    const request = await prisma.leaveRequest.create({
      data: {
        employeeId,
        leaveTypeId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason,
        isHalfDay: isHalfDay || false
      }
    });
    res.json(request);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', requireAuth, async (req: AuthRequest, res: any) => {
  try {
    if (req.user.role !== 'MANAGER') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const { status, reviewComment } = req.body;
    
    // Convert status string to enum value safely
    const leaveStatus = status === 'APPROVED' ? LeaveStatus.APPROVED : 
                        status === 'REJECTED' ? LeaveStatus.REJECTED : LeaveStatus.PENDING;

    const request = await prisma.leaveRequest.update({
      where: { id: req.params.id },
      data: {
        status: leaveStatus,
        reviewComment,
        reviewedById: req.user.id
      }
    });
    res.json(request);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/balances', requireAuth, async (req: AuthRequest, res: any) => {
  try {
    const employeeId = req.user.employee?.id;
    const year = new Date().getFullYear();
    const balances = await prisma.leaveBalance.findMany({
      where: { employeeId, year },
      include: { leaveType: true }
    });
    res.json(balances);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
