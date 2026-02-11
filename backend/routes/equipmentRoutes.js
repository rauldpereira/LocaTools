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

const { protect, admin } = require('../middlewares/authMiddleware');


router.get('/', getEquipment);
router.get('/:id', getEquipmentById);
router.get('/:id/units', protect, admin, getUnitsByEquipment);
router.get('/:id/availability', checkAvailability);
router.get('/:id/daily-availability', getDailyAvailability);

router.post('/', protect, admin, upload.array('images', 10), createEquipment);

router.put('/:id', protect, admin, upload.array('images', 10), updateEquipment);

router.delete('/:id', protect, admin, deleteEquipment);

router.post('/:id/units', protect, admin, addUnitsToEquipment);

module.exports = router;