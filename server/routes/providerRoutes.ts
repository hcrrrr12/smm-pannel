import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { runQuery, getOne, execute } from '../db.js';
import { authenticateToken, requireAdmin } from '../auth.js';
import { notifyNewOrder } from '../telegram.js';

const router = Router();

// Standard SMM API v2 endpoint (Public API for resellers & API clients)
// POST /api/v2
router.post('/v2', async (req: Request, res: Response): Promise<void> => {
  try {
    const { key, action } = req.body;

    if (!key) {
      res.status(401).json({ error: 'Incorrect request. "key" parameter is required.' });
      return;
    }

    const user = getOne<any>('SELECT * FROM users WHERE api_key = ?', [key]);
    if (!user) {
      res.status(401).json({ error: 'Invalid API key.' });
      return;
    }

    if (user.status !== 'active') {
      res.status(403).json({ error: 'Account suspended.' });
      return;
    }

    // Action: balance
    if (action === 'balance') {
      res.json({
        balance: user.balance.toFixed(2),
        currency: 'INR'
      });
      return;
    }

    // Action: services
    if (action === 'services') {
      const services = runQuery<any>(`
        SELECT s.id as service, s.name, s.type, c.name as category, s.rate_per_1000 as rate, s.min_qty as min, s.max_qty as max, s.drip_feed_enabled as dripfeed
        FROM services s
        JOIN categories c ON s.category_id = c.id
        WHERE s.status = 'active'
        ORDER BY s.id ASC
      `);
      res.json(services.map(s => ({
        ...s,
        dripfeed: Boolean(s.dripfeed)
      })));
      return;
    }

    // Action: add (Create order)
    if (action === 'add') {
      const { service, link, quantity, comments } = req.body;
      if (!service || !link || !quantity) {
        res.status(400).json({ error: 'Missing required parameters (service, link, quantity).' });
        return;
      }

      const qty = parseInt(quantity);
      const targetService = getOne<any>('SELECT * FROM services WHERE id = ? AND status = "active"', [service]);
      if (!targetService) {
        res.status(400).json({ error: 'Invalid service ID.' });
        return;
      }

      if (qty < targetService.min_qty || qty > targetService.max_qty) {
        res.status(400).json({ error: `Quantity must be between ${targetService.min_qty} and ${targetService.max_qty}.` });
        return;
      }

      const charge = Math.round(((qty / 1000) * targetService.rate_per_1000) * 100) / 100;
      if (user.balance < charge) {
        res.status(400).json({ error: 'Not enough funds on balance.' });
        return;
      }

      const now = new Date().toISOString();
      const invoiceNumber = `INV-API-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
      const newBalance = Math.round((user.balance - charge) * 100) / 100;
      const newSpent = Math.round((user.spent + charge) * 100) / 100;

      execute('UPDATE users SET balance = ?, spent = ?, updated_at = ? WHERE id = ?', [newBalance, newSpent, now, user.id]);

      const { lastInsertRowid: orderId } = execute(`
        INSERT INTO orders (user_id, service_id, link, quantity, charge, original_rate, custom_comments, status, start_count, remains, invoice_number, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?, ?, ?, ?)
      `, [user.id, service, link.trim(), qty, charge, targetService.rate_per_1000, comments || null, qty, invoiceNumber, now, now]);

      execute(`
        INSERT INTO transactions (user_id, type, amount, balance_after, status, payment_method, notes, invoice_number, created_at)
        VALUES (?, 'order_debit', ?, ?, 'completed', 'wallet', ?, ?, ?)
      `, [user.id, -charge, newBalance, `API Order #${orderId} - ${targetService.name}`, invoiceNumber, now]);

      const createdOrder = getOne<any>('SELECT * FROM orders WHERE id = ?', [orderId]);
      try {
        notifyNewOrder(createdOrder, user, targetService);
      } catch (e) {}

      res.json({ order: orderId });
      return;
    }

    // Action: status
    if (action === 'status') {
      const { order, orders } = req.body;

      if (orders && typeof orders === 'string') {
        const orderIds = orders.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
        if (orderIds.length === 0) {
          res.status(400).json({ error: 'No valid order IDs provided.' });
          return;
        }
        const placeholders = orderIds.map(() => '?').join(',');
        const foundOrders = runQuery<any>(`SELECT id, status, charge, start_count, remains FROM orders WHERE user_id = ? AND id IN (${placeholders})`, [user.id, ...orderIds]);
        
        const result: Record<string, any> = {};
        for (const id of orderIds) {
          const match = foundOrders.find(o => o.id === id);
          if (match) {
            result[id.toString()] = {
              charge: match.charge.toFixed(2),
              start_count: match.start_count?.toString() || '0',
              status: match.status.toUpperCase(),
              remains: match.remains?.toString() || '0',
              currency: 'INR'
            };
          } else {
            result[id.toString()] = { error: 'Incorrect order ID' };
          }
        }
        res.json(result);
        return;
      }

      if (order) {
        const singleOrder = getOne<any>('SELECT * FROM orders WHERE id = ? AND user_id = ?', [order, user.id]);
        if (!singleOrder) {
          res.status(400).json({ error: 'Incorrect order ID.' });
          return;
        }

        res.json({
          charge: singleOrder.charge.toFixed(2),
          start_count: singleOrder.start_count?.toString() || '0',
          status: singleOrder.status.toUpperCase(),
          remains: singleOrder.remains?.toString() || '0',
          currency: 'INR'
        });
        return;
      }

      res.status(400).json({ error: 'Missing "order" or "orders" parameter.' });
      return;
    }

    res.status(400).json({ error: `Unknown action "${action}". Valid actions are: balance, services, add, status.` });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal API error: ' + err.message });
  }
});

// Admin Provider Endpoints
// GET /api/admin/providers
router.get('/admin/providers', authenticateToken, requireAdmin, (req: Request, res: Response): void => {
  try {
    const providers = runQuery<any>('SELECT * FROM providers ORDER BY id DESC');
    res.json({ providers });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/providers
router.post('/admin/providers', authenticateToken, requireAdmin, (req: Request, res: Response): void => {
  try {
    const { name, api_url, api_key, currency } = req.body;
    if (!name || !api_url || !api_key) {
      res.status(400).json({ error: 'Name, API URL, and API Key are required.' });
      return;
    }

    const now = new Date().toISOString();
    const { lastInsertRowid } = execute(`
      INSERT INTO providers (name, api_url, api_key, balance, currency, status, created_at)
      VALUES (?, ?, ?, 0.0, ?, 'active', ?)
    `, [name.trim(), api_url.trim(), api_key.trim(), currency || 'USD', now]);

    res.status(201).json({ message: 'Provider created successfully', providerId: lastInsertRowid });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
