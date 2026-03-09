const express = require('express');
const router = express.Router();
const { getHorarios, updateHorarios } = require('../controllers/horariosController');
const { protect, checkPermissao } = require('../middlewares/authMiddleware');

// Público
router.get('/', getHorarios); 

// Protegido
router.post('/', protect, checkPermissao('configuracoes'), updateHorarios); 

module.exports = router;