import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import prisma from '../../database/db';

const router = Router();

// Get settings
router.get('/', requireAuth, async (req, res) => {
  try {
    const settings = await (prisma as any).companySetting.findFirst();
    if (!settings) return res.json(null);
    // Map schema fields to frontend-friendly camelCase
    res.json({
      companyName: settings.companyName ?? 'HRMS',
      officeLat: settings.geofenceLat,
      officeLng: settings.geofenceLng,
      geofenceRadiusM: settings.geofenceRadiusM,
      shiftStart: settings.shiftStart,
      shiftEnd: settings.shiftEnd,
      overtimeRate: settings.overtimeRate,
      overtimeOffsetsLeave: settings.overtimeOffsetsLeave,
      faceMatchThreshold: settings.faceMatchThreshold,
    });
  } catch (error) {
    console.error('Fetch settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update settings
router.put('/', requireAuth, async (req, res) => {
  try {
    const {
      companyName, officeLat, officeLng, geofenceRadiusM,
      shiftStart, shiftEnd, overtimeRate, overtimeOffsetsLeave,
      faceMatchThreshold
    } = req.body;

    const existing = await (prisma as any).companySetting.findFirst();
    let updated;
    const data = {
      geofenceLat: officeLat,
      geofenceLng: officeLng,
      geofenceRadiusM: Number(geofenceRadiusM),
      shiftStart,
      shiftEnd,
      overtimeRate: Number(overtimeRate),
      overtimeOffsetsLeave: Boolean(overtimeOffsetsLeave),
      faceMatchThreshold: Number(faceMatchThreshold),
    };

    if (existing) {
      updated = await (prisma as any).companySetting.update({ where: { id: existing.id }, data });
    } else {
      updated = await (prisma as any).companySetting.create({ data: { ...data, id: '1' } });
    }
    res.json(updated);
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default router;

