const express = require('express');
const router = express.Router();

const { 
    getUnitsByEquipment, 
    addUnitsToEquipment, 
    deleteUnit, 
    updateUnitDetails,
    createMaintenance,
    deleteMaintenance,
    getAllMaintenances,
    getUnitMaintenanceHistory,
    getConflictsAndAlternatives,
    executeTransplant
} = require('../controllers/unitController');

const { protect, admin } = require('../middlewares/authMiddleware');

router.get('/equipment/:id', protect, admin, getUnitsByEquipment);
router.get('/maintenances/dashboard', protect, admin, getAllMaintenances);
router.get('/:id/history', protect, admin, getUnitMaintenanceHistory);
router.get('/:id/conflicts', protect, admin, getConflictsAndAlternatives);

router.post('/', protect, admin, addUnitsToEquipment);
router.delete('/:id', protect, admin, deleteUnit);
router.put('/:id', protect, admin, updateUnitDetails);

router.post('/reallocate', protect, admin, executeTransplant);
router.post('/:id_unidade/maintenance', protect, admin, createMaintenance);

router.delete('/maintenance/:id', protect, admin, deleteMaintenance);


module.exports = router;