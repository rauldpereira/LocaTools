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

const { protect, checkPermissao } = require('../middlewares/authMiddleware');

const permissaoEstoque = checkPermissao('gerenciar_estoque');

router.get('/equipment/:id', protect, permissaoEstoque, getUnitsByEquipment);
router.get('/maintenances/dashboard', protect, permissaoEstoque, getAllMaintenances);
router.get('/:id/history', protect, permissaoEstoque, getUnitMaintenanceHistory);
router.get('/:id/conflicts', protect, permissaoEstoque, getConflictsAndAlternatives);

router.post('/', protect, permissaoEstoque, addUnitsToEquipment);
router.delete('/:id', protect, permissaoEstoque, deleteUnit);
router.put('/:id', protect, permissaoEstoque, updateUnitDetails);

router.post('/reallocate', protect, permissaoEstoque, executeTransplant);
router.post('/:id_unidade/maintenance', protect, permissaoEstoque, createMaintenance);

router.delete('/maintenance/:id', protect, permissaoEstoque, deleteMaintenance);

module.exports = router;