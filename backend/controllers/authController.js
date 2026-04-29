const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool } = require('../config/mysql');
const AuditLog = require('../models/AuditLog');

const register = async (req, res, next) => {
    try {
        const { name, role, email, password, shop_location } = req.body;

        // Validating the input generically
        if (!name || !role || !email || !password) {
            return res.status(400).json({ error: 'Missing fields' });
        }

        const pool = getPool();
        const [existing] = await pool.query('SELECT * FROM Users WHERE email = ?', [email]);
        if (existing.length > 0) return res.status(400).json({ error: 'Email already exists' });

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        const [result] = await pool.query(
            'INSERT INTO Users (name, role, email, password_hash, shop_location) VALUES (?, ?, ?, ?, ?)',
            [name, role, email, hash, shop_location || null]
        );

        // If it's a buyer, initialize their profile
        if (role === 'buyer') {
            await pool.query(
                `INSERT INTO BuyerProfiles (buyer_id, daily_limit, weekly_limit, monthly_limit, daily_remaining, weekly_remaining, monthly_remaining) 
                 VALUES (?, 2, 10, 30, 2, 10, 30)`,
                [result.insertId]
            );
        }

        res.status(201).json({ message: 'User registered successfully', userId: result.insertId });
    } catch (err) {
        next(err);
    }
};

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const pool = getPool();
        const [users] = await pool.query('SELECT * FROM Users WHERE email = ?', [email]);
        if (users.length === 0) {
            await logEvent('login_attempt_failed', null, null, { email }, req.ip);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            await logEvent('login_attempt_failed', user.id, user.role, { reason: 'wrong_password' }, req.ip);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
        await logEvent('login_success', user.id, user.role, {}, req.ip);

        res.json({ token, role: user.role, name: user.name, id: user.id });
    } catch (err) {
        next(err);
    }
};

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

module.exports = { login, register };
