<<<<<<< HEAD
// backend/routes/equipmentRoutes.js

const express = require('express');
const router = express.Router();

// Importação do primeiro controller
=======
const express = require('express');
const router = express.Router();

>>>>>>> 2d9d9a8 (feat: add calendario, modal e consertado o bug de uma unidade fantasma)
const { 
    createEquipment, 
    getEquipments, 
    getEquipmentById,
    updateEquipment,
    deleteEquipment,
} = require('../controllers/equipmentController');

<<<<<<< HEAD
console.log('--- [DEBUG] Antes de importar unitController ---');
const unitControllerFile = require('../controllers/unitController');
console.log('--- [DEBUG] Conteúdo importado de unitController:', unitControllerFile);
const { addUnitsToEquipment } = unitControllerFile;
console.log('--- [DEBUG] A função addUnitsToEquipment é:', addUnitsToEquipment);
console.log('--- [DEBUG] Depois de importar unitController ---');

// Importação dos middlewares
const { protect, admin } = require('../middlewares/authMiddleware');


/* --- Rotas Públicas --- */
router.get('/', getEquipments);
router.get('/:id', getEquipmentById);

/* --- Rotas Protegidas (Apenas Admin) --- */
=======
const { addUnitsToEquipment, getUnitsByEquipment } = require('../controllers/unitController');

const { protect, admin } = require('../middlewares/authMiddleware');


router.get('/', getEquipments);
router.get('/:id', getEquipmentById);
router.get('/:id/units', protect, admin, getUnitsByEquipment);

>>>>>>> 2d9d9a8 (feat: add calendario, modal e consertado o bug de uma unidade fantasma)
router.post('/', protect, admin, createEquipment);
router.put('/:id', protect, admin, updateEquipment);
router.delete('/:id', protect, admin, deleteEquipment);

<<<<<<< HEAD
// Nova rota para adicionar unidades
=======
>>>>>>> 2d9d9a8 (feat: add calendario, modal e consertado o bug de uma unidade fantasma)
router.post('/:id/units', protect, admin, addUnitsToEquipment);


module.exports = router;