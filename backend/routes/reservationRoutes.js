const express = require('express');
const { createReservation, getMyReservations, getAllReservations } = require('../controllers/reservationController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/', protect, createReservation);

router.get('/my', protect, getMyReservations);

router.get('/all', protect, getAllReservations);

module.exports = router;