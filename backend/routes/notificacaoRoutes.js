const express = require('express');
const router = express.Router();

const notificacaoController = require('../controllers/notificacaoController');

const { protect } = require('../middlewares/authMiddleware');

// Lista as notificações do usuário
router.get('/', protect, notificacaoController.listarMinhasNotificacoes);

// Marca uma como lida
router.put('/:id/read', protect, notificacaoController.marcarComoLida);

// Marca todas como lidas de uma vez
router.put('/read-all', protect, notificacaoController.marcarTodasComoLidas);

// Apaga uma notificação
router.delete('/:id', protect, notificacaoController.deletarNotificacao);

module.exports = router;