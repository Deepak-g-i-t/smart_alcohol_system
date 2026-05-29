/**
 * Buyers Routes
 * GET  /api/buyers                — authority: list all buyers
 * GET  /api/buyers/by-code/:code  — shop/authority: lookup buyer by BYR-XXXXX
 * GET  /api/buyers/:id/profile    — authority or own buyer
 * GET  /api/buyers/:id/qr         — buyer (own), shop, authority: signed QR
 * POST /api/buyers/qr/verify      — shop: verify scanned QR JWT
 * POST /api/buyers/:id/blacklist  — authority only, toggle blacklist
 */

const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const QRCode  = require('qrcode');
const { verifyToken, restrictTo } = require('../middleware/authMiddleware');
const { getPool } = require('../config/mysql');
const AuditLog = require('../models/AuditLog');
const logger   = require('../utils/logger');

router.use(verifyToken);

/* ─── GET all buyers ─────────────────────────────────────── */
router.get('/', restrictTo('authority'), async (req, res, next) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(`
      SELECT
        u.id, u.name, u.email, u.phone, u.address, u.district, u.age,
        u.created_at,
        bp.buyer_code,
        bp.daily_remaining, bp.weekly_remaining, bp.monthly_remaining,
        bp.daily_limit, bp.weekly_limit, bp.monthly_limit,
        bp.risk_score, bp.risk_factors,
        bp.blacklist_status, bp.blacklist_reason, bp.blacklisted_at
      FROM Users u
      LEFT JOIN BuyerProfiles bp ON bp.buyer_id = u.id
      WHERE u.role = 'buyer'
      ORDER BY u.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/* ─── POST verify QR scan (shop only) ────────────────────── */
router.post('/qr/verify', restrictTo('shop'), async (req, res, next) => {
  try {
    const { qrToken } = req.body;
    if (!qrToken) return res.status(400).json({ error: 'qrToken is required' });

    let payload;
    try {
      payload = jwt.verify(qrToken, process.env.JWT_SECRET);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        return res.status(400).json({ error: 'QR code expired. Ask buyer to refresh.' });
      }
      return res.status(400).json({ error: 'Invalid QR code' });
    }

    // Fetch fresh profile
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT bp.*, bp.buyer_code, u.name, u.email, u.phone, u.district
       FROM BuyerProfiles bp
       JOIN Users u ON u.id = bp.buyer_id
       WHERE bp.buyer_code = ?`,
      [payload.buyer_code]
    );

    if (!rows.length) {
      // Fallback: try by buyer_id
      const [fallback] = await pool.query(
        `SELECT bp.*, bp.buyer_code, u.name, u.email, u.phone, u.district
         FROM BuyerProfiles bp
         JOIN Users u ON u.id = bp.buyer_id
         WHERE bp.buyer_id = ?`,
        [payload.buyer_id]
      );
      if (!fallback.length) {
        return res.status(404).json({ error: 'Buyer not found' });
      }
      return res.json({
        verified: true,
        buyer_code: fallback[0].buyer_code,
        profile: fallback[0],
      });
    }

    res.json({
      verified: true,
      buyer_code: payload.buyer_code,
      profile: rows[0],
    });
  } catch (err) {
    next(err);
  }
});

/* ─── GET buyer by buyer_code (BYR-XXXXX) ────────────────── */
router.get('/by-code/:buyerCode', restrictTo('shop', 'authority'), async (req, res, next) => {
  try {
    const { buyerCode } = req.params;
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT bp.*, bp.buyer_code, u.name, u.email, u.phone, u.address, u.district, u.age,
              u.created_at AS registered_at
       FROM BuyerProfiles bp
       JOIN Users u ON u.id = bp.buyer_id
       WHERE bp.buyer_code = ?`,
      [buyerCode.toUpperCase()]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Buyer not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/* ─── GET buyer profile ──────────────────────────────────── */
router.get('/:id/profile', async (req, res, next) => {
  try {
    const buyerId = parseInt(req.params.id);

    // Buyers can only view their own profile
    if (req.user.role === 'buyer' && req.user.id !== buyerId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT bp.*, bp.buyer_code, u.name, u.email, u.phone, u.address, u.district, u.age,
              u.created_at AS registered_at
       FROM BuyerProfiles bp
       JOIN Users u ON u.id = bp.buyer_id
       WHERE bp.buyer_id = ?`,
      [buyerId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Buyer profile not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/* ─── GET signed QR code for buyer ───────────────────────── */
router.get('/:id/qr', restrictTo('buyer', 'shop', 'authority'), async (req, res, next) => {
  try {
    const buyerId = parseInt(req.params.id);

    // Buyers can only fetch their own QR
    if (req.user.role === 'buyer' && req.user.id !== buyerId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const pool = getPool();
    const [users] = await pool.query('SELECT id, name, role FROM Users WHERE id = ?', [buyerId]);
    if (!users.length || users[0].role !== 'buyer') {
      return res.status(404).json({ error: 'Buyer not found' });
    }
    const [profiles] = await pool.query(
      'SELECT * FROM BuyerProfiles WHERE buyer_id = ?', [buyerId]
    );
    if (!profiles.length) return res.status(404).json({ error: 'Buyer profile not found' });

    const user = users[0];
    const profile = profiles[0];

    // QR payload: signed JWT, expires in 60s
    // NOTE: do NOT set exp manually in payload — let jwt.sign expiresIn handle it
    const qrPayload = {
      buyer_code: profile.buyer_code,
      buyer_id:   buyerId,
      name:       user.name,
      issued_at:  Date.now(),
    };

    const qrToken = jwt.sign(qrPayload, process.env.JWT_SECRET, { expiresIn: '60s' });
    const qrDataUrl = await QRCode.toDataURL(qrToken, {
      errorCorrectionLevel: 'M',
      width: 280,
      margin: 1,
    });

    res.json({
      qrDataUrl,
      token: qrToken,
      expiresIn: 60,
      buyer: { buyer_code: profile.buyer_code, name: user.name },
    });
  } catch (err) {
    next(err);
  }
});

/* ─── POST toggle blacklist ──────────────────────────────── */
router.post('/:id/blacklist', restrictTo('authority'), async (req, res, next) => {
  try {
    const buyerId = parseInt(req.params.id);
    const { reason } = req.body;
    const pool = getPool();

    // Get current status
    const [rows] = await pool.query(
      'SELECT blacklist_status FROM BuyerProfiles WHERE buyer_id = ?',
      [buyerId]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Buyer profile not found' });
    }

    const currentStatus = rows[0].blacklist_status || false;
    const newStatus = !currentStatus;

    await pool.query(
      `UPDATE BuyerProfiles
       SET blacklist_status   = ?,
           blacklist_reason   = ?,
           blacklisted_at     = ?,
           blacklisted_by     = ?
       WHERE buyer_id = ?`,
      [
        newStatus,
        newStatus ? (reason || 'Flagged by authority') : null,
        newStatus ? new Date() : null,
        newStatus ? req.user.id : null,
        buyerId,
      ]
    );

    // Audit log
    try {
      await AuditLog.create({
        event_type: 'BLACKLIST',
        user_id:    req.user.id,
        user_role:  req.user.role,
        details: {
          buyer_id: buyerId,
          action:   newStatus ? 'blacklisted' : 'unblacklisted',
          reason,
        },
        ip_address: req.ip,
      });
    } catch (e) {
      logger.error('AuditLog blacklist failed', { message: e.message });
    }

    res.json({
      message:          `Buyer ${newStatus ? 'blacklisted' : 'removed from blacklist'}`,
      blacklist_status: newStatus,
      buyer_id:         buyerId,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
