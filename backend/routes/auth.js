const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { login, register, sendOtp, verifyOtp } = require('../controllers/authController');
const { validateLogin, validateRegister, validateOtp } = require('../middleware/validateInput');

// Strict rate limiter for OTP endpoints
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3,
  message: { error: 'Too many OTP requests from this IP, please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', validateLogin, login);
router.post('/register', validateRegister, register);
router.post('/send-otp', otpLimiter, sendOtp);
router.post('/verify-otp', otpLimiter, validateOtp, verifyOtp);

module.exports = router;
