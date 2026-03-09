const express = require('express');
const router = express.Router();
const { getFinancialReport, getOperationalReport } = require('../controllers/reportsController');
const { protect, checkPermissao } = require('../middlewares/authMiddleware');

// Relatório de dinheiro
router.get('/financial', protect, checkPermissao('ver_financeiro'), getFinancialReport);

// Relatório de fluxo de loja
router.get('/operational', protect, checkPermissao('gerenciar_reservas'), getOperationalReport);

module.exports = router;