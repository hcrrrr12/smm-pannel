import { Router, Request, Response } from 'express';
import { runQuery, getOne, execute } from '../db.js';
import { authenticateToken, requireAdmin } from '../auth.js';

const router = Router();

// POST /api/coupons/validate - Validate coupon for order
router.post('/validate', authenticateToken, (req: Request, res: Response): void => {
  try {
    const { code, amount } = req.body;

    if (!code || typeof code !== 'string') {
      res.status(400).json({ valid: false, error: 'Coupon code is required.' });
      return;
    }

    const orderAmount = parseFloat(amount || '0');
    const cleanCode = code.trim().toUpperCase();

    const coupon = getOne<any>('SELECT * FROM coupons WHERE code = ? AND status = "active"', [cleanCode]);
    if (!coupon) {
      res.status(404).json({ valid: false, error: 'Invalid or expired coupon code.' });
      return;
    }

    const now = new Date();
    if (coupon.expires_at && new Date(coupon.expires_at) < now) {
      res.status(400).json({ valid: false, error: 'This coupon has expired.' });
      return;
    }

    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
      res.status(400).json({ valid: false, error: 'This coupon has reached its maximum usage limit.' });
      return;
    }

    if (orderAmount < coupon.min_order_amount) {
      res.status(400).json({
        valid: false,
        error: `Minimum order amount to use this coupon is ₹${coupon.min_order_amount.toFixed(2)}.`
      });
      return;
    }

    let discount = 0;
    if (coupon.discount_type === 'percentage') {
      discount = (orderAmount * coupon.discount_value) / 100;
      if (coupon.max_discount && discount > coupon.max_discount) {
        discount = coupon.max_discount;
      }
    } else {
      discount = coupon.discount_value;
    }

    discount = Math.min(discount, orderAmount);
    discount = Math.round(discount * 100) / 100;

    res.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discount_type,
        discountValue: coupon.discount_value,
        calculatedDiscount: discount,
        finalAmount: Math.max(0, Math.round((orderAmount - discount) * 100) / 100)
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/coupons/admin/all
router.get('/admin/all', authenticateToken, requireAdmin, (req: Request, res: Response): void => {
  try {
    const coupons = runQuery<any>('SELECT * FROM coupons ORDER BY id DESC');
    res.json({ coupons });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/coupons/admin
router.post('/admin', authenticateToken, requireAdmin, (req: Request, res: Response): void => {
  try {
    const { code, discount_type, discount_value, min_order_amount, max_discount, max_uses, expires_at } = req.body;

    if (!code || !discount_value) {
      res.status(400).json({ error: 'Code and discount value are required.' });
      return;
    }

    const cleanCode = code.trim().toUpperCase();
    const existing = getOne('SELECT id FROM coupons WHERE code = ?', [cleanCode]);
    if (existing) {
      res.status(409).json({ error: 'A coupon with this code already exists.' });
      return;
    }

    const now = new Date().toISOString();
    const { lastInsertRowid } = execute(`
      INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, max_discount, max_uses, used_count, expires_at, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?, 'active', ?)
    `, [
      cleanCode,
      discount_type || 'percentage',
      parseFloat(discount_value),
      parseFloat(min_order_amount || '0'),
      max_discount ? parseFloat(max_discount) : null,
      parseInt(max_uses || '100'),
      expires_at || null,
      now
    ]);

    res.status(201).json({ message: 'Coupon created successfully', couponId: lastInsertRowid });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/coupons/admin/:id
router.delete('/admin/:id', authenticateToken, requireAdmin, (req: Request, res: Response): void => {
  try {
    const id = parseInt(req.params.id);
    execute('DELETE FROM coupons WHERE id = ?', [id]);
    res.json({ message: 'Coupon deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
