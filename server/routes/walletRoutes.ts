import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { runQuery, getOne, execute } from '../db.js';
import { authenticateToken, requireAdmin } from '../auth.js';
import { generateUpiQr } from '../upi.js';
import { notifyDeposit } from '../telegram.js';

const router = Router();

function generateInvoiceNumber(prefix = 'INV-DEP'): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${dateStr}-${random}`;
}

// POST /api/wallet/upi-qr - Generate Dynamic UPI QR for specified amount
router.post('/upi-qr', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { amount, note } = req.body;
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      res.status(400).json({ error: 'Valid amount is required (e.g. 50, 500, 1000).' });
      return;
    }

    const minSetting = getOne<{ value: string }>('SELECT value FROM settings WHERE key = "min_deposit_inr"');
    const minDeposit = parseFloat(minSetting?.value || '50');

    if (numAmount < minDeposit) {
      res.status(400).json({ error: `Minimum deposit amount is ₹${minDeposit.toFixed(2)}.` });
      return;
    }

    const orderNote = note || `Add Funds - User #${req.user!.id} - ${req.user!.email}`;
    const qrDetails = await generateUpiQr(numAmount, orderNote);

    res.json({
      success: true,
      qr: qrDetails,
      suggestedUtrFormat: '12-digit UPI reference ID (UTR)',
      supportContact: {
        email: 'kritanchettri32@gmail.com',
        phone: '+91 8918145186',
        upiId: '8918145816@fam'
      }
    });
  } catch (err: any) {
    console.error('Error generating UPI QR:', err);
    res.status(500).json({ error: 'Failed to generate dynamic UPI QR: ' + err.message });
  }
});

