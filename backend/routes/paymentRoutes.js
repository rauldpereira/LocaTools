const express = require('express');
const { processPayment } = require('../controllers/paymentController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/process', protect, processPayment);

module.exports = router;