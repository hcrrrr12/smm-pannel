import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getOne } from './db.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_for_smm_panel_auth_2026';

export interface AuthUser {
  id: number;
  email: string;
  role: 'admin' | 'user';
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  // Check cookie or Bearer header
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please login.' });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      res.status(403).json({ error: 'Invalid or expired session token. Please login again.' });
      return;
    }
    req.user = decoded as AuthUser;
    next();
  });
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
    return;
  }
  next();
}

export function apiKeyOrJwtAuth(req: Request, res: Response, next: NextFunction): void {
  const apiKey = (req.headers['x-api-key'] || req.body.key || req.query.key) as string | undefined;

  if (apiKey) {
    const user = getOne<{ id: number; email: string; role: 'admin' | 'user'; name: string; status: string }>(
      'SELECT id, email, role, name, status FROM users WHERE api_key = ?',
      [apiKey]
    );

    if (!user) {
      res.status(401).json({ error: 'Bad API Key' });
      return;
    }

    if (user.status !== 'active') {
      res.status(403).json({ error: 'Account suspended' });
      return;
    }

    req.user = { id: user.id, email: user.email, role: user.role, name: user.name };
    next();
    return;
  }

  // Fallback to token auth
  authenticateToken(req, res, next);
}

// In-memory sliding window rate limiter
interface RateLimitBucket {
  count: number;
  resetAt: number;
}
const rateLimits = new Map<string, RateLimitBucket>();

export function createRateLimiter(maxRequests: number = 60, windowMs: number = 60000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown-ip';
    const key = `${req.path}:${ip}`;
    const now = Date.now();

    let bucket = rateLimits.get(key);
    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 1, resetAt: now + windowMs };
      rateLimits.set(key, bucket);
    } else {
      bucket.count++;
    }

    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - bucket.count).toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(bucket.resetAt / 1000).toString());

    if (bucket.count > maxRequests) {
      res.status(429).json({
        error: 'Too many requests. Please slow down and try again shortly.',
        retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000)
      });
      return;
    }

    next();
  };
}

// Security headers middleware
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
}
