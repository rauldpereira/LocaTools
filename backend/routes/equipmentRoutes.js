const express = require('express');
const router = express.Router();

const { 
    createEquipment, 
    getEquipments, 
    getEquipmentById,
    updateEquipment,
    deleteEquipment,
    checkAvailability 
} = require('../controllers/equipmentController');

const { addUnitsToEquipment, getUnitsByEquipment } = require('../controllers/unitController');

const { protect, admin } = require('../middlewares/authMiddleware');


router.get('/', getEquipments);
router.get('/:id', getEquipmentById);
router.get('/:id/units', protect, admin, getUnitsByEquipment);
router.get('/:id/availability', checkAvailability);

router.post('/', protect, admin, createEquipment);
router.put('/:id', protect, admin, updateEquipment);
router.delete('/:id', protect, admin, deleteEquipment);

router.post('/:id/units', protect, admin, addUnitsToEquipment);


module.exports = router;