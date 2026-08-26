import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { runQuery, getOne, execute } from '../db.js';
import { authenticateToken, requireAdmin, createRateLimiter } from '../auth.js';
import { notifyNewOrder, notifyOrderStatusChange } from '../telegram.js';

const router = Router();
const orderLimiter = createRateLimiter(30, 60000);

// Helper to generate unique Invoice Number
function generateInvoiceNumber(prefix = 'INV-ORD'): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${dateStr}-${random}`;
}

// POST /api/orders - Create Order
router.post('/', authenticateToken, orderLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { service_id, link, quantity, coupon_code, custom_comments } = req.body;

    if (!service_id || !link || !quantity) {
      res.status(400).json({ error: 'Service, target link, and quantity are required.' });
      return;
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      res.status(400).json({ error: 'Quantity must be a positive number.' });
      return;
    }

    // Get service details
    const service = getOne<any>('SELECT * FROM services WHERE id = ? AND status = "active"', [service_id]);
    if (!service) {
      res.status(404).json({ error: 'Selected service is unavailable or inactive.' });
      return;
    }

    if (qty < service.min_qty || qty > service.max_qty) {
      res.status(400).json({
        error: `Quantity must be between ${service.min_qty.toLocaleString()} and ${service.max_qty.toLocaleString()} for this service.`
      });
      return;
    }

    // Calculate base charge (rate_per_1000)
    let baseCharge = (qty / 1000) * service.rate_per_1000;
    baseCharge = Math.round(baseCharge * 100) / 100; // Round to 2 decimal places

    let discountAmount = 0.0;
    let couponId: number | null = null;

    // Process coupon if provided
    if (coupon_code && typeof coupon_code === 'string' && coupon_code.trim()) {
      const codeClean = coupon_code.trim().toUpperCase();
      const coupon = getOne<any>(
        'SELECT * FROM coupons WHERE code = ? AND status = "active"',
        [codeClean]
      );

      if (coupon) {
        const now = new Date();
        const isExpired = coupon.expires_at && new Date(coupon.expires_at) < now;
        const isLimitReached = coupon.max_uses && coupon.used_count >= coupon.max_uses;
        const isMinMet = baseCharge >= coupon.min_order_amount;

        if (!isExpired && !isLimitReached && isMinMet) {
          couponId = coupon.id;
          if (coupon.discount_type === 'percentage') {
            discountAmount = (baseCharge * coupon.discount_value) / 100;
            if (coupon.max_discount && discountAmount > coupon.max_discount) {
              discountAmount = coupon.max_discount;
            }
          } else {
            discountAmount = coupon.discount_value;
          }
          discountAmount = Math.min(discountAmount, baseCharge);
          discountAmount = Math.round(discountAmount * 100) / 100;

          // Increment coupon used count
          execute('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?', [coupon.id]);
        }
      }
    }

    const finalCharge = Math.max(0, Math.round((baseCharge - discountAmount) * 100) / 100);

    // Check user balance
    const user = getOne<any>('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      res.status(404).json({ error: 'User account not found.' });
      return;
    }

    if (user.balance < finalCharge) {
      res.status(400).json({
        error: `Insufficient wallet balance. Total cost is ₹${finalCharge.toFixed(2)}, but your current balance is ₹${user.balance.toFixed(2)}. Please add funds.`,
        requiredAmount: finalCharge,
        currentBalance: user.balance,
        shortfall: finalCharge - user.balance
      });
      return;
    }

    const now = new Date().toISOString();
    const invoiceNumber = generateInvoiceNumber('INV-ORD');
    const newBalance = Math.round((user.balance - finalCharge) * 100) / 100;
    const newSpent = Math.round((user.spent + finalCharge) * 100) / 100;

    // Deduct balance and update user
    execute('UPDATE users SET balance = ?, spent = ?, updated_at = ? WHERE id = ?', [
      newBalance,
      newSpent,
      now,
      userId
    ]);

    // Insert Order
    const { lastInsertRowid: orderId } = execute(`
      INSERT INTO orders (
        user_id, service_id, link, quantity, charge, original_rate, coupon_id,
        discount_amount, custom_comments, status, start_count, remains, invoice_number, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?, ?, ?, ?)
    `, [
      userId,
      service_id,
      link.trim(),
      qty,
      finalCharge,
      service.rate_per_1000,
      couponId,
      discountAmount,
      custom_comments || null,
      qty,
      invoiceNumber,
      now,
      now
    ]);

    // Insert Transaction Ledger Entry
    execute(`
      INSERT INTO transactions (user_id, type, amount, balance_after, status, payment_method, notes, invoice_number, created_at)
      VALUES (?, 'order_debit', ?, ?, 'completed', 'wallet', ?, ?, ?)
    `, [
      userId,
      -finalCharge,
      newBalance,
      `Order #${orderId} - ${service.name} (Qty: ${qty.toLocaleString()})`,
      invoiceNumber,
      now
    ]);

    const createdOrder = getOne<any>('SELECT * FROM orders WHERE id = ?', [orderId]);

    // Trigger Telegram notification
    try {
      notifyNewOrder(createdOrder, user, service);
    } catch (e) {
      console.error('Telegram trigger notice:', e);
    }

    res.status(201).json({
      message: 'Order placed successfully!',
      order: createdOrder,
      newBalance: newBalance,
      invoiceNumber: invoiceNumber
    });
  } catch (err: any) {
    console.error('Order creation error:', err);
    res.status(500).json({ error: 'Failed to create order: ' + err.message });
  }
});

