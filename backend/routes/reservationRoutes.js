const express = require('express');
const router = express.Router();

// 1. GARANTA QUE AS NOVAS FUNÇÕES ESTÃO SENDO IMPORTADAS
const { 
    createOrder,
    getMyOrders,
    getAllOrders,
    getOrderById,
    updateOrderStatus,
    deleteOrder,
    generateContract,
    signContract,
    cancelOrder,
    confirmManualPayment,
    checkRescheduleAvailability, 
    rescheduleOrder            
} = require('../controllers/reservationController');

const { protect, admin } = require('../middlewares/authMiddleware');


router.post('/', protect, createOrder);
router.post('/:id/check-reschedule', protect, checkRescheduleAvailability);

router.get('/all', protect, admin, getAllOrders);
router.get('/my', protect, getMyOrders);
router.get('/contract/:id', protect, generateContract);
router.get('/:id', protect, getOrderById);

router.put('/:id/sign', protect, signContract);
router.put('/:id/cancel', protect, cancelOrder);
router.put('/:id/confirm-manual-payment', protect, admin, confirmManualPayment);
router.put('/:id/reschedule', protect, rescheduleOrder);
router.put('/:id', protect, admin, updateOrderStatus);

router.delete('/:id', protect, deleteOrder);

module.exports = router;