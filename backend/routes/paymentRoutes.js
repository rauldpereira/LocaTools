const express = require('express');
const { processPayment, createPaymentIntent, handleWebhook } = require('../controllers/paymentController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// apenas para usuários logados
router.post('/process', protect, processPayment);
router.post('/create-payment-intent', protect, createPaymentIntent);

// Webhook para Mercado Pago (público)
router.post('/webhook', handleWebhook);

module.exports = router;