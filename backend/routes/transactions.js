const express = require('express');
const router = express.Router();
const { verifyToken, restrictTo } = require('../middleware/authMiddleware');
const { submitTransaction, getBuyerHistory, getShopHistory, getRejected } = require('../controllers/transactionController');

// All transaction routes require authentication
router.use(verifyToken);

// Shop submitting a transaction
router.post('/submit', restrictTo('shop'), submitTransaction);

// Both shop and authority can view a specific shop's history
router.get('/shop/:shopId', restrictTo('authority', 'shop'), getShopHistory);

// Buyer can view their own history (and authority can view anyone's)
router.get('/history/:buyerId', restrictTo('authority', 'buyer'), getBuyerHistory);

// Authority can view rejected transactions
router.get('/rejected', restrictTo('authority'), getRejected);

module.exports = router;
