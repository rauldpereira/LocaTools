const express = require('express');
const { 
  createOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
  deleteOrder,
  generateContract,
} = require('../controllers/reservationController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/', protect, createOrder);
router.get('/my', protect, getMyOrders);
router.get('/contract/:id', protect, generateContract);
router.delete('/:id', protect, deleteOrder);

router.put('/:id', protect, updateOrderStatus);
router.get('/all', protect, getAllOrders);

module.exports = router;