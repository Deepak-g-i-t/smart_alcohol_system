const { getPool } = require('../config/mysql');
const AuditLog = require('../models/AuditLog');

const getCurrentPolicy = async (req, res, next) => {
    try {
        const pool = getPool();
        const [policies] = await pool.query('SELECT * FROM Policies ORDER BY id DESC LIMIT 1');
        if (policies.length === 0) {
            return res.json({ message: 'No policy found' });
        }
        res.json(policies[0]);
    } catch (err) {
        next(err);
    }
};

const updatePolicy = async (req, res, next) => {
    try {
        const { daily_limit, weekly_limit, monthly_limit, time_restriction_start, time_restriction_end } = req.body;
        const pool = getPool();

        const [result] = await pool.query(
            'INSERT INTO Policies (daily_limit, weekly_limit, monthly_limit, time_restriction_start, time_restriction_end, updated_by) VALUES (?, ?, ?, ?, ?, ?)',
            [daily_limit, weekly_limit, monthly_limit, time_restriction_start, time_restriction_end, req.user.id]
        );

        await logEvent('policy_change', req.user.id, req.user.role, { updateType: 'general', ...req.body }, req.ip);

        // Also broadcast or notify shops conceptually
        res.status(200).json({ message: 'Policy updated successfully', policyId: result.insertId });
    } catch (err) {
        next(err);
    }
};

const toggleEmergency = async (req, res, next) => {
    try {
        const { emergency_flag } = req.body;
        const pool = getPool();

        await pool.query(
            'UPDATE Policies SET emergency_flag = ?, updated_by = ? ORDER BY id DESC LIMIT 1',
            [emergency_flag, req.user.id]
        );

        await logEvent('policy_change', req.user.id, req.user.role, { updateType: 'emergency_toggle', flag: emergency_flag }, req.ip);

        res.status(200).json({ message: `Emergency mode ${emergency_flag ? 'ACTIVATED' : 'DEACTIVATED'}` });
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
    } catch (e) { }
};

module.exports = { getCurrentPolicy, updatePolicy, toggleEmergency };
