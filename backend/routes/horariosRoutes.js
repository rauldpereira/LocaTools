const express = require('express');
const router = express.Router();
const { getHorarios, updateHorarios } = require('../controllers/horariosController');
const { protect, admin } = require('../middlewares/authMiddleware');

router.get('/', getHorarios); 
router.put('/', protect, admin, updateHorarios); 

module.exports = router;