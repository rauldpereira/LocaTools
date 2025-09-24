const express = require('express');
const router = express.Router();
const { updateUnitStatus } = require('../controllers/unitController');
const { getReservationsByUnit } = require('../controllers/reservationController');
const { protect, admin } = require('../middlewares/authMiddleware');


router.put('/:id', protect, admin, updateUnitStatus);
router.get('/:id/reservations', protect, admin, getReservationsByUnit);

module.exports = router;