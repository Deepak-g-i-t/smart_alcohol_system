/**
 * Reports Routes (Priority 2.3)
 * GET /api/reports/summary?from=&to=  — aggregate stats for date range
 * GET /api/reports/export?format=csv  — stream CSV response
 * GET /api/reports/audit-logs         — MongoDB audit logs for authority
 * GET /api/reports/risk-breakdown/:buyerId — multi-factor risk detail (Priority 3.1)
 */

const express = require('express');
const router = express.Router();
const { Parser } = require('json2csv');
const { verifyToken, restrictTo } = require('../middleware/authMiddleware');
const { getPool } = require('../config/mysql');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

router.use(verifyToken);
router.use(restrictTo('authority'));

/* ─── Summary stats for date range ───────────────────────── */
router.get('/summary', async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const pool = getPool();

    const dateFilter = from && to
      ? 'WHERE timestamp BETWEEN ? AND ?'
      : from
        ? 'WHERE timestamp >= ?'
        : to
          ? 'WHERE timestamp <= ?'
          : '';
    const params = [from, to].filter(Boolean);

    const [[stats]] = await pool.query(
      `SELECT
         COUNT(*) AS total,
         SUM(status = 'approved') AS approved,
         SUM(status = 'rejected') AS rejected,
         SUM(CASE WHEN status = 'approved' THEN quantity ELSE 0 END) AS total_volume,
         COUNT(DISTINCT buyer_id) AS unique_buyers,
         COUNT(DISTINCT shop_id) AS active_shops
       FROM Transactions ${dateFilter}`,
      params
    );

    const [byType] = await pool.query(
      `SELECT alcohol_type, COUNT(*) AS count
       FROM Transactions ${dateFilter}
       GROUP BY alcohol_type ORDER BY count DESC`,
      params
    );

    const [byRegion] = await pool.query(
      `SELECT u.shop_location AS region, COUNT(*) AS transactions,
              SUM(t.status = 'rejected') AS violations
       FROM Transactions t
       JOIN Users u ON u.id = t.shop_id
       ${dateFilter ? dateFilter.replace('WHERE', 'WHERE t.') : ''}
       GROUP BY u.shop_location`,
      params
    );

    res.json({ stats, byType, byRegion, from, to });
  } catch (err) {
    next(err);
  }
});

/* ─── Export CSV stream ────────────────────────────────────── */
router.get('/export', async (req, res, next) => {
  try {
    const { format: fmt = 'csv', from, to } = req.query;
    const pool = getPool();

    const params = [];
    let where = '1=1';
    if (from) { where += ' AND t.timestamp >= ?'; params.push(from); }
    if (to)   { where += ' AND t.timestamp <= ?'; params.push(to); }

    const [rows] = await pool.query(
      `SELECT t.id, b.name AS buyer_name, t.buyer_id,
              s.name AS shop_name, t.shop_id,
              t.alcohol_type, t.quantity, t.status, t.reason, t.timestamp
       FROM Transactions t
       LEFT JOIN Users b ON b.id = t.buyer_id
       LEFT JOIN Users s ON s.id = t.shop_id
       WHERE ${where}
       ORDER BY t.timestamp DESC
       LIMIT 10000`,
      params
    );

    if (fmt === 'csv') {
      const parser = new Parser({
        fields: ['id', 'buyer_name', 'buyer_id', 'shop_name', 'shop_id', 'alcohol_type', 'quantity', 'status', 'reason', 'timestamp'],
      });
      const csv = parser.parse(rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="transactions_${Date.now()}.csv"`);
      return res.send(csv);
    }

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/* ─── Audit logs (MongoDB) ─────────────────────────────────── */
router.get('/audit-logs', async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 50);
    const { event_type, from, to } = req.query;

    const filter = {};
    if (event_type) filter.event_type = event_type;
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to)   filter.timestamp.$lte = new Date(to);
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ timestamp: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      AuditLog.countDocuments(filter),
    ]);

    res.json({ logs, total, page, limit });
  } catch (err) {
    next(err);
  }
});

/* ─── Risk breakdown per buyer (Priority 3.1) ─────────────── */
router.get('/risk-breakdown/:buyerId', async (req, res, next) => {
  try {
    const pool = getPool();
    const buyerId = parseInt(req.params.buyerId);

    const [profiles] = await pool.query(
      'SELECT * FROM BuyerProfiles WHERE buyer_id = ?', [buyerId]
    );
    if (!profiles.length) return res.status(404).json({ error: 'Buyer not found' });

    const profile = profiles[0];

    // Compute each factor live
    const [[{ freq7 }]] = await pool.query(
      `SELECT COUNT(*) AS freq7 FROM Transactions
       WHERE buyer_id = ? AND status = 'approved' AND timestamp > NOW() - INTERVAL 7 DAY`,
      [buyerId]
    );
    const [[{ consec_days }]] = await pool.query(
      `SELECT COUNT(DISTINCT DATE(timestamp)) AS consec_days FROM Transactions
       WHERE buyer_id = ? AND status = 'approved' AND timestamp > NOW() - INTERVAL 7 DAY`,
      [buyerId]
    );
    const [[{ quota_violations }]] = await pool.query(
      `SELECT COUNT(*) AS quota_violations FROM Transactions
       WHERE buyer_id = ? AND status = 'rejected' AND reason LIKE '%quota%'`,
      [buyerId]
    );

    res.json({
      buyer_id: buyerId,
      total_risk_score: profile.risk_score,
      risk_factors: profile.risk_factors || {},
      computed: {
        transactions_last_7_days: freq7,
        consecutive_days_active: consec_days,
        quota_violation_count: quota_violations,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
