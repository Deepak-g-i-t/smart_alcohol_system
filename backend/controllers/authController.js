const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { getPool } = require('../config/mysql');
const AuditLog = require('../models/AuditLog');
const logger   = require('../utils/logger');

/* ─── In-memory OTP store (TTL 5 min) ───────────────────────── */
const otpStore   = new Map();
const OTP_TTL_MS = 5 * 60 * 1000;

/* ─── Brute-force protection ─────────────────────────────────── */
const loginAttempts = new Map();
const MAX_ATTEMPTS  = 5;
const LOCK_MS       = 15 * 60 * 1000;

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
    entry.count = 0;
  }
  loginAttempts.set(ip, entry);
};

const clearAttempts = (ip) => loginAttempts.delete(ip);

/* ─── Audit helper (non-fatal) ───────────────────────────────── */
const logEvent = async (type, userId, role, details, ip) => {
  try {
    await AuditLog.create({ event_type: type, user_id: userId, user_role: role, details, ip_address: ip });
  } catch (e) {
    logger.error('AuditLog insert failed', { message: e.message });
  }
};

/* ══════════════════════════════════════════════════════════════
   REGISTER
   ══════════════════════════════════════════════════════════════ */
const register = async (req, res, next) => {
  try {
    logger.info('[register] Incoming payload', {
      ...req.body,
      password: '[REDACTED]',
    });

    const {
      name, role, email, password,
      // Common optional
      phone, address, district,
      // Buyer
      age, govt_id_sim,
      // Shop
      shop_name, license_number, shop_address, shop_phone,
      // Authority
      department, designation, authority_code,
    } = req.body;

    /* ── 1. Required field validation ────────────────────────── */
    const missing = [];
    if (!name?.trim())    missing.push('name');
    if (!email?.trim())   missing.push('email');
    if (!password)        missing.push('password');
    if (!role)            missing.push('role');
    if (missing.length) {
      return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
    }

    if (!['authority', 'shop', 'buyer'].includes(role)) {
      return res.status(400).json({ error: 'role must be authority, shop, or buyer' });
    }

    /* ── 2. Age check for buyers ─────────────────────────────── */
    if (role === 'buyer') {
      const parsedAge = parseInt(age);
      if (!age || isNaN(parsedAge) || parsedAge < 21) {
        return res.status(400).json({ error: 'Buyers must be at least 21 years old' });
      }
    }

    /* ── 3. Shop required fields ─────────────────────────────── */
    if (role === 'shop') {
      if (!shop_name?.trim())       return res.status(400).json({ error: 'shop_name is required for shop accounts' });
      if (!license_number?.trim())  return res.status(400).json({ error: 'license_number is required for shop accounts' });
    }

    /* ── 4. Authority required fields ────────────────────────── */
    if (role === 'authority') {
      if (!department?.trim())     return res.status(400).json({ error: 'department is required for authority accounts' });
      if (!authority_code?.trim()) return res.status(400).json({ error: 'authority_code is required for authority accounts' });
    }

    const pool = getPool();

    /* ── 5. Duplicate email check ────────────────────────────── */
    const [existing] = await pool.query(
      'SELECT id FROM Users WHERE email = ?',
      [email.trim().toLowerCase()]
    );
    if (existing.length > 0) {
      logger.warn('[register] Duplicate email attempted', { email });
      return res.status(409).json({ error: 'This email is already registered. Please sign in instead.' });
    }

    /* ── 6. Hash password ────────────────────────────────────── */
    const hash = await bcrypt.hash(password, 12);

    /* ── 7. Resolve phone/address for all roles ──────────────── */
    const resolvedPhone   = role === 'shop' ? (shop_phone || phone || null) : (phone || null);
    const resolvedAddress = role === 'shop' ? (shop_address || address || null) : (address || null);

    /* ── 8. Insert into Users ────────────────────────────────── */
    let insertResult;
    try {
      [insertResult] = await pool.query(
        `INSERT INTO Users
           (name, role, email, password_hash, shop_location,
            phone, address, district, age, dept, authority_code)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          name.trim(),
          role,
          email.trim().toLowerCase(),
          hash,
          district || null,                         // shop_location reused for district
          resolvedPhone,
          resolvedAddress,
          district || null,
          role === 'buyer' ? parseInt(age) : null,
          department || null,                        // dept column
          authority_code || null,
        ]
      );
    } catch (dbErr) {
      logger.error('[register] Users INSERT failed', { message: dbErr.message, code: dbErr.code });
      // Surface meaningful DB errors to client in dev
      if (dbErr.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'Email already registered.' });
      }
      if (dbErr.code === 'ER_BAD_FIELD_ERROR') {
        return res.status(500).json({ error: 'Database schema mismatch — run schema_additions.sql migration.' });
      }
      throw dbErr; // re-throw for generic handler
    }

    const userId = insertResult.insertId;
    logger.info('[register] User created', { userId, role, email });

    /* ── 9. Role-specific profile creation ───────────────────── */
    if (role === 'buyer') {
      let dailyLimit = 3, weeklyLimit = 15, monthlyLimit = 30;
      try {
        const [policies] = await pool.query(
          'SELECT daily_limit, weekly_limit, monthly_limit FROM Policies ORDER BY id ASC LIMIT 1'
        );
        if (policies.length) {
          dailyLimit   = policies[0].daily_limit   || dailyLimit;
          weeklyLimit  = policies[0].weekly_limit  || weeklyLimit;
          monthlyLimit = policies[0].monthly_limit || monthlyLimit;
        }
      } catch (_) { /* fallback to defaults */ }

      try {
        await pool.query(
          `INSERT INTO BuyerProfiles
             (buyer_id, daily_limit, weekly_limit, monthly_limit,
              daily_remaining, weekly_remaining, monthly_remaining,
              risk_score)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
          [userId, dailyLimit, weeklyLimit, monthlyLimit,
           dailyLimit, weeklyLimit, monthlyLimit]
        );
        logger.info('[register] BuyerProfile created', { userId });
      } catch (bpErr) {
        logger.error('[register] BuyerProfile INSERT failed', { message: bpErr.message });
        // Non-fatal — user account still created, profile can be created later
      }
    }

    if (role === 'shop') {
      try {
        await pool.query(
          `INSERT INTO Shops
             (user_id, shop_name, license_number, address, district, phone, status)
           VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
          [
            userId,
            shop_name.trim(),
            license_number.trim(),
            resolvedAddress,
            district || null,
            resolvedPhone,
          ]
        );
        logger.info('[register] Shop profile created', { userId, shop_name });
      } catch (shopErr) {
        logger.error('[register] Shop INSERT failed', { message: shopErr.message });
        // Non-fatal
      }
    }

    /* ── 10. Audit log ───────────────────────────────────────── */
    await logEvent('user_registered', userId, role, { email: email.trim().toLowerCase(), name }, req.ip);

    /* ── 11. Issue JWT (auto-login after registration) ───────── */
    const token = jwt.sign(
      { id: userId, role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    logger.info('[register] Registration successful', { userId, role });
    return res.status(201).json({
      message: 'Account created successfully',
      token,
      role,
      name: name.trim(),
      id:   userId,
    });

  } catch (err) {
    logger.error('[register] Unhandled error', { message: err.message, stack: err.stack });
    next(err);
  }
};

/* ══════════════════════════════════════════════════════════════
   LOGIN
   ══════════════════════════════════════════════════════════════ */
const login = async (req, res, next) => {
  try {
    const ip = req.ip;
    const { locked, remaining } = checkBruteForce(ip);
    if (locked) {
      return res.status(429).json({
        error: `Too many failed attempts. Try again in ${remaining} minute(s).`,
      });
    }

    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const pool = getPool();
    const [users] = await pool.query(
      'SELECT id, name, role, email, password_hash FROM Users WHERE email = ?',
      [email.trim().toLowerCase()]
    );

    if (!users.length) {
      recordFailedAttempt(ip);
      await logEvent('login_failed', null, null, { email, reason: 'no_user' }, ip);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      recordFailedAttempt(ip);
      await logEvent('login_failed', user.id, user.role, { reason: 'wrong_password' }, ip);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    clearAttempts(ip);

    if (process.env.OTP_ENABLED === 'true') {
      const otp     = String(Math.floor(100000 + Math.random() * 900000));
      const otpHash = await bcrypt.hash(otp, 10);
      otpStore.set(email, {
        hash: otpHash, expires: Date.now() + OTP_TTL_MS,
        userId: user.id, role: user.role, name: user.name, attempts: 0,
      });
      logger.info(`[OTP] Generated for ${email}: ${otp}`);
      await logEvent('otp_sent', user.id, user.role, { email }, ip);
      return res.status(200).json({
        otpRequired: true,
        message: 'OTP sent. Check your registered contact.',
        ...(process.env.NODE_ENV !== 'production' ? { _demo_otp: otp } : {}),
      });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    await logEvent('login_success', user.id, user.role, {}, ip);
    return res.json({ token, role: user.role, name: user.name, id: user.id });

  } catch (err) {
    logger.error('[login] Error', { message: err.message });
    next(err);
  }
};

/* ══════════════════════════════════════════════════════════════
   OTP: SEND
   ══════════════════════════════════════════════════════════════ */
const sendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email is required' });

    const pool = getPool();
    const [users] = await pool.query(
      'SELECT id, role, name FROM Users WHERE email = ?',
      [email.trim().toLowerCase()]
    );

    if (!users.length) {
      return res.status(200).json({ message: 'If this email is registered, an OTP has been sent.' });
    }

    const user    = users[0];
    const otp     = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = await bcrypt.hash(otp, 10);

    otpStore.set(email, {
      hash: otpHash, expires: Date.now() + OTP_TTL_MS,
      userId: user.id, role: user.role, name: user.name, attempts: 0,
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

/* ══════════════════════════════════════════════════════════════
   OTP: VERIFY
   ══════════════════════════════════════════════════════════════ */
const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: 'email and otp are required' });
    }

    const stored = otpStore.get(email);
    if (!stored)                      return res.status(400).json({ error: 'No OTP requested or OTP expired' });
    if (Date.now() > stored.expires)  { otpStore.delete(email); return res.status(400).json({ error: 'OTP expired. Request a new one.' }); }

    stored.attempts = (stored.attempts || 0) + 1;
    if (stored.attempts > 3) {
      otpStore.delete(email);
      return res.status(429).json({ error: 'Too many OTP attempts. Request a new OTP.' });
    }

    const isValid = await bcrypt.compare(otp, stored.hash);
    if (!isValid) return res.status(401).json({ error: 'Invalid OTP' });

    otpStore.delete(email);

    const token = jwt.sign(
      { id: stored.userId, role: stored.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    await logEvent('login_success_otp', stored.userId, stored.role, { email }, req.ip);
    return res.json({ token, role: stored.role, name: stored.name, id: stored.userId });
  } catch (err) {
    next(err);
  }
};

module.exports = { login, register, sendOtp, verifyOtp };
