const express = require('express');
const router = express.Router();
const { verifyToken, restrictTo } = require('../middleware/authMiddleware');
const { getAnalytics, getRiskScores } = require('../controllers/analyticsController');

router.use(verifyToken);
router.use(restrictTo('authority'));

router.get('/', getAnalytics);
router.get('/risk-scores', getRiskScores);

module.exports = router;