// GET /api/orders - Get user orders
router.get('/', authenticateToken, (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const { status, search, limit = 50, offset = 0 } = req.query;

    let sql = `
      SELECT o.*, s.name as service_name, s.type as service_type, c.name as category_name, c.icon as category_icon
      FROM orders o
      JOIN services s ON o.service_id = s.id
      JOIN categories c ON s.category_id = c.id
      WHERE o.user_id = ?
    `;
    const params: any[] = [userId];

    if (status && status !== 'all') {
      sql += ' AND o.status = ?';
      params.push(status);
    }

    if (search && typeof search === 'string') {
      sql += ' AND (o.link LIKE ? OR s.name LIKE ? OR o.invoice_number LIKE ? OR CAST(o.id AS TEXT) LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    sql += ' ORDER BY o.id DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit as string), parseInt(offset as string));

    const orders = runQuery<any>(sql, params);
    const countRow = getOne<{ total: number }>('SELECT count(*) as total FROM orders WHERE user_id = ?', [userId]);

    res.json({
      orders,
      total: countRow?.total || 0
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders/:id/invoice - Full printable invoice details
router.get('/:id/invoice', authenticateToken, (req: Request, res: Response): void => {
  try {
    const orderId = parseInt(req.params.id);
    const userId = req.user!.id;
    const isAdmin = req.user!.role === 'admin';

    let orderQuery = `
      SELECT o.*, s.name as service_name, s.type as service_type, s.rate_per_1000,
             c.name as category_name, u.name as customer_name, u.email as customer_email, u.phone as customer_phone
      FROM orders o
      JOIN services s ON o.service_id = s.id
      JOIN categories c ON s.category_id = c.id
      JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
    `;
    const orderParams: any[] = [orderId];

    if (!isAdmin) {
      orderQuery += ' AND o.user_id = ?';
      orderParams.push(userId);
    }

    const order = getOne<any>(orderQuery, orderParams);
    if (!order) {
      res.status(404).json({ error: 'Invoice / Order not found' });
      return;
    }

    const invoiceData = {
      invoiceNumber: order.invoice_number,
      orderId: order.id,
      date: order.created_at,
      status: order.status,
      customer: {
        name: order.customer_name,
        email: order.customer_email,
        phone: order.customer_phone || 'N/A'
      },
      seller: {
        company: 'SocialWave SMM Services Inc.',
        email: 'kritanchettri32@gmail.com',
        phone: '+91 8918145186',
        upiId: '8918145816@fam',
        website: 'https://socialwave-smm.com'
      },
      items: [
        {
          description: `${order.category_name} - ${order.service_name}`,
          link: order.link,
          quantity: order.quantity,
          ratePer1000: order.original_rate,
          amount: (order.quantity / 1000) * order.original_rate
        }
      ],
      subtotal: (order.quantity / 1000) * order.original_rate,
      discount: order.discount_amount,
      tax: 0.0,
      total: order.charge,
      currency: 'INR',
      currencySymbol: '₹'
    };

    res.json({ invoice: invoiceData });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/orders - Admin order management
router.get('/admin/all', authenticateToken, requireAdmin, (req: Request, res: Response): void => {
  try {
    const { status, search, limit = 100, offset = 0 } = req.query;

    let sql = `
      SELECT o.*, s.name as service_name, c.name as category_name, u.name as user_name, u.email as user_email
      FROM orders o
      JOIN services s ON o.service_id = s.id
      JOIN categories c ON s.category_id = c.id
      JOIN users u ON o.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status && status !== 'all') {
      sql += ' AND o.status = ?';
      params.push(status);
    }

    if (search && typeof search === 'string') {
      sql += ' AND (o.link LIKE ? OR s.name LIKE ? OR u.email LIKE ? OR u.name LIKE ? OR o.invoice_number LIKE ? OR CAST(o.id AS TEXT) LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term, term, term);
    }

    sql += ' ORDER BY o.id DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit as string), parseInt(offset as string));

    const orders = runQuery<any>(sql, params);
    const countRow = getOne<{ total: number }>('SELECT count(*) as total FROM orders');

    res.json({
      orders,
      total: countRow?.total || 0
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/orders/:id/status - Update order status (with auto-refund workflow)
router.patch('/admin/:id/status', authenticateToken, requireAdmin, (req: Request, res: Response): void => {
  try {
    const orderId = parseInt(req.params.id);
    const { status, start_count, remains, reason } = req.body;

    const validStatuses = ['pending', 'processing', 'in_progress', 'completed', 'partial', 'cancelled', 'refunded'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      return;
    }

    const order = getOne<any>('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const oldStatus = order.status;
    const now = new Date().toISOString();

    // Check if transitioning to Cancelled or Refunded from an unrefunded state
    const isRefundTrigger = (status === 'cancelled' || status === 'refunded') && (oldStatus !== 'cancelled' && oldStatus !== 'refunded');

    if (isRefundTrigger && order.charge > 0) {
      const user = getOne<any>('SELECT * FROM users WHERE id = ?', [order.user_id]);
      if (user) {
        const refundAmount = order.charge;
        const newBalance = Math.round((user.balance + refundAmount) * 100) / 100;
        const newSpent = Math.max(0, Math.round((user.spent - refundAmount) * 100) / 100);

        // Credit user wallet
        execute('UPDATE users SET balance = ?, spent = ?, updated_at = ? WHERE id = ?', [
          newBalance,
          newSpent,
          now,
          order.user_id
        ]);

        // Insert Refund Transaction Ledger
        execute(`
          INSERT INTO transactions (user_id, type, amount, balance_after, status, payment_method, notes, invoice_number, created_at)
          VALUES (?, 'refund', ?, ?, 'completed', 'wallet', ?, ?, ?)
        `, [
          order.user_id,
          refundAmount,
          newBalance,
          `Refund for Order #${order.id} (${status.toUpperCase()}) - ${reason || 'Admin status change'}`,
          order.invoice_number,
          now
        ]);
      }
    }

    // Update order
    execute(`
      UPDATE orders
      SET status = ?, start_count = COALESCE(?, start_count), remains = COALESCE(?, remains), updated_at = ?
      WHERE id = ?
    `, [
      status,
      start_count !== undefined ? parseInt(start_count) : null,
      remains !== undefined ? parseInt(remains) : null,
      now,
      orderId
    ]);

    // Send Telegram alert
    try {
      notifyOrderStatusChange(order, oldStatus, status);
    } catch (e) {}

    res.json({
      message: `Order #${orderId} status updated to ${status}${isRefundTrigger ? ' and ₹' + order.charge.toFixed(2) + ' was refunded to customer wallet.' : ''}`,
      orderId,
      status
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
