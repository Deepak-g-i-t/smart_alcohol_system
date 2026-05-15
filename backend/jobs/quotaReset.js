/**
 * Quota Auto-Reset Cron Jobs (Priority 1.1 / BUG 3 fix)
 *
 * Schedules:
 *  - Daily  → midnight every day:        reset daily_remaining  = daily_limit
 *  - Weekly → Monday midnight:           reset weekly_remaining = weekly_limit
 *  - Monthly → 1st of month midnight:    reset monthly_remaining = monthly_limit
 *
 * Each reset is wrapped in a MySQL transaction for atomicity.
 * Each reset event is logged to MongoDB AuditLog.
 */

const cron = require('node-cron');
const { getPool } = require('../config/mysql');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

const logResetEvent = async (type, details) => {
  try {
    await AuditLog.create({
      event_type: type,
      user_id: null,
      user_role: 'system',
      details,
      ip_address: '127.0.0.1',
    });
  } catch (e) {
    logger.error('AuditLog reset event failed', { message: e.message });
  }
};

/* ─── Daily reset ────────────────────────────────────────── */
// Runs at 00:00 every day
const scheduleDailyReset = () => {
  cron.schedule('0 0 * * *', async () => {
    logger.info('[CRON] Running daily quota reset');
    const pool = getPool();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [result] = await conn.query(
        'UPDATE BuyerProfiles SET daily_remaining = daily_limit'
      );
      await conn.commit();
      logger.info(`[CRON] Daily reset complete — ${result.affectedRows} profiles updated`);
      await logResetEvent('quota_reset_daily', { affected: result.affectedRows });
    } catch (err) {
      await conn.rollback();
      logger.error('[CRON] Daily reset FAILED — rolled back', { message: err.message });
    } finally {
      conn.release();
    }
  });
};

/* ─── Weekly reset ───────────────────────────────────────── */
// Runs at 00:00 every Monday (weekday 1)
const scheduleWeeklyReset = () => {
  cron.schedule('0 0 * * 1', async () => {
    logger.info('[CRON] Running weekly quota reset');
    const pool = getPool();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [result] = await conn.query(
        'UPDATE BuyerProfiles SET weekly_remaining = weekly_limit'
      );
      await conn.commit();
      logger.info(`[CRON] Weekly reset complete — ${result.affectedRows} profiles updated`);
      await logResetEvent('quota_reset_weekly', { affected: result.affectedRows });
    } catch (err) {
      await conn.rollback();
      logger.error('[CRON] Weekly reset FAILED — rolled back', { message: err.message });
    } finally {
      conn.release();
    }
  });
};

/* ─── Monthly reset ──────────────────────────────────────── */
// Runs at 00:00 on the 1st of every month
const scheduleMonthlyReset = () => {
  cron.schedule('0 0 1 * *', async () => {
    logger.info('[CRON] Running monthly quota reset');
    const pool = getPool();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [result] = await conn.query(
        'UPDATE BuyerProfiles SET monthly_remaining = monthly_limit'
      );
      await conn.commit();
      logger.info(`[CRON] Monthly reset complete — ${result.affectedRows} profiles updated`);
      await logResetEvent('quota_reset_monthly', { affected: result.affectedRows });
    } catch (err) {
      await conn.rollback();
      logger.error('[CRON] Monthly reset FAILED — rolled back', { message: err.message });
    } finally {
      conn.release();
    }
  });
};

const startCronJobs = () => {
  scheduleDailyReset();
  scheduleWeeklyReset();
  scheduleMonthlyReset();
  logger.info('[CRON] All quota reset jobs scheduled');
};

module.exports = { startCronJobs };
