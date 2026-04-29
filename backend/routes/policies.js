const express = require('express');
const router = express.Router();
const { verifyToken, restrictTo } = require('../middleware/authMiddleware');
const { getCurrentPolicy, updatePolicy, toggleEmergency } = require('../controllers/policyController');

router.use(verifyToken);
// Only authorities can manage policies
router.get('/current', getCurrentPolicy); // open to all authenticated users for context (like POS checking time)

router.post('/update', restrictTo('authority'), updatePolicy);
router.post('/emergency-toggle', restrictTo('authority'), toggleEmergency);

module.exports = router;
