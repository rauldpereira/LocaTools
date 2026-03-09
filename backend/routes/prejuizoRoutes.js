const express = require('express');
const router = express.Router();
const prejuizoController = require('../controllers/prejuizoController');
const { protect, checkPermissao } = require('../middlewares/authMiddleware'); 

// Acesso restrito ao Financeiro
router.post('/', protect, checkPermissao('ver_financeiro'), prejuizoController.registrar);
router.get('/', protect, checkPermissao('ver_financeiro'), prejuizoController.listar);

module.exports = router;