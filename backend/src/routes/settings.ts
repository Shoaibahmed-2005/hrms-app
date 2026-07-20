import { Router } from 'express';
import { requireAuth, requireManager } from '../middleware/auth';
import prisma from '../../database/db';

const router = Router();

// GET /settings
router.get('/', requireAuth, async (_req, res: any) => {
  try {
    let settings = await prisma.companySetting.findFirst();
    if (!settings) {
      // Auto-create defaults
      settings = await prisma.companySetting.create({ data: { id: '1' } });
    }
    res.json({
      shiftStart: settings.shiftStart,
      shiftEnd: settings.shiftEnd,
      halfDayThresholdHours: settings.halfDayThresholdHours,
      fullDayHours: settings.fullDayHours,
      faceMatchThreshold: settings.faceMatchThreshold,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to fetch settings' });
  }
});

// PUT /settings
router.put('/', requireAuth, requireManager, async (req: any, res: any) => {
  try {
    const {
      shiftStart, shiftEnd, halfDayThresholdHours, fullDayHours,
      faceMatchThreshold
    } = req.body;

    const data: any = {};
    if (shiftStart) data.shiftStart = shiftStart;
    if (shiftEnd) data.shiftEnd = shiftEnd;
    if (halfDayThresholdHours !== undefined) data.halfDayThresholdHours = Number(halfDayThresholdHours);
    if (fullDayHours !== undefined) data.fullDayHours = Number(fullDayHours);
    if (faceMatchThreshold !== undefined) data.faceMatchThreshold = Number(faceMatchThreshold);

    const updated = await prisma.companySetting.upsert({
      where: { id: '1' },
      update: data,
      create: { id: '1', ...data }
    });
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to update settings' });
  }
});

export default router;
