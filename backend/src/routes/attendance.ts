import { Router } from 'express';
import prisma from '../../database/db';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { AttendanceStatus } from '@prisma/client';

const router = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function euclideanDistance(v1: number[], v2: number[]): number {
  if (v1.length !== v2.length) return Infinity;
  return Math.sqrt(v1.reduce((sum, val, i) => sum + Math.pow(val - v2[i], 2), 0));
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Shared face-verification helper ─────────────────────────────────────────

async function verifyFace(employeeId: string, descriptor: number[], threshold: number) {
  // Must have a registered face
  const embedding = await prisma.faceEmbedding.findFirst({ where: { employeeId } });
  if (!embedding) {
    return { ok: false, error: 'No face registered. Please register your face first.', score: 0 };
  }
  const dist = euclideanDistance(descriptor, embedding.embeddingVector);
  const score = Math.max(0, 1 - dist);
  if (dist > threshold) {
    return { ok: false, error: `Face verification failed (score: ${(score * 100).toFixed(0)}%). Please try again in good lighting.`, score };
  }
  return { ok: true, error: null, score };
}

// ─── GET /attendance/face-status ─────────────────────────────────────────────

router.get('/face-status', requireAuth, async (req: AuthRequest, res: any) => {
  try {
    const employeeId = req.user.employee?.id;
    if (!employeeId) return res.json({ registered: false });
    const embedding = await prisma.faceEmbedding.findFirst({ where: { employeeId } });
    res.json({ registered: !!embedding });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── GET /attendance ──────────────────────────────────────────────────────────

router.get('/', requireAuth, async (req: AuthRequest, res: any) => {
  try {
    const employeeId = req.user.employee?.id;
    const records = await prisma.attendanceRecord.findMany({
      where: req.user.role === 'MANAGER' ? {} : { employeeId },
      include: { employee: { select: { name: true, employeeCode: true, department: true } } },
      orderBy: { date: 'desc' },
      take: 100
    });
    res.json(records);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── POST /attendance/check-in ────────────────────────────────────────────────

router.post('/check-in', requireAuth, async (req: AuthRequest, res: any) => {
  try {
    const { descriptor, lat, lng } = req.body;
    const employeeId = req.user.employee?.id;
    if (!employeeId) return res.status(400).json({ error: 'User is not an employee' });
    if (!descriptor || !Array.isArray(descriptor)) {
      return res.status(400).json({ error: 'Face descriptor is required. Please enable your camera.' });
    }

    const settings = await prisma.companySetting.findFirst();
    if (!settings) return res.status(500).json({ error: 'Company settings not configured' });

    // 1. Geofence check (if location provided)
    if (lat !== undefined && lng !== undefined) {
      const dist = haversineMeters(lat, lng, settings.geofenceLat, settings.geofenceLng);
      if (dist > settings.geofenceRadiusM) {
        return res.status(403).json({ error: `You are outside the office geofence (${Math.round(dist)}m away, limit is ${settings.geofenceRadiusM}m).` });
      }
    }

    // 2. Face verification (REQUIRED)
    const faceResult = await verifyFace(employeeId, descriptor, settings.faceMatchThreshold);
    if (!faceResult.ok) return res.status(403).json({ error: faceResult.error });

    // 3. Check today's record
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const existing = await prisma.attendanceRecord.findUnique({
      where: { employeeId_date: { employeeId, date: today } }
    });

    if (existing?.checkInTime && existing?.checkOutTime) {
      return res.status(400).json({ error: 'Already checked in and out today.' });
    }
    if (existing?.checkInTime) {
      return res.status(400).json({ error: 'Already checked in. Use check-out instead.' });
    }

    // 4. Determine late status
    const now = new Date();
    const [shiftH, shiftM] = settings.shiftStart.split(':').map(Number);
    const shiftStartMs = new Date(today);
    shiftStartMs.setHours(shiftH, shiftM + 5, 0, 0); // 5-min grace
    const isLate = now > shiftStartMs;

    const record = await prisma.attendanceRecord.create({
      data: {
        employeeId, date: today,
        checkInTime: now,
        status: isLate ? AttendanceStatus.LATE : AttendanceStatus.PRESENT,
        checkInLat: lat ?? null,
        checkInLng: lng ?? null,
        faceMatchScore: faceResult.score,
      }
    });

    res.json({ message: 'Checked in successfully', record, faceScore: (faceResult.score * 100).toFixed(0) });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

// ─── POST /attendance/check-out ───────────────────────────────────────────────

router.post('/check-out', requireAuth, async (req: AuthRequest, res: any) => {
  try {
    const { descriptor } = req.body;
    const employeeId = req.user.employee?.id;
    if (!employeeId) return res.status(400).json({ error: 'User is not an employee' });
    if (!descriptor || !Array.isArray(descriptor)) {
      return res.status(400).json({ error: 'Face descriptor is required. Please enable your camera.' });
    }

    const settings = await prisma.companySetting.findFirst();
    if (!settings) return res.status(500).json({ error: 'Company settings not configured' });

    // 1. Face verification (REQUIRED on check-out too)
    const faceResult = await verifyFace(employeeId, descriptor, settings.faceMatchThreshold);
    if (!faceResult.ok) return res.status(403).json({ error: faceResult.error });

    // 2. Find today's open check-in
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const existing = await prisma.attendanceRecord.findUnique({
      where: { employeeId_date: { employeeId, date: today } }
    });

    if (!existing?.checkInTime) {
      return res.status(400).json({ error: 'No check-in found for today.' });
    }
    if (existing.checkOutTime) {
      return res.status(400).json({ error: 'Already checked out today.' });
    }

    const now = new Date();
    const hoursWorked = (now.getTime() - existing.checkInTime.getTime()) / (1000 * 60 * 60);

    const updated = await prisma.attendanceRecord.update({
      where: { id: existing.id },
      data: { checkOutTime: now, hoursWorked, faceMatchScore: faceResult.score }
    });

    res.json({ message: 'Checked out successfully', record: updated, faceScore: (faceResult.score * 100).toFixed(0) });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

// ─── POST /attendance/register-face ──────────────────────────────────────────

router.post('/register-face', requireAuth, async (req: AuthRequest, res: any) => {
  try {
    const { descriptor } = req.body;
    const employeeId = req.user.employee?.id;
    if (!employeeId) return res.status(400).json({ error: 'User is not an employee' });
    if (!descriptor || !Array.isArray(descriptor) || descriptor.length !== 128) {
      return res.status(400).json({ error: 'Invalid face descriptor. Expected 128-element array.' });
    }

    // Delete old embedding(s) and create fresh
    await prisma.faceEmbedding.deleteMany({ where: { employeeId } });
    await prisma.faceEmbedding.create({ data: { employeeId, embeddingVector: descriptor } });

    res.json({ message: 'Face registered successfully' });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

export default router;
