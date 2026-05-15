const { getPool } = require('../config/mysql');
const AuditLog = require('../models/AuditLog');

const getCurrentPolicyLocal = async (pool) => {
    const [policies] = await pool.query('SELECT * FROM Policies ORDER BY id DESC LIMIT 1');
    return policies[0];
};

const submitTransaction = async (req, res, next) => {
    try {
        const { buyer_id, alcohol_type, quantity } = req.body;
        const shop_id = req.user.id;

        const pool = getPool();

        // Log transaction attempt
        await logEvent('transaction_attempt', req.user.id, req.user.role, { buyer_id, alcohol_type, quantity }, req.ip);

        // 1. Get current policy state
        const policy = await getCurrentPolicyLocal(pool);

        // 2. Check emergency
        if (policy.emergency_flag) {
            await insertTx(pool, buyer_id, shop_id, alcohol_type, quantity, 'rejected', 'Emergency restriction active');
            return res.status(403).json({ error: 'DENY: Emergency restriction active' });
        }

        // 3. Time bounds logic
        const now = new Date();
        const currentTimeString = now.toTimeString().split(' ')[0]; // "14:23:45"
        // if (currentTimeString < policy.time_restriction_start || currentTimeString > policy.time_restriction_end) {
        //     await insertTx(pool, buyer_id, shop_id, alcohol_type, quantity, 'rejected', 'Outside allowed time window');
        //     return res.status(403).json({ error: 'DENY: Outside allowed time window' });
        // }

        // 4. Quota check
        const [profiles] = await pool.query('SELECT * FROM BuyerProfiles WHERE buyer_id = ?', [buyer_id]);
        if (profiles.length === 0) {
            await insertTx(pool, null, shop_id, alcohol_type, quantity, 'rejected', 'Invalid buyer ID');
            return res.status(404).json({ error: 'DENY: Invalid buyer profile' });
        }

        const profile = profiles[0];

        if (quantity > profile.daily_remaining || quantity > profile.weekly_remaining || quantity > profile.monthly_remaining) {
            await insertTx(pool, buyer_id, shop_id, alcohol_type, quantity, 'rejected', 'Quota exceeded');

            // Risk logic trigger: Attempt to buy over quota
            await pool.query('UPDATE BuyerProfiles SET risk_score = risk_score + 10 WHERE buyer_id = ?', [buyer_id]);
            return res.status(403).json({ error: 'DENY: Quota exceeded' });
        }

        // PASS = Approve and reduce quota
        await pool.query(
            `UPDATE BuyerProfiles 
             SET daily_remaining = daily_remaining - ?, 
                 weekly_remaining = weekly_remaining - ?, 
                 monthly_remaining = monthly_remaining - ? 
             WHERE buyer_id = ?`,
            [quantity, quantity, quantity, buyer_id]
        );

        const txId = await insertTx(pool, buyer_id, shop_id, alcohol_type, quantity, 'approved', null);

        // Check if frequency warrants risk flag (mocking a query here for recent buys)
        const [recentBuys] = await pool.query(
            "SELECT COUNT(id) AS hits FROM Transactions WHERE buyer_id = ? AND timestamp > NOW() - INTERVAL 7 DAY",
            [buyer_id]
        );
        if (recentBuys[0].hits > 5) {
            await pool.query('UPDATE BuyerProfiles SET risk_score = risk_score + 5 WHERE buyer_id = ?', [buyer_id]);
        }

        return res.json({ message: 'Transaction Approved', transaction_id: txId });
    } catch (err) {
        next(err);
    }
};

const insertTx = async (pool, buyer_id, shop_id, type, qty, status, reason) => {
    const [res] = await pool.query(
        'INSERT INTO Transactions (buyer_id, shop_id, alcohol_type, quantity, status, reason) VALUES (?, ?, ?, ?, ?, ?)',
        [buyer_id, shop_id, type, qty, status, reason]
    );
    return res.insertId;
};

const getBuyerHistory = async (req, res, next) => {
    try {
        // Enforce access control if it's a buyer
        if (req.user.role === 'buyer' && parseInt(req.params.buyerId) !== req.user.id) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const pool = getPool();
        const [result] = await pool.query('SELECT * FROM Transactions WHERE buyer_id = ? ORDER BY timestamp DESC', [req.params.buyerId]);
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
        const [result] = await pool.query('SELECT * FROM Transactions WHERE shop_id = ? ORDER BY timestamp DESC', [req.params.shopId]);
        res.json(result);
    } catch (err) {
        next(err);
    }
}

const getRejected = async (req, res, next) => {
    try {
        const pool = getPool();
        const [result] = await pool.query('SELECT * FROM Transactions WHERE status = "rejected" ORDER BY timestamp DESC');
        res.json(result);
    } catch (err) {
        next(err);
    }
}

const logEvent = async (type, userId, role, details, ip) => {
    try {
        await AuditLog.create({
            event_type: type,
            user_id: userId,
            user_role: role,
            details,
            ip_address: ip
        });
    } catch (e) {
        console.error('AuditLog insert failed', e.message);
    }
};


module.exports = { submitTransaction, getBuyerHistory, getShopHistory, getRejected };
