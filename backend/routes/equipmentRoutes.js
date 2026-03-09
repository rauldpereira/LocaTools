const express = require('express');
const router = express.Router();
const upload = require('../middlewares/multerConfig');

const { 
    createEquipment, 
    getEquipment, 
    getEquipmentById,
    updateEquipment,
    deleteEquipment,
    checkAvailability,
    getDailyAvailability  
} = require('../controllers/equipmentController');

const { addUnitsToEquipment, getUnitsByEquipment } = require('../controllers/unitController');
const { protect, checkPermissao } = require('../middlewares/authMiddleware');

// Rotas Públicas
router.get('/', getEquipment);
router.get('/:id', getEquipmentById);
router.get('/:id/availability', checkAvailability);
router.get('/:id/daily-availability', getDailyAvailability);

// Rotas Protegidas 
router.get('/:id/units', protect, checkPermissao('gerenciar_estoque'), getUnitsByEquipment);
router.post('/:id/units', protect, checkPermissao('gerenciar_estoque'), addUnitsToEquipment);

router.post('/', protect, checkPermissao('gerenciar_estoque'), upload.array('images', 10), createEquipment);
router.put('/:id', protect, checkPermissao('gerenciar_estoque'), upload.array('images', 10), updateEquipment);
router.delete('/:id', protect, checkPermissao('gerenciar_estoque'), deleteEquipment);

module.exports = router;