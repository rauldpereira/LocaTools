const express = require('express');
const router = express.Router();
const freteController = require('../controllers/freteController');
const { protect, checkPermissao } = require('../middlewares/authMiddleware');

// Público
router.post('/calcular', freteController.calcular);
router.get('/config', freteController.obterConfig); 

// Protegido 
router.put('/config', protect, checkPermissao('configuracoes'), freteController.configurar);

module.exports = router;