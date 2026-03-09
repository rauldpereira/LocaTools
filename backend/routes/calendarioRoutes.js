const express = require('express');
const router = express.Router();
const calendarioController = require('../controllers/calendarioController');
const mesPublicadoController = require('../controllers/mesPublicadoController');
const { protect, checkPermissao } = require('../middlewares/authMiddleware');

// Rotas de leitura 
router.get(
    '/calendario/status-mensal', 
    protect,
    calendarioController.getStatusMensal
);

router.get(
    '/calendario/meses-publicados', 
    protect, 
    mesPublicadoController.getMesesPublicados
);

// Rotas de Gerenciamento
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