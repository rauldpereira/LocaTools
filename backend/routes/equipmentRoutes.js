const express = require('express');
const { 
    createEquipment, 
    getEquipments, 
    getEquipmentById,
    updateEquipment,
    deleteEquipment,
} = require('../controllers/equipmentController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', getEquipments);
router.get('/:id', getEquipmentById);

router.post('/', protect, createEquipment);
router.put('/:id', protect, updateEquipment);
router.delete('/:id', protect, deleteEquipment);

module.exports = router;