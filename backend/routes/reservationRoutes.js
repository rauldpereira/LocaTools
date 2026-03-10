const express = require('express');
const router = express.Router();

const { 
    createOrder,
    getMyOrders,
    getAllOrders,
    getOrderById,
    updateOrderStatus,
    generateContract,
    signContract,
    cancelOrder,
    confirmManualPayment,
    checkRescheduleAvailability, 
    rescheduleOrder,
    skipReturnInspection,
    finalizarComPendencia,
    recoverDebt, 
    calcularMultaAtraso           
} = require('../controllers/reservationController');

const { protect, checkPermissao } = require('../middlewares/authMiddleware');

router.post('/', protect, createOrder);

router.get('/my', protect, getMyOrders);
router.get('/all', protect, checkPermissao('gerenciar_reservas', 'fazer_vistoria'), getAllOrders);

router.get('/contract/:id', protect, generateContract);
router.get('/:id', protect, getOrderById);
router.post('/:id/check-reschedule', protect, checkRescheduleAvailability);
router.put('/:id/sign', protect, signContract);
router.put('/:id/cancel', protect, cancelOrder);
router.put('/:id/reschedule', protect, rescheduleOrder);

// ROTAS DE OPERAÇÃO
router.get('/:id/calculate-penalty', protect, checkPermissao('gerenciar_reservas'), calcularMultaAtraso);
router.put('/:id', protect, checkPermissao('gerenciar_reservas'), updateOrderStatus);
router.put('/:id/skip-inspection', protect, checkPermissao('gerenciar_reservas'), skipReturnInspection);

// ROTAS FINANCEIRAS
router.put('/:id/confirm-manual-payment', protect, checkPermissao('ver_financeiro'), confirmManualPayment);
router.put('/:id/finish-with-debt', protect, checkPermissao('ver_financeiro'), finalizarComPendencia);
router.put('/:id/recover-debt', protect, checkPermissao('ver_financeiro'), recoverDebt);

module.exports = router;