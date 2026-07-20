import { Router } from 'express';
import prisma from '../../database/db';
import { requireAuth, requireManager, AuthRequest } from '../middleware/auth';
import bcrypt from 'bcrypt';

const router = Router();

// ── GET /employees ─────────────────────────────────────────────────────────────
router.get('/', requireAuth, requireManager, async (_req: any, res: any) => {
  try {
    const employees = await prisma.employee.findMany({
      include: {
        _count: { select: { attendanceRecords: true, faceEmbeddings: true } }
      },
      orderBy: { name: 'asc' }
    });
    res.json(employees);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

// ── GET /employees/:id ────────────────────────────────────────────────────────
router.get('/:id', requireAuth, requireManager, async (req: any, res: any) => {
  try {
    const emp = await prisma.employee.findUnique({
      where: { id: req.params.id },
      include: {
        faceEmbeddings: { select: { id: true, createdAt: true } },
        attendanceRecords: {
          orderBy: { date: 'desc' },
          take: 60,
        },
        payrollEntries: {
          include: { payrollPeriod: true },
          orderBy: [{ payrollPeriod: { year: 'desc' } }, { payrollPeriod: { month: 'desc' } }],
          take: 12
        }
      }
    });
    if (!emp) return res.status(404).json({ error: 'Employee not found' });
    res.json(emp);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

// ── POST /employees ────────────────────────────────────────────────────────────
// Registers a new employee (no User account created)
// Accepts optional faceDescriptor (128-float array) to register face on creation
router.post('/', requireAuth, requireManager, async (req: AuthRequest, res: any) => {
  try {
    const {
      name, employeeCode, govtId, address, phone, department,
      designation, dateOfJoining, paymentType, baseSalary, hourlyRate,
      faceDescriptor, photoUrl
    } = req.body;

    if (!name || !employeeCode || !department) {
      return res.status(400).json({ error: 'name, employeeCode, and department are required' });
    }

    // Auto-generate unique code if not provided
    const code = employeeCode || `EMP-${Date.now().toString(36).toUpperCase()}`;
    const avatar = photoUrl || `https://i.pravatar.cc/150?u=${code}`;

    const employee = await prisma.employee.create({
      data: {
        name,
        employeeCode: code,
        govtId: govtId || null,
        address: address || null,
        phone: phone || null,
        department,
        designation: designation || '',
        dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : new Date(),
        paymentType: paymentType || 'MONTHLY',
        baseSalary: paymentType === 'HOURLY' ? null : Number(baseSalary) || null,
        hourlyRate: paymentType === 'HOURLY' ? Number(hourlyRate) || null : null,
        status: 'ACTIVE',
        photoUrl: avatar
      }
    });

    // Register face embedding if provided
    if (faceDescriptor && Array.isArray(faceDescriptor) && faceDescriptor.length === 128) {
      await prisma.faceEmbedding.create({
        data: { employeeId: employee.id, embeddingVector: faceDescriptor }
      });
    }

    res.status(201).json(employee);
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Employee code already exists' });
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

// ── PUT /employees/:id ────────────────────────────────────────────────────────
router.put('/:id', requireAuth, requireManager, async (req: any, res: any) => {
  try {
    const { status, name, phone, address, govtId, department, designation,
            paymentType, baseSalary, hourlyRate, photoUrl } = req.body;

    const updated = await prisma.employee.update({
      where: { id: req.params.id },
      data: {
        ...(status && { status }),
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }),
        ...(govtId !== undefined && { govtId }),
        ...(department && { department }),
        ...(designation !== undefined && { designation }),
        ...(paymentType && { paymentType }),
        ...(baseSalary !== undefined && { baseSalary: baseSalary ? Number(baseSalary) : null }),
        ...(hourlyRate !== undefined && { hourlyRate: hourlyRate ? Number(hourlyRate) : null }),
        ...(photoUrl !== undefined && { photoUrl }),
      }
    });
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

// ── POST /employees/:id/register-face ─────────────────────────────────────────
router.post('/:id/register-face', requireAuth, requireManager, async (req: any, res: any) => {
  try {
    const { descriptor } = req.body;
    if (!descriptor || !Array.isArray(descriptor) || descriptor.length !== 128) {
      return res.status(400).json({ error: 'Invalid face descriptor. Expected 128-element array.' });
    }
    // Delete old and save fresh
    await prisma.faceEmbedding.deleteMany({ where: { employeeId: req.params.id } });
    await prisma.faceEmbedding.create({
      data: { employeeId: req.params.id, embeddingVector: descriptor }
    });
    res.json({ message: 'Face registered successfully' });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

export default router;
