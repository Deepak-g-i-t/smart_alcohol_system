const express = require('express');
const router = express.Router();
const { login, register } = require('../controllers/authController');

router.post('/login', login);
router.post('/register', register);

// OTP Verification would go here as an extension
// router.post('/verify-otp', verifyOtp);

module.exports = router;
