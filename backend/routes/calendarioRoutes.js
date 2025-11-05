const express = require('express');
const router = express.Router();
const calendarioController = require('../controllers/calendarioController');
const mesPublicadoController = require('../controllers/mesPublicadoController');
const { protect, admin } = require('../middlewares/authMiddleware');


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

router.post(
    '/calendario/excecao',
    protect,
    admin, 
    calendarioController.criarOuAtualizarExcecao
);

router.delete(
    '/calendario/excecao',
    protect, 
    admin,  
    calendarioController.deletarExcecao
);

router.post(
    '/calendario/importar-feriados',
    protect, 
    admin,
    calendarioController.importarFeriados
);

router.post(
  '/calendario/publicar-mes', 
  protect, 
  admin,
  mesPublicadoController.publicarMes
);

module.exports = router;