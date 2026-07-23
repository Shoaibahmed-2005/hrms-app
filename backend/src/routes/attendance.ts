import { Router } from 'express';
import prisma from '../../database/db';
import { requireAuth, requireManager, AuthRequest } from '../middleware/auth';
import { AttendanceStatus } from '@prisma/client';

const router = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function euclideanDistance(v1: number[], v2: number[]): number {
  if (v1.length !== v2.length) return Infinity;
  return Math.sqrt(v1.reduce((sum, val, i) => sum + Math.pow(val - v2[i]!, 2), 0));
}

// Converts raw euclidean distance to a 0–100% confidence score
function distanceToScore(dist: number, threshold: number): number {
  if (dist === 0) return 100;
  if (dist <= threshold) {
    // Map [0, threshold] to [100, 80]
    return Math.round(100 - (20 * (dist / threshold)));
  } else {
    // Map [threshold, 1.2] to [79, 0]
    return Math.max(0, Math.round(80 - (80 * ((dist - threshold) / (1.2 - threshold)))));
  }
}

async function verifyFace(employeeId: string, descriptor: number[], threshold: number) {
  const embedding = await prisma.faceEmbedding.findFirst({ where: { employeeId } });
  if (!embedding) {
    return { ok: false, error: 'No face registered for this employee. Please register first.', score: 0 };
  }
  const dist = euclideanDistance(descriptor, embedding.embeddingVector);
  const score = distanceToScore(dist, threshold);
  
  if (dist > threshold) {
    return { ok: false, error: `Face verification failed (${score}% match). Try better lighting or look directly at the camera.`, score, dist };
  }
  return { ok: true, error: null, score, dist };
}

async function notifyManagers(type: string, message: string, actionUrl?: string) {
  const managers = await prisma.user.findMany({ where: { role: 'MANAGER' } });
  if (managers.length === 0) return;
  await prisma.notification.createMany({
    data: managers.map(m => ({ userId: m.id, type, message, actionUrl: actionUrl ?? null }))
  });
}

// 1-to-N face scan: finds best matching employee from all registered faces
async function identifyFace(descriptor: number[]) {
  const embeddings = await prisma.faceEmbedding.findMany({
    include: { employee: true }
  });
  if (embeddings.length === 0) return null;

  let best: { employeeId: string; employee: any; dist: number } | null = null;
  for (const emb of embeddings) {
    const dist = euclideanDistance(descriptor, emb.embeddingVector);
    if (!best || dist < best.dist) {
      best = { employeeId: emb.employeeId, employee: emb.employee, dist };
    }
  }
  return best;
}

function localTodayUTC() {
  const d = new Date();
  const str = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return new Date(`${str}T00:00:00.000Z`);
}

