const express = require('express');
const router = express.Router();
const calendarioController = require('../controllers/calendarioController');
const mesPublicadoController = require('../controllers/mesPublicadoController');
const { protect, checkPermissao } = require('../middlewares/authMiddleware');

// ROTAS PÚBLICAS
router.get(
    '/calendario/status-mensal',
    calendarioController.getStatusMensal
);

router.get(
    '/calendario/meses-publicados',
    mesPublicadoController.getMesesPublicados
);

// ROTAS PROTEGIDAS 

router.post(
    '/calendario/excecao',
    protect,
    checkPermissao('configuracoes'),
    calendarioController.criarOuAtualizarExcecao
);

router.delete(
    '/calendario/excecao',
    protect,
    checkPermissao('configuracoes'),
    calendarioController.deletarExcecao
);

router.post(
    '/calendario/importar-feriados',
    protect,
    checkPermissao('configuracoes'),
    calendarioController.importarFeriados
);

router.post(
    '/calendario/publicar-mes',
    protect,
    checkPermissao('configuracoes'),
    mesPublicadoController.publicarMes
);

module.exports = router;