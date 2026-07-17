import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import prisma from '../../database/db';

const router = Router();

// Get contacts
router.get('/contacts', requireAuth, async (req: any, res) => {
  try {
    if (req.user.role === 'EMPLOYEE') {
      const managers = await prisma.user.findMany({
        where: { role: 'MANAGER' },
        select: { id: true, name: true }
      });
      return res.json(managers.map(m => ({ id: m.id, name: m.name || 'Manager' })));
    }
    
    // For MANAGER
    const employees = await prisma.employee.findMany({
      where: { userId: { not: null } },
      select: { userId: true, name: true }
    });
    return res.json(employees.map(e => ({ id: e.userId, name: e.name })));
  } catch (error) {
    console.error('Fetch chat contacts error:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// Get messages
router.get('/messages', requireAuth, async (req: any, res) => {
  try {
    const peerId = req.query.peerId as string;
    if (!peerId) {
      return res.status(400).json({ error: 'peerId is required' });
    }
    
    const messages = await prisma.chatMessage.findMany({
      where: {
        OR: [
          { senderId: req.user.id, recipientId: peerId },
          { senderId: peerId, recipientId: req.user.id }
        ]
      },
      orderBy: { createdAt: 'asc' }
    });
    
    res.json(messages);
  } catch (error) {
    console.error('Fetch chat messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send message
router.post('/messages', requireAuth, async (req: any, res) => {
  try {
    const { recipientId, body } = req.body;
    
    if (!recipientId || !body) {
      return res.status(400).json({ error: 'recipientId and body are required' });
    }
    
    const message = await prisma.chatMessage.create({
      data: {
        senderId: req.user.id,
        recipientId,
        body
      }
    });
    
    // Create notification for recipient
    await prisma.notification.create({
      data: {
        userId: recipientId,
        title: 'New message',
        body: `You received a new message`,
        type: 'SYSTEM'
      }
    });
    
    res.json(message);
  } catch (error) {
    console.error('Send chat message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router;
