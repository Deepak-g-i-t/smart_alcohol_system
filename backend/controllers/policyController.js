const { getPool } = require('../config/mysql');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

/* ─── helpers ─────────────────────────────────────────────── */

const logEvent = async (type, userId, role, details, ip) => {
  try {
    await AuditLog.create({ event_type: type, user_id: userId, user_role: role, details, ip_address: ip });
  } catch (e) {
    logger.error('AuditLog insert failed', { message: e.message });
  }
};

/* ─── GET current policy ─────────────────────────────────── */

const getCurrentPolicy = async (req, res, next) => {
  try {
    const pool = getPool();
    const [policies] = await pool.query('SELECT * FROM Policies ORDER BY id DESC LIMIT 1');
    if (policies.length === 0) {
      return res.status(404).json({ message: 'No policy found' });
    }
    res.json(policies[0]);
  } catch (err) {
    next(err);
  }
};

/* ─── UPDATE policy (BUG 2 FIX — UPDATE not INSERT) ─────── */

const updatePolicy = async (req, res, next) => {
  try {
    const {
      daily_limit, weekly_limit, monthly_limit,
      time_restriction_start, time_restriction_end,
      min_age, max_alcohol_percentage,
    } = req.body;

    const pool = getPool();

    // Check if a singleton row exists
    const [existing] = await pool.query('SELECT id FROM Policies ORDER BY id ASC LIMIT 1');

    if (existing.length === 0) {
      // First-time insert
      const [result] = await pool.query(
        `INSERT INTO Policies
           (daily_limit, weekly_limit, monthly_limit,
            time_restriction_start, time_restriction_end, updated_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [daily_limit, weekly_limit, monthly_limit,
         time_restriction_start, time_restriction_end, req.user.id]
      );
      await logEvent('policy_change', req.user.id, req.user.role,
        { updateType: 'initial_create', ...req.body }, req.ip);
      return res.status(201).json({ message: 'Policy created', policyId: result.insertId });
    }

    // Singleton UPDATE — always modify the first (and only) row
    const policyId = existing[0].id;
    await pool.query(
      `UPDATE Policies
       SET daily_limit             = ?,
           weekly_limit            = ?,
           monthly_limit           = ?,
           time_restriction_start  = ?,
           time_restriction_end    = ?,
           updated_by              = ?,
           updated_at              = NOW()
       WHERE id = ?`,
      [daily_limit, weekly_limit, monthly_limit,
       time_restriction_start, time_restriction_end,
       req.user.id, policyId]
    );

    await logEvent('policy_change', req.user.id, req.user.role,
      { updateType: 'general_update', ...req.body }, req.ip);

    res.status(200).json({ message: 'Policy updated successfully', policyId });
  } catch (err) {
    next(err);
  }
};

/* ─── Emergency toggle ───────────────────────────────────── */

const toggleEmergency = async (req, res, next) => {
  try {
    const { emergency_flag } = req.body;
    const pool = getPool();

    await pool.query(
      'UPDATE Policies SET emergency_flag = ?, updated_by = ? ORDER BY id ASC LIMIT 1',
      [emergency_flag ? 1 : 0, req.user.id]
    );

    await logEvent('policy_change', req.user.id, req.user.role,
      { updateType: 'emergency_toggle', flag: emergency_flag }, req.ip);

    // Task 6 — broadcast emergency state change to all connected clients
    try {
      req.app.get('io')?.emit('emergency_toggle', { flag: !!emergency_flag });
    } catch (_) { /* socket emit is non-fatal */ }

    res.status(200).json({
      message: `Emergency mode ${emergency_flag ? 'ACTIVATED' : 'DEACTIVATED'}`,
      emergency_flag: !!emergency_flag,
    });
  } catch (err) {
    next(err);
  }
};

/* ─── Policy history (Priority 1.4) ─────────────────────── */

const getPolicyHistory = async (req, res, next) => {
  try {
    // We read MongoDB audit logs for policy_change events
    const logs = await AuditLog
      .find({ event_type: 'policy_change' })
      .sort({ timestamp: -1 })
      .limit(20)
      .lean();

    res.json(logs);
  } catch (err) {
    next(err);
  }
};

module.exports = { getCurrentPolicy, updatePolicy, toggleEmergency, getPolicyHistory };