// ─── GET /attendance ──────────────────────────────────────────────────────────
router.get('/', requireAuth, async (_req: any, res: any) => {
  try {
    const records = await prisma.attendanceRecord.findMany({
      include: {
        employee: {
          select: { id: true, name: true, employeeCode: true, department: true, paymentType: true }
        }
      },
      orderBy: [{ date: 'desc' }, { checkInTime: 'desc' }],
      take: 500
    });
    res.json(records);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

// ─── GET /attendance/today ────────────────────────────────────────────────────
router.get('/today', requireAuth, async (_req: any, res: any) => {
  try {
    const localStr = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0');
    const today = new Date(`${localStr}T00:00:00.000Z`);
    const records = await prisma.attendanceRecord.findMany({
      where: { date: today },
      include: {
        employee: { select: { id: true, name: true, employeeCode: true, department: true } }
      },
      orderBy: { checkInTime: 'asc' }
    });
    res.json(records);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

// ─── POST /attendance/check-in ────────────────────────────────────────────────
// Manager provides employeeId + face descriptor
router.post('/check-in', requireAuth, requireManager, async (req: AuthRequest, res: any) => {
  try {
    const { employeeId, descriptor } = req.body;
    if (!employeeId) return res.status(400).json({ error: 'employeeId is required' });
    if (!descriptor || !Array.isArray(descriptor)) {
      return res.status(400).json({ error: 'Face descriptor is required' });
    }

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    if (employee.status === 'INACTIVE') return res.status(400).json({ error: 'Employee is inactive' });

    const settings = await prisma.companySetting.findFirst();
    const threshold = settings?.faceMatchThreshold ?? 0.60;

    // Face verification
    const faceResult = await verifyFace(employeeId, descriptor, threshold);
    if (!faceResult.ok) {
      await notifyManagers('FACE_FAIL',
        `⚠️ Face verification failed for ${employee.name} during check-in (${faceResult.score}% match)`,
        `/employees/${employeeId}`
      );
      return res.status(403).json({ error: faceResult.error, score: faceResult.score });
    }

    // Check today's record
    const localStr = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0');
    const today = new Date(`${localStr}T00:00:00.000Z`);
    const existing = await prisma.attendanceRecord.findUnique({
      where: { employeeId_date: { employeeId, date: today } }
    });

    if (existing?.checkInTime) {
      return res.status(400).json({ error: 'Employee already checked in today' });
    }

    // Determine late
    const now = new Date();
    const [shiftH, shiftM] = (settings?.shiftStart ?? '09:00').split(':').map(Number);
    const shiftStartMs = new Date(today);
    shiftStartMs.setHours(shiftH!, (shiftM ?? 0) + 5, 0, 0); // 5-min grace
    const isLate = now > shiftStartMs;

    const record = await prisma.attendanceRecord.upsert({
      where: { employeeId_date: { employeeId, date: today } },
      update: { checkInTime: now, status: isLate ? 'LATE' : 'PRESENT', faceMatchScore: faceResult.score / 100 },
      create: {
        employeeId, date: today, checkInTime: now,
        status: isLate ? AttendanceStatus.LATE : AttendanceStatus.PRESENT,
        faceMatchScore: faceResult.score / 100,
      }
    });

    // Notify
    const label = isLate ? 'late' : 'on time';
    await notifyManagers(
      isLate ? 'LATE' : 'CHECK_IN',
      `${isLate ? '⏰' : '✅'} ${employee.name} checked in ${label} at ${now.toLocaleTimeString('en-IN')}`,
      `/employees/${employeeId}`
    );

    res.json({ message: `Check-in successful (${faceResult.score}% match)`, record, faceScore: faceResult.score });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

// ─── POST /attendance/check-out ───────────────────────────────────────────────
router.post('/check-out', requireAuth, requireManager, async (req: AuthRequest, res: any) => {
  try {
    const { employeeId, descriptor, extraWages } = req.body;
    if (!employeeId) return res.status(400).json({ error: 'employeeId is required' });
    if (!descriptor || !Array.isArray(descriptor)) {
      return res.status(400).json({ error: 'Face descriptor is required' });
    }

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const settings = await prisma.companySetting.findFirst();
    const threshold = settings?.faceMatchThreshold ?? 0.60;

    // Face verification
    const faceResult = await verifyFace(employeeId, descriptor, threshold);
    if (!faceResult.ok) {
      return res.status(403).json({ error: faceResult.error, score: faceResult.score });
    }

    const localStr = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0');
    const today = new Date(`${localStr}T00:00:00.000Z`);
    const existing = await prisma.attendanceRecord.findUnique({
      where: { employeeId_date: { employeeId, date: today } }
    });

    if (!existing?.checkInTime) {
      return res.status(400).json({ error: 'No check-in found for today. Check in first.' });
    }
    if (existing.checkOutTime) {
      return res.status(400).json({ error: 'Employee already checked out today.' });
    }

    const now = new Date();
    const hoursWorked = (now.getTime() - existing.checkInTime.getTime()) / (1000 * 60 * 60);

    // Half-day / full-day determination
    const halfDayThreshold = settings?.halfDayThresholdHours ?? 4.0;
    const fullDayHours = settings?.fullDayHours ?? 8.0;
    const isHalfDay = hoursWorked >= (halfDayThreshold * 0.7) && hoursWorked < (fullDayHours * 0.75);

    // Calculate daily earnings
    let dailyEarnings = 0;
    if (employee.paymentType === 'HOURLY' && employee.hourlyRate) {
      dailyEarnings = Math.round(hoursWorked * employee.hourlyRate * 100) / 100;
    } else if (employee.paymentType === 'MONTHLY' && employee.baseSalary) {
      const dailyRate = employee.baseSalary / 26; // 26 working days/month standard
      dailyEarnings = isHalfDay ? dailyRate / 2 : dailyRate;
      dailyEarnings = Math.round(dailyEarnings * 100) / 100;
    }

    const parsedExtraWages = extraWages ? Number(extraWages) : null;

    const updated = await prisma.attendanceRecord.update({
      where: { id: existing.id },
      data: {
        checkOutTime: now,
        hoursWorked,
        isHalfDay,
        dailyEarnings,
        extraWages: parsedExtraWages,
        faceMatchScore: faceResult.score / 100
      }
    });

    await notifyManagers(
      'CHECK_OUT',
      `🏁 ${employee.name} checked out at ${now.toLocaleTimeString('en-IN')} — ${hoursWorked.toFixed(1)}h worked${isHalfDay ? ' (half-day)' : ''}. Earnings: ₹${dailyEarnings.toFixed(2)}${parsedExtraWages ? ` + ₹${parsedExtraWages} Extra` : ''}`,
      `/employees/${employeeId}`
    );

    res.json({ message: `Check-out successful (${faceResult.score}% match)`, record: updated, faceScore: faceResult.score, dailyEarnings, hoursWorked, isHalfDay, extraWages: parsedExtraWages });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

// ─── GET /attendance/face-status/:employeeId ──────────────────────────────────
router.get('/face-status/:employeeId', requireAuth, requireManager, async (req: any, res: any) => {
  try {
    const embedding = await prisma.faceEmbedding.findFirst({ where: { employeeId: req.params.employeeId } });
    res.json({ registered: !!embedding });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

// ─── POST /attendance/manual-check-in ─────────────────────────────────────────
// Manager manually marks an employee as checked in (no face verification)
router.post('/manual-check-in', requireAuth, requireManager, async (req: AuthRequest, res: any) => {
  try {
    const { employeeId } = req.body;
    if (!employeeId) return res.status(400).json({ error: 'employeeId is required' });

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    if (employee.status === 'INACTIVE') return res.status(400).json({ error: 'Employee is inactive' });

    const settings = await prisma.companySetting.findFirst();
    const today = localTodayUTC();

    const existing = await prisma.attendanceRecord.findUnique({
      where: { employeeId_date: { employeeId, date: today } }
    });
    if (existing?.checkInTime) {
      return res.status(400).json({ error: 'Employee already checked in today' });
    }

    const now = new Date();
    const [shiftH, shiftM] = (settings?.shiftStart ?? '09:00').split(':').map(Number);
    const shiftStartMs = new Date(today);
    shiftStartMs.setHours(shiftH!, (shiftM ?? 0) + 5, 0, 0);
    const isLate = now > shiftStartMs;

    const record = await prisma.attendanceRecord.upsert({
      where: { employeeId_date: { employeeId, date: today } },
      update: { checkInTime: now, status: isLate ? 'LATE' : 'PRESENT' },
      create: {
        employeeId, date: today, checkInTime: now,
        status: isLate ? AttendanceStatus.LATE : AttendanceStatus.PRESENT,
      }
    });

    const label = isLate ? 'late' : 'on time';
    await notifyManagers(
      isLate ? 'LATE' : 'CHECK_IN',
      `${isLate ? '⏰' : '✅'} ${employee.name} manually checked in ${label} at ${now.toLocaleTimeString('en-IN')}`,
      `/employees/${employeeId}`
    );

    res.json({ message: 'Manual check-in successful', record });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

// ─── POST /attendance/manual-check-out ────────────────────────────────────────
// Manager manually marks an employee as checked out (no face verification)
router.post('/manual-check-out', requireAuth, requireManager, async (req: AuthRequest, res: any) => {
  try {
    const { employeeId, extraWages } = req.body;
    if (!employeeId) return res.status(400).json({ error: 'employeeId is required' });

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const settings = await prisma.companySetting.findFirst();
    const today = localTodayUTC();

    const existing = await prisma.attendanceRecord.findUnique({
      where: { employeeId_date: { employeeId, date: today } }
    });
    if (!existing?.checkInTime) {
      return res.status(400).json({ error: 'No check-in found for today. Check in first.' });
    }
    if (existing.checkOutTime) {
      return res.status(400).json({ error: 'Employee already checked out today.' });
    }

    const now = new Date();
    const hoursWorked = (now.getTime() - existing.checkInTime.getTime()) / (1000 * 60 * 60);
    const halfDayThreshold = settings?.halfDayThresholdHours ?? 4.0;
    const fullDayHours = settings?.fullDayHours ?? 8.0;
    const isHalfDay = hoursWorked >= (halfDayThreshold * 0.7) && hoursWorked < (fullDayHours * 0.75);

    let dailyEarnings = 0;
    if (employee.paymentType === 'HOURLY' && employee.hourlyRate) {
      dailyEarnings = Math.round(hoursWorked * employee.hourlyRate * 100) / 100;
    } else if (employee.paymentType === 'MONTHLY' && employee.baseSalary) {
      const dailyRate = employee.baseSalary / 26;
      dailyEarnings = isHalfDay ? dailyRate / 2 : dailyRate;
      dailyEarnings = Math.round(dailyEarnings * 100) / 100;
    }

    const parsedExtraWages = extraWages ? Number(extraWages) : null;

    const updated = await prisma.attendanceRecord.update({
      where: { id: existing.id },
      data: { checkOutTime: now, hoursWorked, isHalfDay, dailyEarnings, extraWages: parsedExtraWages }
    });

    await notifyManagers(
      'CHECK_OUT',
      `🏁 ${employee.name} manually checked out — ${hoursWorked.toFixed(1)}h worked${isHalfDay ? ' (half-day)' : ''}. Earnings: ₹${dailyEarnings.toFixed(2)}`,
      `/employees/${employeeId}`
    );

    res.json({ message: 'Manual check-out successful', record: updated, dailyEarnings, hoursWorked, isHalfDay, extraWages: parsedExtraWages });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

// ─── POST /attendance/add-bonus ───────────────────────────────────────────────
// Manager manually adds a bonus to an existing record
router.post('/add-bonus', requireAuth, requireManager, async (req: AuthRequest, res: any) => {
  try {
    const { recordId, extraWages } = req.body;
    if (!recordId) return res.status(400).json({ error: 'recordId is required' });

    const existing = await prisma.attendanceRecord.findUnique({
      where: { id: recordId },
      include: { employee: true }
    });
    if (!existing) return res.status(404).json({ error: 'Attendance record not found' });

    const parsedExtraWages = extraWages ? Number(extraWages) : null;

    const updated = await prisma.attendanceRecord.update({
      where: { id: recordId },
      data: { extraWages: parsedExtraWages }
    });

    if (parsedExtraWages) {
      await notifyManagers(
        'PAYROLL_GENERATED',
        `💰 Added ₹${parsedExtraWages} bonus to ${existing.employee.name}'s shift`,
        `/employees/${existing.employeeId}`
      );
    }

    res.json({ message: 'Bonus added successfully', record: updated });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

// ─── POST /attendance/kiosk/check-in ─────────────────────────────────────────
// Public (no auth). Takes face descriptor, identifies employee via 1-to-N scan.
router.post('/kiosk/check-in', async (req: any, res: any) => {
  try {
    const { descriptor } = req.body;
    if (!descriptor || !Array.isArray(descriptor)) {
      return res.status(400).json({ error: 'Face descriptor is required' });
    }

    const settings = await prisma.companySetting.findFirst();
    const threshold = settings?.faceMatchThreshold ?? 0.60;

    const best = await identifyFace(descriptor);
    if (!best) return res.status(404).json({ tier: 'unknown', error: 'No registered employees found' });

    const score = distanceToScore(best.dist, threshold);

    // Tier: unknown person
    if (score < 50) {
      await notifyManagers('KIOSK_UNKNOWN',
        `🚨 Unknown person attempted to check in at the kiosk (${score}% match with ${best.employee.name}). Please investigate.`,
        `/attendance`
      );
      return res.json({ tier: 'unknown', score, message: 'Face not recognised. Please contact your manager.' });
    }

    // Tier: low confidence — refer to manager
    if (score < 80) {
      await notifyManagers('KIOSK_LOW_CONFIDENCE',
        `⚠️ Employee could not be verified at the kiosk (${score}% match with ${best.employee.name}). Manual verification needed.`,
        `/employees/${best.employeeId}`
      );
      return res.json({ tier: 'manual', score, message: 'Verification uncertain. Please visit the manager for manual check-in.' });
    }

    // Tier: high confidence — auto check-in
    const employee = best.employee;
    if (employee.status === 'INACTIVE') {
      return res.json({ tier: 'inactive', score, message: 'Your account is currently inactive. Contact your manager.' });
    }

    const today = localTodayUTC();
    const existing = await prisma.attendanceRecord.findUnique({
      where: { employeeId_date: { employeeId: best.employeeId, date: today } }
    });
    if (existing?.checkInTime) {
      return res.json({ tier: 'already_done', score, employee: { name: employee.name, photoUrl: employee.photoUrl }, message: 'Already checked in today.' });
    }

    const now = new Date();
    const [shiftH, shiftM] = (settings?.shiftStart ?? '09:00').split(':').map(Number);
    const shiftStartMs = new Date(today);
    shiftStartMs.setHours(shiftH!, (shiftM ?? 0) + 5, 0, 0);
    const isLate = now > shiftStartMs;

    const record = await prisma.attendanceRecord.upsert({
      where: { employeeId_date: { employeeId: best.employeeId, date: today } },
      update: { checkInTime: now, status: isLate ? 'LATE' : 'PRESENT', faceMatchScore: score / 100 },
      create: {
        employeeId: best.employeeId, date: today, checkInTime: now,
        status: isLate ? AttendanceStatus.LATE : AttendanceStatus.PRESENT,
        faceMatchScore: score / 100,
      }
    });

    const label = isLate ? 'late' : 'on time';
    await notifyManagers(
      isLate ? 'LATE' : 'CHECK_IN',
      `${isLate ? '⏰' : '✅'} ${employee.name} checked in ${label} via kiosk at ${now.toLocaleTimeString('en-IN')} (${score}% match)`,
      `/employees/${best.employeeId}`
    );

    res.json({
      tier: 'success',
      score,
      employee: { name: employee.name, photoUrl: employee.photoUrl, department: employee.department },
      checkInTime: now.toISOString(),
      isLate,
      record
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

// ─── POST /attendance/kiosk/check-out ────────────────────────────────────────
// Public (no auth). Takes face descriptor, identifies employee via 1-to-N scan.
router.post('/kiosk/check-out', async (req: any, res: any) => {
  try {
    const { descriptor } = req.body;
    if (!descriptor || !Array.isArray(descriptor)) {
      return res.status(400).json({ error: 'Face descriptor is required' });
    }

    const settings = await prisma.companySetting.findFirst();
    const threshold = settings?.faceMatchThreshold ?? 0.60;

    const best = await identifyFace(descriptor);
    if (!best) return res.status(404).json({ tier: 'unknown', error: 'No registered employees found' });

    const score = distanceToScore(best.dist, threshold);

    if (score < 50) {
      await notifyManagers('KIOSK_UNKNOWN',
        `🚨 Unknown person attempted to check out at the kiosk (${score}% best match). Please investigate.`,
        `/attendance`
      );
      return res.json({ tier: 'unknown', score, message: 'Face not recognised. Please contact your manager.' });
    }

    if (score < 80) {
      await notifyManagers('KIOSK_LOW_CONFIDENCE',
        `⚠️ Employee could not be verified at the kiosk for check-out (${score}% match with ${best.employee.name}). Manual verification needed.`,
        `/employees/${best.employeeId}`
      );
      return res.json({ tier: 'manual', score, message: 'Verification uncertain. Please visit the manager for manual check-out.' });
    }

    const employee = best.employee;
    const today = localTodayUTC();
    const existing = await prisma.attendanceRecord.findUnique({
      where: { employeeId_date: { employeeId: best.employeeId, date: today } }
    });

    if (!existing?.checkInTime) {
      return res.json({ tier: 'not_checked_in', score, employee: { name: employee.name, photoUrl: employee.photoUrl }, message: 'You have not checked in today.' });
    }
    if (existing.checkOutTime) {
      return res.json({ tier: 'already_done', score, employee: { name: employee.name, photoUrl: employee.photoUrl }, message: 'Already checked out today.' });
    }

    const now = new Date();
    const hoursWorked = (now.getTime() - existing.checkInTime.getTime()) / (1000 * 60 * 60);
    const halfDayThreshold = settings?.halfDayThresholdHours ?? 4.0;
    const fullDayHours = settings?.fullDayHours ?? 8.0;
    const isHalfDay = hoursWorked >= (halfDayThreshold * 0.7) && hoursWorked < (fullDayHours * 0.75);

    let dailyEarnings = 0;
    if (employee.paymentType === 'HOURLY' && employee.hourlyRate) {
      dailyEarnings = Math.round(hoursWorked * employee.hourlyRate * 100) / 100;
    } else if (employee.paymentType === 'MONTHLY' && employee.baseSalary) {
      const dailyRate = employee.baseSalary / 26;
      dailyEarnings = isHalfDay ? dailyRate / 2 : dailyRate;
      dailyEarnings = Math.round(dailyEarnings * 100) / 100;
    }

    const updated = await prisma.attendanceRecord.update({
      where: { id: existing.id },
      data: { checkOutTime: now, hoursWorked, isHalfDay, dailyEarnings, faceMatchScore: score / 100 }
    });

    await notifyManagers(
      'KIOSK_CHECK_OUT',
      `🏁 ${employee.name} checked out via kiosk — ${hoursWorked.toFixed(1)}h worked. Earnings: ₹${dailyEarnings.toFixed(2)}`,
      `/attendance?addBonusFor=${existing.id}&employeeId=${best.employeeId}`
    );


    res.json({
      tier: 'success',
      score,
      employee: { name: employee.name, photoUrl: employee.photoUrl, department: employee.department },
      checkOutTime: now.toISOString(),
      hoursWorked,
      dailyEarnings,
      isHalfDay,
      record: updated
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

export default router;

