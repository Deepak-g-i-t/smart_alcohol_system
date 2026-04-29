const express = require('express');
const router = express.Router();
const { verifyToken, restrictTo } = require('../middleware/authMiddleware');
const { getSummary, getHighRiskBuyers, getRejectedTransactions, getDailySales } = require('../controllers/analyticsController');

router.use(verifyToken);
router.use(restrictTo('authority'));

router.get('/summary', getSummary);
router.get('/high-risk-buyers', getHighRiskBuyers);
router.get('/rejected-transactions', getRejectedTransactions);
router.get('/daily-sales', getDailySales);

module.exports = router;
