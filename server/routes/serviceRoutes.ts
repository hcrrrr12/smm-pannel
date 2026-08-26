import { Router, Request, Response } from 'express';
import { runQuery, getOne, execute } from '../db.js';
import { authenticateToken, requireAdmin } from '../auth.js';

const router = Router();

// GET /api/services (Public / Authenticated)
router.get('/', (req: Request, res: Response): void => {
  try {
    const services = runQuery<any>(`
      SELECT s.*, c.name as category_name, c.icon as category_icon, c.sort_order as category_sort
      FROM services s
      JOIN categories c ON s.category_id = c.id
      WHERE s.status = 'active' AND c.status = 'active'
      ORDER BY c.sort_order ASC, s.id ASC
    `);
    res.json({ services });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/services/categories
router.get('/categories', (req: Request, res: Response): void => {
  try {
    const categories = runQuery<any>(`
      SELECT c.*, COUNT(s.id) as service_count
      FROM categories c
      LEFT JOIN services s ON c.id = s.category_id AND s.status = 'active'
      WHERE c.status = 'active'
      GROUP BY c.id
      ORDER BY c.sort_order ASC
    `);
    res.json({ categories });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/services (Admin view all services including inactive)
router.get('/admin/all', authenticateToken, requireAdmin, (req: Request, res: Response): void => {
  try {
    const services = runQuery<any>(`
      SELECT s.*, c.name as category_name, c.icon as category_icon
      FROM services s
      LEFT JOIN categories c ON s.category_id = c.id
      ORDER BY s.id DESC
    `);
    const categories = runQuery<any>('SELECT * FROM categories ORDER BY sort_order ASC');
    res.json({ services, categories });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/services
router.post('/admin', authenticateToken, requireAdmin, (req: Request, res: Response): void => {
  try {
    const { category_id, name, type, rate_per_1000, min_qty, max_qty, description, profit_margin_percent, status, drip_feed_enabled } = req.body;

    if (!category_id || !name || rate_per_1000 === undefined) {
      res.status(400).json({ error: 'Category, name, and rate per 1000 are required.' });
      return;
    }

    const { lastInsertRowid } = execute(`
      INSERT INTO services (category_id, name, type, rate_per_1000, min_qty, max_qty, description, profit_margin_percent, status, drip_feed_enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      category_id,
      name,
      type || 'default',
      parseFloat(rate_per_1000),
      parseInt(min_qty || '10'),
      parseInt(max_qty || '100000'),
      description || '',
      parseFloat(profit_margin_percent || '20.0'),
      status || 'active',
      drip_feed_enabled ? 1 : 0
    ]);

    res.status(201).json({ message: 'Service created successfully', serviceId: lastInsertRowid });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/services/:id
router.put('/admin/:id', authenticateToken, requireAdmin, (req: Request, res: Response): void => {
  try {
    const id = parseInt(req.params.id);
    const { category_id, name, type, rate_per_1000, min_qty, max_qty, description, profit_margin_percent, status, drip_feed_enabled } = req.body;

    const existing = getOne('SELECT id FROM services WHERE id = ?', [id]);
    if (!existing) {
      res.status(404).json({ error: 'Service not found' });
      return;
    }

    execute(`
      UPDATE services
      SET category_id = ?, name = ?, type = ?, rate_per_1000 = ?, min_qty = ?, max_qty = ?, description = ?, profit_margin_percent = ?, status = ?, drip_feed_enabled = ?
      WHERE id = ?
    `, [
      category_id,
      name,
      type || 'default',
      parseFloat(rate_per_1000),
      parseInt(min_qty),
      parseInt(max_qty),
      description || '',
      parseFloat(profit_margin_percent),
      status,
      drip_feed_enabled ? 1 : 0,
      id
    ]);

    res.json({ message: 'Service updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/services/:id
router.delete('/admin/:id', authenticateToken, requireAdmin, (req: Request, res: Response): void => {
  try {
    const id = parseInt(req.params.id);
    execute('DELETE FROM services WHERE id = ?', [id]);
    res.json({ message: 'Service deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/categories
router.post('/admin/categories', authenticateToken, requireAdmin, (req: Request, res: Response): void => {
  try {
    const { name, icon, sort_order } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Category name is required' });
      return;
    }
    const { lastInsertRowid } = execute(
      'INSERT INTO categories (name, icon, sort_order, status) VALUES (?, ?, ?, "active")',
      [name, icon || 'share2', sort_order || 0]
    );
    res.status(201).json({ message: 'Category created', categoryId: lastInsertRowid });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/categories/:id
router.put('/admin/categories/:id', authenticateToken, requireAdmin, (req: Request, res: Response): void => {
  try {
    const id = parseInt(req.params.id);
    const { name, icon, sort_order, status } = req.body;
    execute(
      'UPDATE categories SET name = ?, icon = ?, sort_order = ?, status = ? WHERE id = ?',
      [name, icon || 'share2', sort_order || 0, status || 'active', id]
    );
    res.json({ message: 'Category updated' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