// POST /api/wallet/deposit/manual-upi - Submit UTR for verification
router.post('/deposit/manual-upi', authenticateToken, (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const { amount, utr_number, notes } = req.body;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      res.status(400).json({ error: 'Please enter a valid deposit amount.' });
      return;
    }

    if (!utr_number || typeof utr_number !== 'string' || utr_number.trim().length < 6) {
      res.status(400).json({ error: 'Please enter a valid 12-digit UPI UTR / Transaction Reference Number.' });
      return;
    }

    const cleanUtr = utr_number.trim().toUpperCase();

    // Check if UTR already submitted
    const existing = getOne('SELECT id FROM transactions WHERE utr_number = ?', [cleanUtr]);
    if (existing) {
      res.status(409).json({ error: 'This UTR / Transaction ID has already been submitted.' });
      return;
    }

    const user = getOne<any>('SELECT balance, name, email FROM users WHERE id = ?', [userId]);
    const now = new Date().toISOString();
    const invoiceNumber = generateInvoiceNumber('INV-DEP');

    const { lastInsertRowid: txId } = execute(`
      INSERT INTO transactions (user_id, type, amount, balance_after, status, payment_method, utr_number, notes, invoice_number, created_at)
      VALUES (?, 'deposit', ?, ?, 'pending', 'upi_qr', ?, ?, ?, ?)
    `, [
      userId,
      numAmount,
      user.balance, // will be updated upon admin/auto approval
      cleanUtr,
      notes || `UPI QR Deposit (Pending verification): ${cleanUtr}`,
      invoiceNumber,
      now
    ]);

    const tx = getOne<any>('SELECT * FROM transactions WHERE id = ?', [txId]);
    notifyDeposit(tx, user);

    res.status(201).json({
      message: 'Deposit request submitted successfully! Your funds will be credited as soon as the transaction is verified (usually within 2-5 minutes).',
      transaction: tx
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/wallet/deposit/instant-test - Instant sandbox credit for rapid demo testing
router.post('/deposit/instant-test', authenticateToken, (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const { amount } = req.body;
    const numAmount = parseFloat(amount || '500');

    if (isNaN(numAmount) || numAmount <= 0) {
      res.status(400).json({ error: 'Invalid amount.' });
      return;
    }

    const user = getOne<any>('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const newBalance = Math.round((user.balance + numAmount) * 100) / 100;
    const now = new Date().toISOString();
    const mockUtr = 'DEMO_' + crypto.randomBytes(4).toString('hex').toUpperCase();
    const invoiceNumber = generateInvoiceNumber('INV-DEP');

    execute('UPDATE users SET balance = ?, updated_at = ? WHERE id = ?', [newBalance, now, userId]);

    execute(`
      INSERT INTO transactions (user_id, type, amount, balance_after, status, payment_method, utr_number, notes, invoice_number, created_at)
      VALUES (?, 'deposit', ?, ?, 'completed', 'upi_qr', ?, 'Instant Demo Sandbox Topup (UPI QR Mock)', ?, ?)
    `, [userId, numAmount, newBalance, mockUtr, invoiceNumber, now]);

    res.json({
      message: `Successfully credited ₹${numAmount.toFixed(2)} to your wallet!`,
      newBalance: newBalance,
      transactionId: mockUtr
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/wallet/transactions - User transactions
router.get('/transactions', authenticateToken, (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const { limit = 50, offset = 0 } = req.query;

    const transactions = runQuery<any>(`
      SELECT * FROM transactions
      WHERE user_id = ?
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `, [userId, parseInt(limit as string), parseInt(offset as string)]);

    const countRow = getOne<{ total: number }>('SELECT count(*) as total FROM transactions WHERE user_id = ?', [userId]);

    res.json({
      transactions,
      total: countRow?.total || 0
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/transactions - Full Ledger for Admin
router.get('/admin/transactions', authenticateToken, requireAdmin, (req: Request, res: Response): void => {
  try {
    const { type, status, search, limit = 100, offset = 0 } = req.query;

    let sql = `
      SELECT t.*, u.name as user_name, u.email as user_email
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (type && type !== 'all') {
      sql += ' AND t.type = ?';
      params.push(type);
    }

    if (status && status !== 'all') {
      sql += ' AND t.status = ?';
      params.push(status);
    }

    if (search && typeof search === 'string') {
      sql += ' AND (u.email LIKE ? OR u.name LIKE ? OR t.utr_number LIKE ? OR t.notes LIKE ? OR t.invoice_number LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term, term);
    }

    sql += ' ORDER BY t.id DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit as string), parseInt(offset as string));

    const transactions = runQuery<any>(sql, params);
    const countRow = getOne<{ total: number }>('SELECT count(*) as total FROM transactions');

    res.json({
      transactions,
      total: countRow?.total || 0
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/wallet/adjust - Admin manual balance credit or debit
router.post('/admin/adjust', authenticateToken, requireAdmin, (req: Request, res: Response): void => {
  try {
    const { user_id, action, amount, reason } = req.body;

    if (!user_id || !action || amount === undefined) {
      res.status(400).json({ error: 'User ID, action (credit/debit), and amount are required.' });
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      res.status(400).json({ error: 'Amount must be a positive number.' });
      return;
    }

    const user = getOne<any>('SELECT * FROM users WHERE id = ?', [user_id]);
    if (!user) {
      res.status(404).json({ error: 'Target user not found.' });
      return;
    }

    let newBalance = user.balance;
    let delta = 0;

    if (action === 'credit') {
      delta = numAmount;
      newBalance = Math.round((user.balance + numAmount) * 100) / 100;
    } else if (action === 'debit') {
      if (user.balance < numAmount) {
        res.status(400).json({ error: `Cannot debit ₹${numAmount.toFixed(2)}. User only has ₹${user.balance.toFixed(2)}.` });
        return;
      }
      delta = -numAmount;
      newBalance = Math.round((user.balance - numAmount) * 100) / 100;
    } else {
      res.status(400).json({ error: 'Invalid action. Must be "credit" or "debit".' });
      return;
    }

    const now = new Date().toISOString();
    const invoiceNumber = generateInvoiceNumber('INV-ADJ');

    // Update user balance
    execute('UPDATE users SET balance = ?, updated_at = ? WHERE id = ?', [newBalance, now, user_id]);

    // Insert Transaction Ledger
    execute(`
      INSERT INTO transactions (user_id, type, amount, balance_after, status, payment_method, notes, invoice_number, created_at)
      VALUES (?, 'admin_adjustment', ?, ?, 'completed', 'admin_manual', ?, ?, ?)
    `, [
      user_id,
      delta,
      newBalance,
      `Admin ${action.toUpperCase()}: ${reason || 'Manual Adjustment by ' + req.user!.name}`,
      invoiceNumber,
      now
    ]);

    res.json({
      message: `Successfully ${action === 'credit' ? 'credited' : 'debited'} ₹${numAmount.toFixed(2)} for ${user.email}. New balance: ₹${newBalance.toFixed(2)}.`,
      newBalance,
      userId: user_id
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/transactions/:id/status - Approve or reject pending UPI deposits
router.patch('/admin/transactions/:id/status', authenticateToken, requireAdmin, (req: Request, res: Response): void => {
  try {
    const txId = parseInt(req.params.id);
    const { status, admin_notes } = req.body;

    if (!['completed', 'rejected'].includes(status)) {
      res.status(400).json({ error: 'Status must be "completed" or "rejected".' });
      return;
    }

    const tx = getOne<any>('SELECT * FROM transactions WHERE id = ?', [txId]);
    if (!tx) {
      res.status(404).json({ error: 'Transaction not found.' });
      return;
    }

    if (tx.status !== 'pending') {
      res.status(400).json({ error: `Transaction is already in status "${tx.status}".` });
      return;
    }

    const user = getOne<any>('SELECT * FROM users WHERE id = ?', [tx.user_id]);
    if (!user) {
      res.status(404).json({ error: 'Associated user not found.' });
      return;
    }

    const now = new Date().toISOString();

    if (status === 'completed') {
      // Credit user's wallet
      const newBalance = Math.round((user.balance + tx.amount) * 100) / 100;
      execute('UPDATE users SET balance = ?, updated_at = ? WHERE id = ?', [newBalance, now, tx.user_id]);

      execute(`
        UPDATE transactions
        SET status = 'completed', balance_after = ?, notes = notes || ' [Approved by Admin]', created_at = created_at
        WHERE id = ?
      `, [newBalance, txId]);

      res.json({ message: `Transaction approved! ₹${tx.amount.toFixed(2)} credited to ${user.email}.` });
    } else {
      execute(`
        UPDATE transactions
        SET status = 'rejected', notes = notes || ' [Rejected: ' || ? || ']'
        WHERE id = ?
      `, [admin_notes || 'Invalid reference or funds not received', txId]);

      res.json({ message: `Transaction rejected.` });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
