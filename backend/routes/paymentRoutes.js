const express = require('express');
const { processPayment, createCheckoutSession  } = require('../controllers/paymentController');
const { protect, admin } = require('../middlewares/authMiddleware');


const router = express.Router();

router.post('/process', protect, processPayment);
router.post('/create-checkout-session', protect, admin, createCheckoutSession);

module.exports = router;