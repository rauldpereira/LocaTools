const express = require('express');
const router = express.Router();
const { updateUnitStatus, deleteUnit, updateUnitDetails } = require('../controllers/unitController');
const { getReservationsByUnit } = require('../controllers/reservationController');
const { protect, admin } = require('../middlewares/authMiddleware');


router.put('/:id', protect, admin, updateUnitStatus);
router.get('/:id/reservations', protect, admin, getReservationsByUnit);
router.delete('/:id', protect, admin, deleteUnit);
router.put('/:id/details', protect, admin, updateUnitDetails);


module.exports = router;