const { getPool } = require('../config/mysql');

const getSummary = async (req, res, next) => {
    try {
        const pool = getPool();
        const [sales] = await pool.query('SELECT SUM(quantity) as val FROM Transactions WHERE status="approved" AND DATE(timestamp) = CURDATE()');
        const [rejected] = await pool.query('SELECT COUNT(*) as val FROM Transactions WHERE status="rejected" AND DATE(timestamp) = CURDATE()');
        const [activeRisk] = await pool.query('SELECT COUNT(*) as val FROM BuyerProfiles WHERE risk_score > 20');

        res.json({
            sales_today: sales[0].val || 0,
            rejected_today: rejected[0].val || 0,
            high_risk_users: activeRisk[0].val || 0
        });
    } catch (err) { next(err); }
};

const getHighRiskBuyers = async (req, res, next) => {
    try {
        const pool = getPool();
        const [buyers] = await pool.query(`
            SELECT b.buyer_id, u.name, u.email, b.risk_score 
            FROM BuyerProfiles b 
            JOIN Users u ON u.id = b.buyer_id 
            ORDER BY b.risk_score DESC LIMIT 5
        `);
        res.json(buyers);
    } catch (err) { next(err); }
};

const getRejectedTransactions = async (req, res, next) => {
    try {
        const pool = getPool();
        const [txs] = await pool.query('SELECT * FROM Transactions WHERE status="rejected" ORDER BY timestamp DESC LIMIT 50');
        res.json(txs);
    } catch (err) { next(err); }
}

const getDailySales = async (req, res, next) => {
    try {
        const pool = getPool();
        const [data] = await pool.query(`
           SELECT DATE(timestamp) as date, SUM(quantity) as total_qty
           FROM Transactions 
           WHERE status="approved" 
           GROUP BY DATE(timestamp)
           ORDER BY date DESC LIMIT 30
        `);
        res.json(data);
    } catch (err) { next(err); }
}

module.exports = { getSummary, getHighRiskBuyers, getRejectedTransactions, getDailySales };
