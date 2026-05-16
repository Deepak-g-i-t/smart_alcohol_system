/**
 * express-validator middleware chains for all POST routes (Priority 4.3)
 */

const { body, param, query, validationResult } = require('express-validator');

/* ─── Helper: run validation and return 422 on error ──────── */
const validate = (validations) => {
  return async (req, res, next) => {
    for (const v of validations) {
      await v.run(req);
    }
    const errors = validationResult(req);
    if (errors.isEmpty()) return next();
    return res.status(422).json({
      error: 'Validation failed',
      fields: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  };
};

/* ─── Auth validators ────────────────────────────────────── */

const validateLogin = validate([
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
]);

const validateRegister = validate([
  body('name')
    .trim()
    .notEmpty().withMessage('name is required')
    .isLength({ max: 255 }).withMessage('name too long'),
  body('email')
    .trim()
    .isEmail().withMessage('Valid email address required'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role')
    .isIn(['authority', 'shop', 'buyer']).withMessage('role must be authority, shop, or buyer'),
]);

const validateOtp = validate([
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be a 6-digit number'),
]);

/* ─── Transaction validator ───────────────────────────────── */

const ALCOHOL_TYPES = ['Whiskey', 'Beer', 'Rum', 'Vodka', 'Wine', 'Brandy', 'Gin', 'Other'];

const validateTransaction = validate([
  body('buyer_id').isInt({ min: 1 }).withMessage('buyer_id must be a positive integer'),
  body('alcohol_type')
    .isIn(ALCOHOL_TYPES)
    .withMessage(`alcohol_type must be one of: ${ALCOHOL_TYPES.join(', ')}`),
  body('quantity')
    .isInt({ min: 1, max: 100 })
    .withMessage('quantity must be an integer between 1 and 100'),
]);

/* ─── Policy validator ────────────────────────────────────── */

const validatePolicyUpdate = validate([
  body('daily_limit').isInt({ min: 1, max: 100 }).withMessage('daily_limit must be 1–100'),
  body('weekly_limit').isInt({ min: 1, max: 500 }).withMessage('weekly_limit must be 1–500'),
  body('monthly_limit').isInt({ min: 1, max: 2000 }).withMessage('monthly_limit must be 1–2000'),
  body('time_restriction_start')
    .matches(/^\d{2}:\d{2}(:\d{2})?$/)
    .withMessage('time_restriction_start must be HH:MM or HH:MM:SS'),
  body('time_restriction_end')
    .matches(/^\d{2}:\d{2}(:\d{2})?$/)
    .withMessage('time_restriction_end must be HH:MM or HH:MM:SS'),
]);

/* ─── Inventory validator ─────────────────────────────────── */

const validateInventoryUpdate = validate([
  body('alcohol_type').isIn(ALCOHOL_TYPES).withMessage(`alcohol_type must be one of: ${ALCOHOL_TYPES.join(', ')}`),
  body('stock_qty').isInt({ min: 0, max: 100000 }).withMessage('stock_qty must be 0–100000'),
  body('low_threshold').optional().isInt({ min: 0 }).withMessage('low_threshold must be non-negative integer'),
]);

module.exports = {
  validateLogin,
  validateRegister,
  validateOtp,
  validateTransaction,
  validatePolicyUpdate,
  validateInventoryUpdate,
};
