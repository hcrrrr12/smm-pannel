import { Router, Request, Response } from 'express';
import { runQuery, getOne, execute } from '../db.js';
import { authenticateToken, requireAdmin } from '../auth.js';

const router = Router();

// GET /api/tickets - User's support tickets
router.get('/', authenticateToken, (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const tickets = runQuery<any>(`
      SELECT t.*, COUNT(m.id) as message_count
      FROM tickets t
      LEFT JOIN ticket_messages m ON t.id = m.ticket_id
      WHERE t.user_id = ?
      GROUP BY t.id
      ORDER BY t.id DESC
    `, [userId]);

    res.json({ tickets });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tickets - Create new support ticket
router.post('/', authenticateToken, (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const { subject, order_id, priority, message } = req.body;

    if (!subject || !message) {
      res.status(400).json({ error: 'Subject and message are required.' });
      return;
    }

    const now = new Date().toISOString();
    const { lastInsertRowid: ticketId } = execute(`
      INSERT INTO tickets (user_id, subject, order_id, priority, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'open', ?, ?)
    `, [userId, subject.trim(), order_id ? parseInt(order_id) : null, priority || 'medium', now, now]);

    // Insert first message
    execute(`
      INSERT INTO ticket_messages (ticket_id, sender_id, sender_role, message, created_at)
      VALUES (?, ?, 'user', ?, ?)
    `, [ticketId, userId, message.trim(), now]);

    res.status(201).json({ message: 'Ticket created successfully', ticketId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tickets/:id - Get ticket messages
router.get('/:id', authenticateToken, (req: Request, res: Response): void => {
  try {
    const ticketId = parseInt(req.params.id);
    const userId = req.user!.id;
    const isAdmin = req.user!.role === 'admin';

    let ticketQuery = 'SELECT t.*, u.name as user_name, u.email as user_email FROM tickets t JOIN users u ON t.user_id = u.id WHERE t.id = ?';
    const params: any[] = [ticketId];

    if (!isAdmin) {
      ticketQuery += ' AND t.user_id = ?';
      params.push(userId);
    }

    const ticket = getOne<any>(ticketQuery, params);
    if (!ticket) {
      res.status(404).json({ error: 'Ticket not found.' });
      return;
    }

    const messages = runQuery<any>(`
      SELECT m.*, u.name as sender_name
      FROM ticket_messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.ticket_id = ?
      ORDER BY m.id ASC
    `, [ticketId]);

    res.json({ ticket, messages });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tickets/:id/reply - Add message to ticket
router.post('/:id/reply', authenticateToken, (req: Request, res: Response): void => {
  try {
    const ticketId = parseInt(req.params.id);
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const { message } = req.body;

    if (!message || !message.trim()) {
      res.status(400).json({ error: 'Message cannot be empty.' });
      return;
    }

    const ticket = getOne<any>('SELECT * FROM tickets WHERE id = ?', [ticketId]);
    if (!ticket) {
      res.status(404).json({ error: 'Ticket not found.' });
      return;
    }

    if (userRole !== 'admin' && ticket.user_id !== userId) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }

    const now = new Date().toISOString();
    const newStatus = userRole === 'admin' ? 'answered' : 'open';

    execute(`
      INSERT INTO ticket_messages (ticket_id, sender_id, sender_role, message, created_at)
      VALUES (?, ?, ?, ?, ?)
    `, [ticketId, userId, userRole, message.trim(), now]);

    execute('UPDATE tickets SET status = ?, updated_at = ? WHERE id = ?', [newStatus, now, ticketId]);

    res.json({ message: 'Reply sent successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tickets/admin/all - Admin ticket list
router.get('/admin/all', authenticateToken, requireAdmin, (req: Request, res: Response): void => {
  try {
    const tickets = runQuery<any>(`
      SELECT t.*, u.name as user_name, u.email as user_email, COUNT(m.id) as message_count
      FROM tickets t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN ticket_messages m ON t.id = m.ticket_id
      GROUP BY t.id
      ORDER BY t.id DESC
    `);
    res.json({ tickets });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
