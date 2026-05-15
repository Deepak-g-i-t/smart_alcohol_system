const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const { getPool } = require('../config/mysql');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

/* ─── In-memory OTP store (TTL 5 min) ───────────────────── */
// Structure: { [email]: { hash: string, expires: number, attempts: number } }
const otpStore = new Map();
const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes

/* ─── In-memory brute-force tracker (Priority 4.2) ─────── */
// Structure: { [ip]: { count: number, lockedUntil: number } }
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000; // 15 minutes

const checkBruteForce = (ip) => {
  const entry = loginAttempts.get(ip) || { count: 0, lockedUntil: 0 };
  if (Date.now() < entry.lockedUntil) {
    const remaining = Math.ceil((entry.lockedUntil - Date.now()) / 60000);
    return { locked: true, remaining };
  }
  return { locked: false, entry };
};

const recordFailedAttempt = (ip) => {
  const entry = loginAttempts.get(ip) || { count: 0, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCK_MS;
    entry.count = 0; // reset counter after lock
  }
  loginAttempts.set(ip, entry);
};

const clearAttempts = (ip) => loginAttempts.delete(ip);

/* ─── helpers ─────────────────────────────────────────────── */

const logEvent = async (type, userId, role, details, ip) => {
  try {
    await AuditLog.create({ event_type: type, user_id: userId, user_role: role, details, ip_address: ip });
  } catch (e) {
    logger.error('AuditLog insert failed', { message: e.message });
  }
};

/* ─── Register ────────────────────────────────────────────── */

const register = async (req, res, next) => {
  try {
    const { name, role, email, password, shop_location } = req.body;

    if (!name || !role || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const pool = getPool();
    const [existing] = await pool.query('SELECT id FROM Users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hash = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      'INSERT INTO Users (name, role, email, password_hash, shop_location) VALUES (?, ?, ?, ?, ?)',
      [name, role, hash, email, shop_location || null]
    );

    if (role === 'buyer') {
      await pool.query(
        `INSERT INTO BuyerProfiles
           (buyer_id, daily_limit, weekly_limit, monthly_limit,
            daily_remaining, weekly_remaining, monthly_remaining)
         VALUES (?, 2, 10, 30, 2, 10, 30)`,
        [result.insertId]
      );
    }

    await logEvent('user_registered', result.insertId, role, { email }, req.ip);
    res.status(201).json({ message: 'User registered successfully', userId: result.insertId });
  } catch (err) {
    next(err);
  }
};

/* ─── Login ──────────────────────────────────────────────── */

const login = async (req, res, next) => {
  try {
    const ip = req.ip;
    const { locked, remaining } = checkBruteForce(ip);
    if (locked) {
      return res.status(429).json({
        error: `Account locked due to too many failed attempts. Try again in ${remaining} minutes.`,
      });
    }

    const { email, password } = req.body;
    const pool = getPool();
    const [users] = await pool.query('SELECT * FROM Users WHERE email = ?', [email]);

    if (users.length === 0) {
      recordFailedAttempt(ip);
      await logEvent('login_failed', null, null, { email, reason: 'no_user' }, ip);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      recordFailedAttempt(ip);
      await logEvent('login_failed', user.id, user.role, { reason: 'wrong_password' }, ip);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    clearAttempts(ip);

    // If OTP_ENABLED, only return partial success and require OTP verification
    if (process.env.OTP_ENABLED === 'true') {
      // Generate OTP and cache it
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      const otpHash = await bcrypt.hash(otp, 10);
      otpStore.set(email, {
        hash: otpHash,
        expires: Date.now() + OTP_TTL_MS,
        userId: user.id,
        role: user.role,
        name: user.name,
      });

      logger.info(`[OTP] Generated for ${email}: ${otp}`); // In prod, send via SMS/email
      await logEvent('otp_sent', user.id, user.role, { email }, ip);

      return res.status(200).json({
        otpRequired: true,
        message: 'OTP sent. Check your registered contact.',
        // In demo mode, we expose the OTP for easy testing
        ...(process.env.NODE_ENV !== 'production' ? { _demo_otp: otp } : {}),
      });
    }

    // No OTP — issue token directly
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    await logEvent('login_success', user.id, user.role, {}, ip);
    res.json({ token, role: user.role, name: user.name, id: user.id });
  } catch (err) {
    next(err);
  }
};

/* ─── Send OTP (BUG 5 FIX) ──────────────────────────────── */

const sendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email is required' });

    const pool = getPool();
    const [users] = await pool.query('SELECT id, role, name FROM Users WHERE email = ?', [email]);
    if (users.length === 0) {
      // Return 200 to not reveal whether email exists (security practice)
      return res.status(200).json({ message: 'If this email is registered, an OTP has been sent.' });
    }

    const user = users[0];
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = await bcrypt.hash(otp, 10);
    otpStore.set(email, {
      hash: otpHash,
      expires: Date.now() + OTP_TTL_MS,
      userId: user.id,
      role: user.role,
      name: user.name,
      attempts: 0,
    });

    logger.info(`[OTP] Generated for ${email}: ${otp}`);
    await logEvent('otp_sent', user.id, user.role, { email }, req.ip);

    res.json({
      message: 'OTP sent successfully',
      ...(process.env.NODE_ENV !== 'production' ? { _demo_otp: otp } : {}),
    });
  } catch (err) {
    next(err);
  }
};

/* ─── Verify OTP ─────────────────────────────────────────── */

const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: 'email and otp are required' });
    }

    const stored = otpStore.get(email);
    if (!stored) {
      return res.status(400).json({ error: 'No OTP requested or OTP expired' });
    }
    if (Date.now() > stored.expires) {
      otpStore.delete(email);
      return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
    }

    // Rate limit OTP attempts
    stored.attempts = (stored.attempts || 0) + 1;
    if (stored.attempts > 3) {
      otpStore.delete(email);
      return res.status(429).json({ error: 'Too many OTP attempts. Request a new OTP.' });
    }

    const isValid = await bcrypt.compare(otp, stored.hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid OTP' });
    }

    otpStore.delete(email);

    const token = jwt.sign(
      { id: stored.userId, role: stored.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    await logEvent('login_success_otp', stored.userId, stored.role, { email }, req.ip);
    res.json({ token, role: stored.role, name: stored.name, id: stored.userId });
  } catch (err) {
    next(err);
  }
};

module.exports = { login, register, sendOtp, verifyOtp };
