import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { getDb } from './server/db.js';
import { securityHeaders } from './server/auth.js';

import authRoutes from './server/routes/authRoutes.js';
import serviceRoutes from './server/routes/serviceRoutes.js';
import orderRoutes from './server/routes/orderRoutes.js';
import walletRoutes from './server/routes/walletRoutes.js';
import couponRoutes from './server/routes/couponRoutes.js';
import providerRoutes from './server/routes/providerRoutes.js';
import paymentRoutes from './server/routes/paymentRoutes.js';
import ticketRoutes from './server/routes/ticketRoutes.js';
import adminRoutes from './server/routes/adminRoutes.js';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize SQLite Database schema & seeds
  await getDb();
  console.log('✅ SQLite Database schema verified and initialized.');

  // Global Middlewares
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(securityHeaders);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'SocialWave SMM Panel',
      version: '1.0.0',
      owner: 'kritanchettri32@gmail.com',
      timestamp: new Date().toISOString()
    });
  });

  // Mount API Endpoints
  app.use('/api/auth', authRoutes);
  app.use('/api/services', serviceRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/wallet', walletRoutes);
  app.use('/api/coupons', couponRoutes);
  app.use('/api/providers', providerRoutes);
  app.use('/api/v2', providerRoutes); // Standard SMM v2 API adapter
  app.use('/api/payments', paymentRoutes);
  app.use('/api/webhooks', paymentRoutes);
  app.use('/api/tickets', ticketRoutes);
  app.use('/api/admin', adminRoutes);

  // Serve Frontend
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SocialWave SMM Panel Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup failure:', err);
  process.exit(1);
});
