const { getPool } = require('../config/mysql');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

const getAnalytics = async (req, res, next) => {
  try {
    const pool = getPool();

    // Total counts
    const [[totals]] = await pool.query(`
      SELECT
        COUNT(*) AS total,
        SUM(status = 'approved') AS approved,
        SUM(status = 'rejected') AS rejected
      FROM Transactions
    `);

    // Daily trend last 30 days
    const [dailyTrend] = await pool.query(`
      SELECT
        DATE(timestamp) AS date,
        SUM(status = 'approved') AS approved,
        SUM(status = 'rejected') AS rejected
      FROM Transactions
      WHERE timestamp >= NOW() - INTERVAL 30 DAY
      GROUP BY DATE(timestamp)
      ORDER BY date ASC
    `);

    // Alcohol distribution
    const [alcoholDistribution] = await pool.query(`
      SELECT alcohol_type AS type, COUNT(*) AS count
      FROM Transactions
      GROUP BY alcohol_type
      ORDER BY count DESC
    `);

    // Regional hotspots
    const [hotspotAreas] = await pool.query(`
      SELECT
        u.shop_location AS region,
        COUNT(*) AS transactions,
        SUM(t.status = 'rejected') AS violations
      FROM Transactions t
      JOIN Users u ON u.id = t.shop_id
      GROUP BY u.shop_location
      ORDER BY transactions DESC
    `);

    // High-risk buyers
    const [[highRisk]] = await pool.query(
      'SELECT COUNT(*) AS count FROM BuyerProfiles WHERE risk_score >= 60'
    );

    res.json({
      ...totals,
      dailyTrend,
      alcoholDistribution,
      hotspotAreas,
      highRiskBuyers: highRisk.count,
    });
  } catch (err) {
    next(err);
  }
};

const getRiskScores = async (req, res, next) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(`
      SELECT bp.buyer_id, u.name, bp.risk_score, bp.risk_factors,
             bp.daily_remaining, bp.weekly_remaining, bp.monthly_remaining
      FROM BuyerProfiles bp
      JOIN Users u ON u.id = bp.buyer_id
      ORDER BY bp.risk_score DESC
    `);
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

module.exports = { getAnalytics, getRiskScores };
