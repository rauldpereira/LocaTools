const express = require('express');
const { 
  createOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
  deleteOrder,
  generateContract,
  getOrderById,
  signContract,
  confirmManualPayment
} = require('../controllers/reservationController');
const { protect, admin } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/all', protect, admin, getAllOrders); 
router.get('/my', protect, getMyOrders);
router.get('/contract/:id', protect, generateContract);
router.get('/:id', protect, getOrderById);

router.delete('/:id', protect, deleteOrder);

router.put('/:id/sign', protect, signContract);
router.put('/:id', protect, admin, updateOrderStatus); 
router.put('/:id/confirm-manual-payment', protect, admin, confirmManualPayment);

router.post('/', protect, createOrder);

module.exports = router;