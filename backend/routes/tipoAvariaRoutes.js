const express = require('express');
const router = express.Router();
const { getTiposAvariaByEquipment, createTipoAvaria, deleteTipoAvaria, updateTipoAvaria } = require('../controllers/tipoAvariaController');
const { protect, admin } = require('../middlewares/authMiddleware');

router.get('/:equipmentId', protect, admin, getTiposAvariaByEquipment);
router.post('/', protect, admin, createTipoAvaria);
router.delete('/:id', protect, admin, deleteTipoAvaria);
router.put('/:id', protect, admin, updateTipoAvaria);

module.exports = router;