/**
 * Shop Inventory Routes (Priority 2.6)
 * GET    /api/inventory           — authority: all shops; shop: own inventory
 * POST   /api/inventory           — shop: add stock entry
 * PATCH  /api/inventory/:id       — shop: update stock
 * GET    /api/inventory/low-stock — authority: items below threshold
 * GET    /api/inventory/qr/:buyerId — generate buyer QR payload (Priority 2.1)
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const { verifyToken, restrictTo } = require('../middleware/authMiddleware');
const { validateInventoryUpdate } = require('../middleware/validateInput');
const { getPool } = require('../config/mysql');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

router.use(verifyToken);

/* ─── GET inventory ────────────────────────────────────────── */
router.get('/', async (req, res, next) => {
  try {
    const pool = getPool();
    let rows;
    if (req.user.role === 'authority') {
      [rows] = await pool.query(
        `SELECT si.*, u.name AS shop_name, u.shop_location
         FROM ShopInventory si
         JOIN Users u ON u.id = si.shop_id
         ORDER BY si.shop_id, si.alcohol_type`
      );
    } else {
      // shop only sees their own
      [rows] = await pool.query(
        'SELECT * FROM ShopInventory WHERE shop_id = ? ORDER BY alcohol_type',
        [req.user.id]
      );
    }
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/* ─── GET low-stock alerts ─────────────────────────────────── */
router.get('/low-stock', restrictTo('authority', 'shop'), async (req, res, next) => {
  try {
    const pool = getPool();
    const shopFilter = req.user.role === 'shop' ? 'AND si.shop_id = ?' : '';
    const params = req.user.role === 'shop' ? [req.user.id] : [];
    const [rows] = await pool.query(
      `SELECT si.*, u.name AS shop_name
       FROM ShopInventory si
       JOIN Users u ON u.id = si.shop_id
       WHERE si.stock_qty <= si.low_threshold ${shopFilter}
       ORDER BY si.stock_qty ASC`,
      params
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/* ─── POST add/update inventory entry ─────────────────────── */
router.post('/', restrictTo('shop'), validateInventoryUpdate, async (req, res, next) => {
  try {
    const { alcohol_type, stock_qty, low_threshold = 10 } = req.body;
    const shop_id = req.user.id;
    const pool = getPool();

    await pool.query(
      `INSERT INTO ShopInventory (shop_id, alcohol_type, stock_qty, low_threshold)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE stock_qty = stock_qty + VALUES(stock_qty), low_threshold = VALUES(low_threshold)`,
      [shop_id, alcohol_type, stock_qty, low_threshold]
    );

    res.status(201).json({ message: 'Inventory updated' });
  } catch (err) {
    next(err);
  }
});

/* ─── PATCH update stock qty ───────────────────────────────── */
router.patch('/:id', restrictTo('shop', 'authority'), async (req, res, next) => {
  try {
    const { stock_qty, low_threshold } = req.body;
    const pool = getPool();

    const [existing] = await pool.query('SELECT * FROM ShopInventory WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ error: 'Inventory item not found' });
    if (req.user.role === 'shop' && existing[0].shop_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await pool.query(
      `UPDATE ShopInventory
       SET stock_qty = ?, low_threshold = COALESCE(?, low_threshold)
       WHERE id = ?`,
      [stock_qty, low_threshold ?? null, req.params.id]
    );
    res.json({ message: 'Stock updated' });
  } catch (err) {
    next(err);
  }
});

/* ─── GET buyer QR code (Priority 2.1) ────────────────────── */
router.get('/qr/:buyerId', restrictTo('buyer', 'shop', 'authority'), async (req, res, next) => {
  try {
    const buyerId = parseInt(req.params.buyerId);

    // Buyers can only fetch their own QR
    if (req.user.role === 'buyer' && req.user.id !== buyerId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const pool = getPool();
    const [users] = await pool.query('SELECT id, name, role FROM Users WHERE id = ?', [buyerId]);
    if (!users.length || users[0].role !== 'buyer') {
      return res.status(404).json({ error: 'Buyer not found' });
    }
    const [profiles] = await pool.query('SELECT * FROM BuyerProfiles WHERE buyer_id = ?', [buyerId]);
    if (!profiles.length) return res.status(404).json({ error: 'Buyer profile not found' });

    const user = users[0];
    const profile = profiles[0];

    // QR payload: signed JWT, expires in 60s
    const payload = {
      buyer_id: user.id,
      name: user.name,
      daily_remaining: profile.daily_remaining,
      weekly_remaining: profile.weekly_remaining,
      monthly_remaining: profile.monthly_remaining,
      risk_score: profile.risk_score,
      issued_at: Date.now(),
    };

    const qrToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '60s' });
    const qrDataUrl = await QRCode.toDataURL(qrToken, {
      errorCorrectionLevel: 'M',
      width: 300,
      margin: 1,
    });

    res.json({ qrDataUrl, expiresIn: 60, buyer: { id: user.id, name: user.name } });
  } catch (err) {
    next(err);
  }
});

/* ─── POST verify QR scan (Priority 2.1) ──────────────────── */
router.post('/qr/verify', restrictTo('shop'), async (req, res, next) => {
  try {
    const { qrToken } = req.body;
    if (!qrToken) return res.status(400).json({ error: 'qrToken is required' });

    const payload = jwt.verify(qrToken, process.env.JWT_SECRET);

    // Confirm QR was issued within 60s
    if (Date.now() - payload.issued_at > 60000) {
      return res.status(400).json({ error: 'QR code expired' });
    }

    // Fetch fresh profile
    const pool = getPool();
    const [profiles] = await pool.query(
      'SELECT * FROM BuyerProfiles WHERE buyer_id = ?', [payload.buyer_id]
    );
    if (!profiles.length) return res.status(404).json({ error: 'Buyer not found' });

    res.json({ verified: true, buyer_id: payload.buyer_id, profile: profiles[0] });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(400).json({ error: 'Invalid or expired QR code' });
    }
    next(err);
  }
});

module.exports = router;
