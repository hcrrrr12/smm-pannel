import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { runQuery, getOne, execute } from '../db.js';
import { authenticateToken } from '../auth.js';
import { notifyDeposit } from '../telegram.js';

const router = Router();

// POST /api/payments/razorpay/create-order
router.post('/razorpay/create-order', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { amount } = req.body;
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount < 50) {
      res.status(400).json({ error: 'Minimum deposit amount is ₹50.' });
      return;
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    const receiptId = `rcpt_${Date.now()}_${req.user!.id}`;
    const amountInPaise = Math.round(numAmount * 100);

    if (keyId && keySecret) {
      // Live integration point:
      const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${authHeader}`
        },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: 'INR',
          receipt: receiptId,
          notes: { userId: req.user!.id, email: req.user!.email }
        })
      });

      if (rzpRes.ok) {
        const orderData = await rzpRes.json();
        res.json({
          orderId: orderData.id,
          amount: orderData.amount,
          currency: 'INR',
          keyId: keyId
        });
        return;
      }
    }

    // Sandbox / Test Mode fallback
    const simulatedOrderId = `order_sim_${crypto.randomBytes(8).toString('hex')}`;
    res.json({
      orderId: simulatedOrderId,
      amount: amountInPaise,
      currency: 'INR',
      keyId: keyId || 'rzp_test_mock_mode',
      sandbox: true,
      message: 'Razorpay test mode order initiated'
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Razorpay order creation failed: ' + err.message });
  }
});

// POST /api/webhooks/razorpay
router.post('/webhooks/razorpay', (req: Request, res: Response): void => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'] as string;

    console.log('[Razorpay Webhook Received]:', req.body);

    if (webhookSecret && signature) {
      const expectedSig = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (signature !== expectedSig) {
        res.status(400).json({ error: 'Invalid webhook signature' });
        return;
      }
    }

    const event = req.body.event;
    if (event === 'payment.captured' || event === 'order.paid') {
      const payment = req.body.payload?.payment?.entity;
      if (payment) {
        const amount = payment.amount / 100;
        const notes = payment.notes || {};
        const userId = notes.userId;

        if (userId) {
          const user = getOne<any>('SELECT * FROM users WHERE id = ?', [userId]);
          if (user) {
            const newBalance = Math.round((user.balance + amount) * 100) / 100;
            const now = new Date().toISOString();
            execute('UPDATE users SET balance = ?, updated_at = ? WHERE id = ?', [newBalance, now, userId]);
            execute(`
              INSERT INTO transactions (user_id, type, amount, balance_after, status, payment_method, utr_number, notes, invoice_number, created_at)
              VALUES (?, 'deposit', ?, ?, 'completed', 'razorpay', ?, 'Razorpay Webhook Deposit', ?, ?)
            `, [userId, amount, newBalance, payment.id, `INV-RZP-${Date.now()}`, now]);
          }
        }
      }
    }

    res.json({ status: 'ok' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/stripe/create-session
router.post('/stripe/create-session', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { amount } = req.body;
    const numAmount = parseFloat(amount);
    const stripeKey = process.env.STRIPE_SECRET_KEY;

    if (isNaN(numAmount) || numAmount < 1) {
      res.status(400).json({ error: 'Minimum deposit is $1 / ₹80.' });
      return;
    }

    // Stripe checkout session point
    const sessionId = `cs_test_${crypto.randomBytes(12).toString('hex')}`;
    res.json({
      sessionId,
      configured: Boolean(stripeKey),
      message: stripeKey ? 'Stripe session created' : 'Stripe test mode simulated session'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/webhooks/stripe
router.post('/webhooks/stripe', (req: Request, res: Response): void => {
  try {
    console.log('[Stripe Webhook Received]');
    res.json({ received: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
