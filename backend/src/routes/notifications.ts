import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import prisma from '../../database/db';

const router = Router();

// Get unread count
router.get('/unread-count', requireAuth, async (req: any, res) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.user.id, isRead: false }
    });
    res.json({ count });
  } catch (error) {
    console.error('Unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

// Get notifications
router.get('/', requireAuth, async (req: any, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(notifications);
  } catch (error) {
    console.error('Fetch notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark all as read
router.post('/read', requireAuth, async (req: any, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Mark read notifications error:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

export default router;

