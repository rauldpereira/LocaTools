const express = require('express');
const { 
  createReservation, 
  getMyReservations, 
  getAllReservations,
  updateReservationStatus, 
  deleteReservation,
  generateContract,
} = require('../controllers/reservationController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/', protect, createReservation);
router.get('/my', protect, getMyReservations);
router.get('/contract/:id', protect, generateContract);
router.delete('/:id', protect, deleteReservation);

router.put('/:id', protect, updateReservationStatus);
router.get('/all', protect, getAllReservations);

module.exports = router;