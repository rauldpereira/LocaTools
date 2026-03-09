const express = require('express');
const router = express.Router();
const { getTiposAvariaByEquipment, createTipoAvaria, deleteTipoAvaria, updateTipoAvaria } = require('../controllers/tipoAvariaController');
const { protect, checkPermissao } = require('../middlewares/authMiddleware');


router.get('/:equipmentId', protect, checkPermissao('gerenciar_estoque'), getTiposAvariaByEquipment);
router.post('/', protect, checkPermissao('gerenciar_estoque'), createTipoAvaria);
router.delete('/:id', protect, checkPermissao('gerenciar_estoque'), deleteTipoAvaria);
router.put('/:id', protect, checkPermissao('gerenciar_estoque'), updateTipoAvaria);

module.exports = router;