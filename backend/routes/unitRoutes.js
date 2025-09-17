const express = require('express');
const router = express.Router();
const { updateUnitStatus } = require('../controllers/unitController');
const { getReservationsByUnit } = require('../controllers/reservationController');
const { protect, admin } = require('../middlewares/authMiddleware');
// Rota para atualizar o status de uma unidade
router.put('/:id', protect, admin, updateUnitStatus);
// Rota para buscar as reservas de uma unidade
router.get('/:id/reservations', protect, admin, getReservationsByUnit);

module.exports = router;