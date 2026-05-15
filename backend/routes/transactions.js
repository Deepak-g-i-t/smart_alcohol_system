const express = require('express');
const router = express.Router();
const { verifyToken, restrictTo } = require('../middleware/authMiddleware');
const {
  submitTransaction,
  getBuyerHistory,
  getShopHistory,
  getRejected,
  getAllTransactions,
} = require('../controllers/transactionController');
const { validateTransaction } = require('../middleware/validateInput');

router.use(verifyToken);

router.get('/', restrictTo('authority'), getAllTransactions);
router.post('/', restrictTo('shop'), validateTransaction, submitTransaction);
router.get('/rejected', restrictTo('authority'), getRejected);
router.get('/buyer/:buyerId', restrictTo('authority', 'buyer'), getBuyerHistory);
router.get('/shop/:shopId', restrictTo('authority', 'shop'), getShopHistory);

module.exports = router;
