/**
 * Buyers Routes (Task 7 — Fix 4 & Fix 5)
 * GET  /api/buyers                — authority: list all buyers
 * GET  /api/buyers/:id/profile    — authority or own buyer
 * POST /api/buyers/:id/blacklist  — authority only, toggle blacklist
 */

const express = require('express');
const router  = express.Router();
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

/* ─── GET buyer profile (Task 7 Fix 4) ──────────────────── */
router.get('/:id/profile', async (req, res, next) => {
  try {
    const buyerId = parseInt(req.params.id);

    // Buyers can only view their own profile
    if (req.user.role === 'buyer' && req.user.id !== buyerId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT bp.*, u.name, u.email, u.phone, u.address, u.district, u.age,
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

/* ─── POST toggle blacklist (Task 7 Fix 5) ──────────────── */
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
