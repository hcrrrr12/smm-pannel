import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'smm_panel.sqlite');

let SQL: SqlJsStatic | null = null;
let db: Database | null = null;

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export async function getDb(): Promise<Database> {
  if (db) return db;

  if (!SQL) {
    SQL = await initSqlJs();
  }

  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  initSchema(db);
  saveDb();
  return db;
}

export function saveDb(): void {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('Failed to save SQLite DB to disk:', err);
  }
}

export function runQuery<T = any>(sql: string, params: any[] = []): T[] {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  if (params && params.length > 0) {
    stmt.bind(params);
  }
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

export function getOne<T = any>(sql: string, params: any[] = []): T | null {
  const rows = runQuery<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export function execute(sql: string, params: any[] = []): { changes: number; lastInsertRowid: number } {
  if (!db) throw new Error('Database not initialized');
  db.run(sql, params);
  const info = db.exec('SELECT last_insert_rowid() as id, changes() as changes');
  let lastInsertRowid = 0;
  let changes = 0;
  if (info.length > 0 && info[0].values.length > 0) {
    lastInsertRowid = Number(info[0].values[0][0]);
    changes = Number(info[0].values[0][1]);
  }
  saveDb();
  return { changes, lastInsertRowid };
}

function initSchema(database: Database) {
  database.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user', -- 'admin' | 'user'
      balance REAL NOT NULL DEFAULT 0.0,
      spent REAL NOT NULL DEFAULT 0.0,
      api_key TEXT UNIQUE,
      status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'suspended'
      phone TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT 'share2',
      sort_order INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'default', -- 'default' | 'custom_comments' | 'package'
      rate_per_1000 REAL NOT NULL, -- price in INR per 1000 units
      min_qty INTEGER NOT NULL DEFAULT 10,
      max_qty INTEGER NOT NULL DEFAULT 100000,
      description TEXT,
      provider_id INTEGER DEFAULT NULL,
      provider_service_id TEXT DEFAULT NULL,
      profit_margin_percent REAL NOT NULL DEFAULT 20.0,
      status TEXT NOT NULL DEFAULT 'active',
      drip_feed_enabled INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      discount_type TEXT NOT NULL DEFAULT 'percentage', -- 'percentage' | 'fixed'
      discount_value REAL NOT NULL,
      min_order_amount REAL NOT NULL DEFAULT 0.0,
      max_discount REAL DEFAULT NULL,
      max_uses INTEGER NOT NULL DEFAULT 100,
      used_count INTEGER NOT NULL DEFAULT 0,
      expires_at TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      service_id INTEGER NOT NULL,
      link TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      charge REAL NOT NULL,
      original_rate REAL NOT NULL,
      coupon_id INTEGER DEFAULT NULL,
      discount_amount REAL NOT NULL DEFAULT 0.0,
      custom_comments TEXT DEFAULT NULL,
      status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'processing' | 'in_progress' | 'completed' | 'partial' | 'cancelled' | 'refunded'
      start_count INTEGER DEFAULT 0,
      remains INTEGER DEFAULT 0,
      provider_order_id TEXT DEFAULT NULL,
      invoice_number TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (service_id) REFERENCES services(id)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL, -- 'deposit' | 'order_debit' | 'refund' | 'admin_adjustment' | 'coupon_cashback'
      amount REAL NOT NULL,
      balance_after REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'completed', -- 'completed' | 'pending' | 'failed' | 'rejected'
      payment_method TEXT NOT NULL, -- 'upi_qr' | 'razorpay' | 'stripe' | 'admin_manual' | 'wallet'
      utr_number TEXT DEFAULT NULL,
      notes TEXT,
      invoice_number TEXT DEFAULT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      subject TEXT NOT NULL,
      order_id INTEGER DEFAULT NULL,
      priority TEXT NOT NULL DEFAULT 'medium', -- 'low' | 'medium' | 'high'
      status TEXT NOT NULL DEFAULT 'open', -- 'open' | 'answered' | 'closed'
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS ticket_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL,
      sender_role TEXT NOT NULL, -- 'admin' | 'user'
      message TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (ticket_id) REFERENCES tickets(id)
    );

    CREATE TABLE IF NOT EXISTS providers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      api_url TEXT NOT NULL,
      api_key TEXT NOT NULL,
      balance REAL NOT NULL DEFAULT 0.0,
      currency TEXT NOT NULL DEFAULT 'USD',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT,
      updated_at TEXT NOT NULL
    );
  `);

  // Seed default data if empty
  seedDefaultData(database);
}

function seedDefaultData(database: Database) {
  // Check if admin user exists
  const checkUser = database.exec("SELECT count(*) FROM users WHERE email = 'kritanchettri32@gmail.com'");
  const userCount = (checkUser.length > 0 && checkUser[0].values.length > 0) ? Number(checkUser[0].values[0][0]) : 0;

  const now = new Date().toISOString();

  if (userCount === 0) {
    const salt = bcrypt.genSaltSync(10);
    const adminHash = bcrypt.hashSync('Admin@12345', salt);
    const userHash = bcrypt.hashSync('User@12345', salt);

    // Admin user
    database.run(`
      INSERT INTO users (name, email, password_hash, role, balance, spent, api_key, status, phone, created_at, updated_at)
      VALUES (?, ?, ?, 'admin', 50000.0, 0.0, 'smm_live_adm_8918145816_key', 'active', '+918918145186', ?, ?)
    `, ['Kritan Chettri (Admin)', 'kritanchettri32@gmail.com', adminHash, now, now]);

    // Demo customer
    database.run(`
      INSERT INTO users (name, email, password_hash, role, balance, spent, api_key, status, phone, created_at, updated_at)
      VALUES (?, ?, ?, 'user', 1500.0, 450.0, 'smm_live_usr_demo_key_9921', 'active', '+918918145186', ?, ?)
    `, ['Demo Marketer', 'customer@example.com', userHash, now, now]);

    // Initial deposit transaction for demo customer
    database.run(`
      INSERT INTO transactions (user_id, type, amount, balance_after, status, payment_method, utr_number, notes, invoice_number, created_at)
      VALUES (2, 'deposit', 1950.0, 1950.0, 'completed', 'upi_qr', 'UTR8918145816001', 'Initial UPI QR Wallet Topup', 'INV-DEP-1001', ?)
    `, [now]);

    database.run(`
      INSERT INTO transactions (user_id, type, amount, balance_after, status, payment_method, utr_number, notes, invoice_number, created_at)
      VALUES (2, 'order_debit', -450.0, 1500.0, 'completed', 'wallet', NULL, 'Order #1001 - Instagram HQ Followers', 'INV-ORD-1001', ?)
    `, [now]);
  }

  // Check categories
  const checkCat = database.exec('SELECT count(*) FROM categories');
  const catCount = (checkCat.length > 0 && checkCat[0].values.length > 0) ? Number(checkCat[0].values[0][0]) : 0;

  if (catCount === 0) {
    const categories = [
      { name: 'Instagram', icon: 'instagram', sort: 1 },
      { name: 'YouTube', icon: 'youtube', sort: 2 },
      { name: 'TikTok', icon: 'video', sort: 3 },
      { name: 'Facebook', icon: 'facebook', sort: 4 },
      { name: 'Twitter / X', icon: 'twitter', sort: 5 },
      { name: 'Telegram', icon: 'send', sort: 6 },
      { name: 'Spotify', icon: 'music', sort: 7 },
      { name: 'Website Traffic', icon: 'globe', sort: 8 }
    ];

    for (const cat of categories) {
      database.run('INSERT INTO categories (name, icon, sort_order, status) VALUES (?, ?, ?, ?)', [
        cat.name, cat.icon, cat.sort, 'active'
      ]);
    }

    // Insert rich services with realistic rates (in INR per 1000 units)
    const services = [
      // Instagram (cat_id: 1)
      { cat_id: 1, name: 'Instagram Real Active Followers [Instant | 30 Days Refill | High Retention]', rate: 120.0, min: 50, max: 50000, desc: 'High quality genuine-looking followers with profile picture and posts. Instant start 0-15 mins.' },
      { cat_id: 1, name: 'Instagram Super High Quality Likes [Non-Drop | Max 100K | Instant]', rate: 35.0, min: 20, max: 100000, desc: 'Fast delivery non-drop likes. Perfect for boosting explore page ranking.' },
      { cat_id: 1, name: 'Instagram Reels Views + Reach + Impressions [Viral Boost]', rate: 15.0, min: 100, max: 1000000, desc: 'Explode your Reels reach with high retention views and impressions.' },
      { cat_id: 1, name: 'Instagram Custom Comments [Verified Profile Mix | Custom Text]', rate: 350.0, min: 5, max: 2000, desc: 'Enter custom comments separated by new line. Delivered gradually.', type: 'custom_comments' },
      
      // YouTube (cat_id: 2)
      { cat_id: 2, name: 'YouTube Monetizable Watch Time [4000 Hours Package Eligible | 15+ Min Video]', rate: 650.0, min: 100, max: 4000, desc: 'Guaranteed watch time for YouTube monetization requirement. Use 15+ min video.' },
      { cat_id: 2, name: 'YouTube Non-Drop Subscribers [Real Accounts | 60 Days Refill]', rate: 750.0, min: 50, max: 10000, desc: 'High retention authentic subscribers with auto-refill button.' },
      { cat_id: 2, name: 'YouTube Targeted High Retention Views [Suggested & Browse Features]', rate: 180.0, min: 500, max: 500000, desc: 'Real human viewers from browse features and YouTube search.' },
      
      // TikTok (cat_id: 3)
      { cat_id: 3, name: 'TikTok High Quality Followers [Instant Start | Fast Speed]', rate: 140.0, min: 50, max: 25000, desc: 'Quick delivery TikTok followers for creator fund and live streaming unlock.' },
      { cat_id: 3, name: 'TikTok Video Likes [Non-Drop | For You Page Boost]', rate: 45.0, min: 50, max: 100000, desc: 'Algorithm friendly likes to help push your video to FYP.' },
      { cat_id: 3, name: 'TikTok High Speed Video Views [Super Cheap]', rate: 8.0, min: 1000, max: 5000000, desc: 'Instant million-scale video view boost.' },

      // Facebook (cat_id: 4)
      { cat_id: 4, name: 'Facebook Fan Page Likes + Followers [Worldwide Real]', rate: 210.0, min: 50, max: 50000, desc: 'Increases both page likes and follows seamlessly.' },
      { cat_id: 4, name: 'Facebook Post Reactions [Like / Love / Care / Wow Mix]', rate: 60.0, min: 50, max: 10000, desc: 'Organic looking emotional reactions on posts.' },

      // Twitter / X (cat_id: 5)
      { cat_id: 5, name: 'Twitter (X) Real Followers [NFT & Crypto Friendly | Fast]', rate: 320.0, min: 50, max: 20000, desc: 'Active looking accounts with handle and tweets.' },
      { cat_id: 5, name: 'Twitter (X) Retweets + Quotes [High Impact]', rate: 110.0, min: 20, max: 10000, desc: 'Spreads your tweet across timelines rapidly.' },

      // Telegram (cat_id: 6)
      { cat_id: 6, name: 'Telegram Channel / Group Members [Zero Drop | 30 Days Refill]', rate: 95.0, min: 100, max: 100000, desc: 'Add permanent subscribers to your Telegram channel or public group.' },
      { cat_id: 6, name: 'Telegram Post Views [Last 5 Posts Auto-View]', rate: 12.0, min: 500, max: 200000, desc: 'Boosts view counts on recent channel messages.' },

      // Spotify (cat_id: 7)
      { cat_id: 7, name: 'Spotify Track Plays [Royalty Eligible | Premium US & EU Mix]', rate: 160.0, min: 1000, max: 100000, desc: 'Stream plays eligible for royalties with natural listening duration.' },
      { cat_id: 7, name: 'Spotify Artist Followers [High Quality]', rate: 130.0, min: 100, max: 20000, desc: 'Build artist authority and playlist pitching clout.' },

      // Traffic (cat_id: 8)
      { cat_id: 8, name: 'Worldwide Organic Google Search Traffic [Keyword Targeted]', rate: 65.0, min: 1000, max: 1000000, desc: 'Desktop and Mobile traffic appearing in Google Analytics 4 in real-time.' }
    ];

    for (const s of services) {
      database.run(`
        INSERT INTO services (category_id, name, type, rate_per_1000, min_qty, max_qty, description, profit_margin_percent, status, drip_feed_enabled)
        VALUES (?, ?, ?, ?, ?, ?, ?, 20.0, 'active', 1)
      `, [s.cat_id, s.name, s.type || 'default', s.rate, s.min, s.max, s.desc]);
    }
  }

  // Check coupons
  const checkCoupons = database.exec('SELECT count(*) FROM coupons');
  const couponCount = (checkCoupons.length > 0 && checkCoupons[0].values.length > 0) ? Number(checkCoupons[0].values[0][0]) : 0;

  if (couponCount === 0) {
    database.run(`
      INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, max_discount, max_uses, used_count, expires_at, status, created_at)
      VALUES 
      ('WELCOME10', 'percentage', 10.0, 50.0, 500.0, 1000, 1, '2028-12-31T23:59:59Z', 'active', ?),
      ('BOOST20', 'percentage', 20.0, 200.0, 1000.0, 500, 0, '2028-12-31T23:59:59Z', 'active', ?),
      ('KRITAN50', 'percentage', 50.0, 100.0, 2000.0, 100, 0, '2028-12-31T23:59:59Z', 'active', ?)
    `, [now, now, now]);
  }

  // Check orders
  const checkOrders = database.exec('SELECT count(*) FROM orders');
  const orderCount = (checkOrders.length > 0 && checkOrders[0].values.length > 0) ? Number(checkOrders[0].values[0][0]) : 0;

  if (orderCount === 0) {
    database.run(`
      INSERT INTO orders (user_id, service_id, link, quantity, charge, original_rate, coupon_id, discount_amount, status, start_count, remains, invoice_number, created_at, updated_at)
      VALUES 
      (2, 1, 'https://instagram.com/growth_viral_brand', 2500, 270.0, 120.0, 1, 30.0, 'completed', 1420, 0, 'INV-ORD-1001', ?, ?),
      (2, 3, 'https://instagram.com/reel/C7x9z10K', 12000, 180.0, 15.0, NULL, 0.0, 'processing', 510, 3200, 'INV-ORD-1002', ?, ?)
    `, [now, now, now, now]);
  }

  // Check Providers
  const checkProv = database.exec('SELECT count(*) FROM providers');
  const provCount = (checkProv.length > 0 && checkProv[0].values.length > 0) ? Number(checkProv[0].values[0][0]) : 0;

  if (provCount === 0) {
    database.run(`
      INSERT INTO providers (name, api_url, api_key, balance, currency, status, created_at)
      VALUES 
      ('SMM Prime Global API', 'https://api.smmprimeglobal.com/v2', 'provider_sec_live_991823', 420.50, 'USD', 'active', ?),
      ('Bulk Follows Direct API', 'https://bulkfollows.com/api/v2', 'bulk_key_test_881920', 185.20, 'USD', 'active', ?)
    `, [now, now]);
  }

  // Settings
  const defaultSettings = [
    { key: 'site_name', value: 'SocialWave SMM Panel', desc: 'Panel display name' },
    { key: 'owner_email', value: 'kritanchettri32@gmail.com', desc: 'Owner contact email' },
    { key: 'upi_id', value: '8918145816@fam', desc: 'UPI ID for dynamic QR generation' },
    { key: 'upi_payee_name', value: 'Kritan Chettri', desc: 'Payee name on UPI QR' },
    { key: 'support_phone', value: '+918918145186', desc: 'WhatsApp support phone' },
    { key: 'currency_symbol', value: '₹', desc: 'Primary currency symbol' },
    { key: 'currency_code', value: 'INR', desc: 'Primary currency code' },
    { key: 'usd_inr_rate', value: '86.5', desc: '1 USD in INR' },
    { key: 'telegram_bot_token', value: '', desc: 'Telegram Bot Token for alerts' },
    { key: 'telegram_chat_id', value: '', desc: 'Telegram Chat ID for alerts' },
    { key: 'auto_refund_on_cancel', value: 'true', desc: 'Automatically credit balance when order cancelled' },
    { key: 'min_deposit_inr', value: '50', desc: 'Minimum deposit amount in INR' }
  ];

  for (const s of defaultSettings) {
    const exists = database.exec(`SELECT count(*) FROM settings WHERE key = '${s.key}'`);
    const c = (exists.length > 0 && exists[0].values.length > 0) ? Number(exists[0].values[0][0]) : 0;
    if (c === 0) {
      database.run('INSERT INTO settings (key, value, description, updated_at) VALUES (?, ?, ?, ?)', [
        s.key, s.value, s.desc, now
      ]);
    }
  }
}
