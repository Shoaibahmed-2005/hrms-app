import { Router } from 'express';
import { requireAuth, requireManager } from '../middleware/auth';
import prisma from '../../database/db';

const router = Router();

// List all announcements (newest first)
router.get('/', requireAuth, async (req, res) => {
  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
      include: { createdBy: { select: { email: true, employee: { select: { name: true } } } } }
    });
    res.json(announcements);
  } catch (error) {
    console.error('Fetch announcements error:', error);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// Create an announcement (manager only)
router.post('/', requireAuth, requireManager, async (req: any, res) => {
  try {
    const { title, body, audience = 'ALL' } = req.body;
    if (!title || !body) {
      return res.status(400).json({ error: 'title and body are required' });
    }
    const announcement = await prisma.announcement.create({
      data: { title, body, audience, createdById: req.user.id }
    });
    res.status(201).json(announcement);
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

export default router;
