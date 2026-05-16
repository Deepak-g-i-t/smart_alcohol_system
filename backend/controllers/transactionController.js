const { getPool } = require('../config/mysql');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

/* ─── helpers ─────────────────────────────────────────────── */

const getCurrentPolicyLocal = async (pool) => {
  const [policies] = await pool.query(
    'SELECT * FROM Policies ORDER BY id DESC LIMIT 1'
  );
  return policies[0];
};

/**
 * Evaluates whether the current local time falls within a restricted window.
 * Correctly handles overnight windows where start > end (e.g. 22:00 → 06:00).
 * The window marks ALLOWED hours so: if outside window → DENY.
 *
 * @param {string} start  – "HH:MM:SS" or "HH:MM"
 * @param {string} end    – "HH:MM:SS" or "HH:MM"
 * @returns {boolean}  true if purchase is ALLOWED right now
 */
const isWithinAllowedTime = (start, end) => {
  const now = new Date();
  const cur = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const s = start.slice(0, 5); // normalise to "HH:MM"
  const e = end.slice(0, 5);

  // Normal window: start ≤ end  (e.g. 08:00 – 22:00)
  if (s <= e) {
    return cur >= s && cur <= e;
  }

  // Overnight window: start > end (e.g. 22:00 – 06:00)
  // Allowed if cur ≥ start OR cur ≤ end
  return cur >= s || cur <= e;
};

/* ─── risk scorer (multi-factor, Priority 3.1) ─────────────── */

const computeRiskDelta = async (pool, buyerId, quantity, profile, policy) => {
  let delta = 0;
  const factors = {};

  // 1. Volume anomaly: single quantity > 2× daily limit
  if (quantity > 2 * (profile.daily_limit || 2)) {
    delta += 15;
    factors.volume_anomaly = 15;
  }

  // 2. Frequency score in last 7 days
  const [recent] = await pool.query(
    `SELECT COUNT(id) AS hits FROM Transactions
     WHERE buyer_id = ? AND status = 'approved' AND timestamp > NOW() - INTERVAL 7 DAY`,
    [buyerId]
  );
  const hits = recent[0].hits;
  if (hits >= 5) {
    delta += 5;
    factors.high_frequency = 5;
  }

  // 3. Consecutive daily purchases 7+ days
  const [consec] = await pool.query(
    `SELECT COUNT(DISTINCT DATE(timestamp)) AS days FROM Transactions
     WHERE buyer_id = ? AND status = 'approved' AND timestamp > NOW() - INTERVAL 7 DAY`,
    [buyerId]
  );
  if (consec[0].days >= 7) {
    delta += 20;
    factors.consecutive_daily = 20;
  }

  // 4. Late-night purchase (after 20:00)
  const hour = new Date().getHours();
  if (hour >= 20) {
    delta += 5;
    factors.late_night = 5;
  }

  return { delta, factors };
};

const insertTx = async (pool, buyer_id, shop_id, type, qty, status, reason) => {
  const [res] = await pool.query(
    'INSERT INTO Transactions (buyer_id, shop_id, alcohol_type, quantity, status, reason) VALUES (?, ?, ?, ?, ?, ?)',
    [buyer_id, shop_id, type, qty, status, reason]
  );
  return res.insertId;
};

const logEvent = async (type, userId, role, details, ip) => {
  try {
    await AuditLog.create({ event_type: type, user_id: userId, user_role: role, details, ip_address: ip });
  } catch (e) {
    logger.error('AuditLog insert failed', { message: e.message });
  }
};

/* ─── controllers ─────────────────────────────────────────── */

