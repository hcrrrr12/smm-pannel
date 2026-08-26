import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { runQuery, getOne, execute } from '../db.js';
import { generateToken, authenticateToken, createRateLimiter } from '../auth.js';

const router = Router();
const authLimiter = createRateLimiter(20, 60000); // 20 attempts per minute

// POST /api/auth/register
router.post('/register', authLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email, and password are required.' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    const existing = getOne('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existing) {
      res.status(409).json({ error: 'An account with this email address already exists.' });
      return;
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const apiKey = 'smm_' + crypto.randomBytes(16).toString('hex');
    const now = new Date().toISOString();

    const { lastInsertRowid } = execute(`
      INSERT INTO users (name, email, password_hash, role, balance, spent, api_key, status, phone, created_at, updated_at)
      VALUES (?, ?, ?, 'user', 0.0, 0.0, ?, 'active', ?, ?, ?)
    `, [name.trim(), email.toLowerCase().trim(), passwordHash, apiKey, phone || null, now, now]);

    const user = {
      id: lastInsertRowid,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      role: 'user' as const,
      balance: 0.0,
      spent: 0.0,
      api_key: apiKey,
      phone: phone || null,
      created_at: now
    };

    const token = generateToken({ id: user.id, email: user.email, role: user.role, name: user.name });

    // Set secure HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(201).json({
      message: 'Account created successfully',
      user,
      token
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Server error during registration: ' + err.message });
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const user = getOne<any>('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    if (user.status !== 'active') {
      res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
      return;
    }

    const validPass = bcrypt.compareSync(password, user.password_hash);
    if (!validPass) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = generateToken({ id: user.id, email: user.email, role: user.role, name: user.name });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      balance: user.balance,
      spent: user.spent,
      api_key: user.api_key,
      phone: user.phone,
      created_at: user.created_at
    };

    res.json({
      message: 'Logged in successfully',
      user: safeUser,
      token
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login: ' + err.message });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req: Request, res: Response): void => {
  try {
    const user = getOne<any>('SELECT id, name, email, role, balance, spent, api_key, status, phone, created_at FROM users WHERE id = ?', [req.user!.id]);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/logout
router.post('/logout', (req: Request, res: Response): void => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

// POST /api/auth/api-key/regenerate
router.post('/api-key/regenerate', authenticateToken, (req: Request, res: Response): void => {
  try {
    const newApiKey = 'smm_' + crypto.randomBytes(16).toString('hex');
    execute('UPDATE users SET api_key = ?, updated_at = ? WHERE id = ?', [newApiKey, new Date().toISOString(), req.user!.id]);
    res.json({ apiKey: newApiKey, message: 'API key regenerated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
