const express = require('express');
const router = express.Router();
const freteController = require('../controllers/freteController');
const { protect, checkPermissao } = require('../middlewares/authMiddleware');

// Público
router.post('/calcular', freteController.calcular);

// Protegido
router.get('/config', protect, checkPermissao('configuracoes'), freteController.obterConfig);
router.put('/config', protect, checkPermissao('configuracoes'), freteController.configurar);

module.exports = router;