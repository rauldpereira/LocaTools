const express = require('express');
const router = express.Router();

const { 
    getUnitsByEquipment, 
    addUnitsToEquipment, 
    deleteUnit, 
    updateUnitDetails,
    createMaintenance,
    deleteMaintenance,
    getAllMaintenances
} = require('../controllers/unitController');

const { protect, admin } = require('../middlewares/authMiddleware');

router.get('/equipment/:id', protect, admin, getUnitsByEquipment);
router.get('/maintenances/dashboard', protect, admin, getAllMaintenances);

router.post('/', protect, admin, addUnitsToEquipment);
router.delete('/:id', protect, admin, deleteUnit);
router.put('/:id', protect, admin, updateUnitDetails);

router.post('/:id_unidade/maintenance', protect, admin, createMaintenance);

router.delete('/maintenance/:id', protect, admin, deleteMaintenance);


module.exports = router;