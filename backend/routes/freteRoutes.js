const express = require('express');
const router = express.Router();
const freteController = require('../controllers/freteController');

// Cliente chama essa pra saber quanto vai pagar
router.post('/calcular', freteController.calcular);

// Admin chama essas pra definir o preço
router.get('/config', freteController.obterConfig);
router.put('/config', freteController.configurar);

module.exports = router;