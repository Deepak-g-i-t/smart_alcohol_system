const express = require('express');
const router = express.Router();
const { verifyToken, restrictTo } = require('../middleware/authMiddleware');
const {
  getCurrentPolicy,
  updatePolicy,
  toggleEmergency,
  getPolicyHistory,
} = require('../controllers/policyController');
const { validatePolicyUpdate } = require('../middleware/validateInput');

router.use(verifyToken);

router.get('/', getCurrentPolicy);
router.get('/history', restrictTo('authority'), getPolicyHistory);
router.put('/', restrictTo('authority'), validatePolicyUpdate, updatePolicy);
router.patch('/emergency', restrictTo('authority'), toggleEmergency);

module.exports = router;
