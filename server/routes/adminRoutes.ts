import { Router, Request, Response } from 'express';
import { runQuery, getOne, execute } from '../db.js';
import { authenticateToken, requireAdmin } from '../auth.js';
import { sendTelegramNotification } from '../telegram.js';

const router = Router();

// GET /api/admin/stats - KPI Dashboard Metrics
router.get('/stats', authenticateToken, requireAdmin, (req: Request, res: Response): void => {
  try {
    const totalOrders = getOne<{ count: number }>('SELECT count(*) as count FROM orders')?.count || 0;
    const pendingOrders = getOne<{ count: number }>('SELECT count(*) as count FROM orders WHERE status IN ("pending", "processing", "in_progress")')?.count || 0;
    const completedOrders = getOne<{ count: number }>('SELECT count(*) as count FROM orders WHERE status = "completed"')?.count || 0;
    const cancelledOrders = getOne<{ count: number }>('SELECT count(*) as count FROM orders WHERE status IN ("cancelled", "refunded")')?.count || 0;

    const totalRevenue = getOne<{ sum: number }>('SELECT sum(charge) as sum FROM orders WHERE status != "refunded" AND status != "cancelled"')?.sum || 0;
    const totalUsers = getOne<{ count: number }>('SELECT count(*) as count FROM users WHERE role = "user"')?.count || 0;
    const totalUserBalance = getOne<{ sum: number }>('SELECT sum(balance) as sum FROM users WHERE role = "user"')?.sum || 0;
    
    const pendingDeposits = getOne<{ count: number }>('SELECT count(*) as count FROM transactions WHERE type = "deposit" AND status = "pending"')?.count || 0;
    const openTickets = getOne<{ count: number }>('SELECT count(*) as count FROM tickets WHERE status = "open"')?.count || 0;

    // Recent 7 days sales stats
    const recentOrders = runQuery<any>(`
      SELECT date(created_at) as date, count(*) as count, sum(charge) as total
      FROM orders
      WHERE status NOT IN ("cancelled", "refunded")
      GROUP BY date(created_at)
      ORDER BY date(created_at) DESC
      LIMIT 7
    `);

    // Top services
    const topServices = runQuery<any>(`
      SELECT s.name, c.name as category_name, count(o.id) as order_count, sum(o.charge) as total_revenue
      FROM orders o
      JOIN services s ON o.service_id = s.id
      JOIN categories c ON s.category_id = c.id
      GROUP BY s.id
      ORDER BY order_count DESC
      LIMIT 5
    `);

    res.json({
      metrics: {
        totalOrders,
        pendingOrders,
        completedOrders,
        cancelledOrders,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalUsers,
        totalUserBalance: Math.round(totalUserBalance * 100) / 100,
        pendingDeposits,
        openTickets
      },
      recentOrders,
      topServices
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/users - User directory
router.get('/users', authenticateToken, requireAdmin, (req: Request, res: Response): void => {
  try {
    const { search, role, status, limit = 100, offset = 0 } = req.query;

    let sql = 'SELECT id, name, email, role, balance, spent, api_key, status, phone, created_at FROM users WHERE 1=1';
    const params: any[] = [];

    if (role && role !== 'all') {
      sql += ' AND role = ?';
      params.push(role);
    }

    if (status && status !== 'all') {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (search && typeof search === 'string') {
      sql += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ? OR CAST(id AS TEXT) LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit as string), parseInt(offset as string));

    const users = runQuery<any>(sql, params);
    const countRow = getOne<{ total: number }>('SELECT count(*) as total FROM users');

    res.json({
      users,
      total: countRow?.total || 0
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/users/:id/status - Toggle user status or role
router.patch('/users/:id/status', authenticateToken, requireAdmin, (req: Request, res: Response): void => {
  try {
    const userId = parseInt(req.params.id);
    const { status, role } = req.body;

    const user = getOne<any>('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const newStatus = status || user.status;
    const newRole = role || user.role;
    const now = new Date().toISOString();

    execute('UPDATE users SET status = ?, role = ?, updated_at = ? WHERE id = ?', [newStatus, newRole, now, userId]);

    res.json({ message: `User #${userId} updated successfully.`, user: { id: userId, status: newStatus, role: newRole } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/settings - System settings
router.get('/settings', authenticateToken, requireAdmin, (req: Request, res: Response): void => {
  try {
    const settings = runQuery<any>('SELECT * FROM settings');
    const settingsMap: Record<string, string> = {};
    settings.forEach(s => {
      settingsMap[s.key] = s.value;
    });

    res.json({ settings: settingsMap, list: settings });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/settings - Update system settings
router.post('/settings', authenticateToken, requireAdmin, (req: Request, res: Response): void => {
  try {
    const { settings } = req.body; // Key-value object
    if (!settings || typeof settings !== 'object') {
      res.status(400).json({ error: 'Settings object is required.' });
      return;
    }

    const now = new Date().toISOString();
    for (const [key, value] of Object.entries(settings)) {
      const exists = getOne('SELECT key FROM settings WHERE key = ?', [key]);
      if (exists) {
        execute('UPDATE settings SET value = ?, updated_at = ? WHERE key = ?', [String(value), now, key]);
      } else {
        execute('INSERT INTO settings (key, value, description, updated_at) VALUES (?, ?, ?, ?)', [key, String(value), 'Custom setting', now]);
      }
    }

    res.json({ message: 'Settings saved successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/telegram/test - Send test Telegram notification
router.post('/telegram/test', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const testMsg = `🔔 <b>SocialWave SMM Panel - Telegram Integration Test</b>\n` +
      `✅ Bot integration is connected and functioning properly.\n` +
      `🕒 <b>Timestamp:</b> ${new Date().toLocaleString()}\n` +
      `👨‍💻 <b>Admin:</b> ${req.user!.name} (${req.user!.email})`;

    const result = await sendTelegramNotification(testMsg);
    if (!result.success) {
      res.json({
        success: false,
        message: 'Notification simulated in server logs (Bot Token or Chat ID not configured for live delivery)',
        detail: result.error
      });
      return;
    }

    res.json({
      success: true,
      message: 'Test message dispatched to Telegram successfully!'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