const submitTransaction = async (req, res, next) => {
  try {
    const { buyer_id, alcohol_type, quantity } = req.body;
    const shop_id = req.user.id;
    const pool = getPool();

    await logEvent('transaction_attempt', req.user.id, req.user.role, { buyer_id, alcohol_type, quantity }, req.ip);

    // 1. Current policy
    const policy = await getCurrentPolicyLocal(pool);
    if (!policy) {
      return res.status(500).json({ error: 'No active policy configured' });
    }

    // 2. Emergency lockdown
    if (policy.emergency_flag) {
      await insertTx(pool, buyer_id, shop_id, alcohol_type, quantity, 'rejected', 'Emergency restriction active');
      return res.status(403).json({ error: 'DENY: Emergency restriction active' });
    }

    // 3. Time restriction (BUG 1 FIX — handles overnight windows)
    if (policy.time_restriction_start && policy.time_restriction_end) {
      const allowed = isWithinAllowedTime(
        policy.time_restriction_start,
        policy.time_restriction_end
      );
      if (!allowed) {
        await insertTx(pool, buyer_id, shop_id, alcohol_type, quantity, 'rejected', 'Outside allowed time window');
        await logEvent('transaction_rejected', shop_id, req.user.role,
          { buyer_id, reason: 'time_restriction' }, req.ip);
        return res.status(403).json({
          error: `DENY: Outside allowed hours (${policy.time_restriction_start} – ${policy.time_restriction_end})`,
        });
      }
    }

    // 4. Buyer profile + blacklist
    const [profiles] = await pool.query(
      'SELECT * FROM BuyerProfiles WHERE buyer_id = ?', [buyer_id]
    );
    if (profiles.length === 0) {
      await insertTx(pool, null, shop_id, alcohol_type, quantity, 'rejected', 'Invalid buyer ID');
      return res.status(404).json({ error: 'DENY: Invalid buyer profile' });
    }
    const profile = profiles[0];

    // 5. Quota check
    if (
      quantity > profile.daily_remaining ||
      quantity > profile.weekly_remaining ||
      quantity > profile.monthly_remaining
    ) {
      await insertTx(pool, buyer_id, shop_id, alcohol_type, quantity, 'rejected', 'Quota exceeded');
      await pool.query(
        'UPDATE BuyerProfiles SET risk_score = LEAST(risk_score + 10, 100) WHERE buyer_id = ?',
        [buyer_id]
      );
      await logEvent('quota_exceeded', shop_id, req.user.role, { buyer_id, quantity }, req.ip);
      return res.status(403).json({ error: 'DENY: Quota exceeded' });
    }

    // 6. Deduct quota (atomic)
    await pool.query(
      `UPDATE BuyerProfiles
       SET daily_remaining   = daily_remaining   - ?,
           weekly_remaining  = weekly_remaining  - ?,
           monthly_remaining = monthly_remaining - ?
       WHERE buyer_id = ?`,
      [quantity, quantity, quantity, buyer_id]
    );

    const txId = await insertTx(pool, buyer_id, shop_id, alcohol_type, quantity, 'approved', null);

    // 7. Multi-factor risk scoring
    const { delta, factors } = await computeRiskDelta(pool, buyer_id, quantity, profile, policy);
    if (delta > 0) {
      await pool.query(
        `UPDATE BuyerProfiles
         SET risk_score   = LEAST(risk_score + ?, 100),
             risk_factors = JSON_MERGE_PATCH(COALESCE(risk_factors, '{}'), ?)
         WHERE buyer_id = ?`,
        [delta, JSON.stringify(factors), buyer_id]
      );
    }

    // 8. Auto-decrement shop inventory if table exists
    try {
      await pool.query(
        `UPDATE ShopInventory
         SET stock_qty = GREATEST(stock_qty - ?, 0)
         WHERE shop_id = ? AND alcohol_type = ?`,
        [quantity, shop_id, alcohol_type]
      );
    } catch (_) { /* table may not exist in fresh installs */ }

    await logEvent('transaction_approved', shop_id, req.user.role,
      { buyer_id, transaction_id: txId, quantity, alcohol_type }, req.ip);

    // Task 6 — real-time broadcast to authority dashboard
    try {
      req.app.get('io')?.to('role:authority').emit('transaction', {
        id: txId, buyer_id, shop_id, alcohol_type, quantity,
        status: 'approved', timestamp: new Date(),
      });
    } catch (_) { /* socket emit is non-fatal */ }

    return res.json({
      message: 'Transaction Approved',
      transaction_id: txId,
      remaining: {
        daily:   profile.daily_remaining   - quantity,
        weekly:  profile.weekly_remaining  - quantity,
        monthly: profile.monthly_remaining - quantity,
      },
    });
  } catch (err) {
    next(err);
  }
};

const getBuyerHistory = async (req, res, next) => {
  try {
    if (req.user.role === 'buyer' && parseInt(req.params.buyerId) !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const pool = getPool();
    const [result] = await pool.query(
      'SELECT * FROM Transactions WHERE buyer_id = ? ORDER BY timestamp DESC',
      [req.params.buyerId]
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const getShopHistory = async (req, res, next) => {
  try {
    if (req.user.role === 'shop' && parseInt(req.params.shopId) !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const pool = getPool();
    const [result] = await pool.query(
      'SELECT * FROM Transactions WHERE shop_id = ? ORDER BY timestamp DESC',
      [req.params.shopId]
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const getRejected = async (req, res, next) => {
  try {
    const pool = getPool();
    const [result] = await pool.query(
      'SELECT * FROM Transactions WHERE status = "rejected" ORDER BY timestamp DESC'
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const getAllTransactions = async (req, res, next) => {
  try {
    const pool = getPool();
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(200, parseInt(req.query.limit) || 50);
    const offset = (page - 1) * limit;
    const { from, to, status } = req.query;

    let where = '1=1';
    const params = [];
    if (from)   { where += ' AND timestamp >= ?'; params.push(from); }
    if (to)     { where += ' AND timestamp <= ?'; params.push(to); }
    if (status) { where += ' AND status = ?';    params.push(status); }

    const [rows] = await pool.query(
      `SELECT t.*, u.name AS buyer_name, s.name AS shop_name
       FROM Transactions t
       LEFT JOIN Users u ON u.id = t.buyer_id
       LEFT JOIN Users s ON s.id = t.shop_id
       WHERE ${where}
       ORDER BY t.timestamp DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM Transactions WHERE ${where}`,
      params
    );
    res.json({ rows, total, page, limit });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  submitTransaction,
  getBuyerHistory,
  getShopHistory,
  getRejected,
  getAllTransactions,
};
