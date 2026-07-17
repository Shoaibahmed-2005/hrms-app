import { Router } from 'express';
import prisma from '../../database/db';
import { requireAuth, requireManager, AuthRequest } from '../middleware/auth';

const router = Router();

// Employee submits a face re-registration request
router.post('/request', requireAuth, async (req: AuthRequest, res: any) => {
  try {
    const employeeId = req.user.employee?.id;
    if (!employeeId) return res.status(400).json({ error: 'User is not an employee' });

    const { reason } = req.body;
    if (!reason?.trim()) return res.status(400).json({ error: 'A reason is required' });

    // Check for existing pending request
    const existing = await prisma.faceResetRequest.findFirst({
      where: { employeeId, status: 'PENDING' }
    });
    if (existing) {
      return res.status(409).json({ error: 'You already have a pending face re-registration request' });
    }

    const request = await prisma.faceResetRequest.create({
      data: { employeeId, reason }
    });

    // Notify all managers
    const managers = await prisma.user.findMany({ where: { role: 'MANAGER' } });
    await prisma.notification.createMany({
      data: managers.map(m => ({
        userId: m.id,
        type: 'FACE_RESET',
        message: `${req.user.employee?.name} has requested face re-registration: "${reason}"`
      }))
    });

    res.status(201).json(request);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

// Manager views all face reset requests
router.get('/pending', requireAuth, requireManager, async (req: any, res: any) => {
  try {
    const requests = await prisma.faceResetRequest.findMany({
      where: { status: 'PENDING' },
      include: {
        employee: {
          select: { name: true, employeeCode: true, department: true, designation: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(requests);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

// Manager gets all requests (history)
router.get('/', requireAuth, requireManager, async (req: any, res: any) => {
  try {
    const requests = await prisma.faceResetRequest.findMany({
      include: {
        employee: {
          select: { name: true, employeeCode: true, department: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(requests);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

// Manager approves or rejects
router.put('/:id', requireAuth, requireManager, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { approve, reviewNote } = req.body;

    const faceReq = await prisma.faceResetRequest.findUnique({
      where: { id },
      include: { employee: { include: { user: true } } }
    });
    if (!faceReq) return res.status(404).json({ error: 'Request not found' });
    if (faceReq.status !== 'PENDING') {
      return res.status(400).json({ error: 'Request already decided' });
    }

    const status = approve ? 'APPROVED' : 'REJECTED';

    await prisma.faceResetRequest.update({
      where: { id },
      data: { status, reviewedById: req.user.id, reviewNote: reviewNote || null }
    });

    if (approve) {
      // Delete old face embedding so employee must re-register
      await prisma.faceEmbedding.deleteMany({ where: { employeeId: faceReq.employeeId } });
    }

    // Notify the employee
    await prisma.notification.create({
      data: {
        userId: faceReq.employee.userId,
        type: 'FACE_RESET',
        message: approve
          ? 'Your face re-registration request was APPROVED. Please register your face on the Attendance page.'
          : `Your face re-registration request was REJECTED. ${reviewNote ? `Reason: ${reviewNote}` : ''}`
      }
    });

    res.json({ ok: true, status });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

export default router;
