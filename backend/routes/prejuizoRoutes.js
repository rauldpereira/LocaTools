const express = require('express');
const router = express.Router();
const prejuizoController = require('../controllers/prejuizoController');
const { protect, admin } = require('../middlewares/authMiddleware'); 

router.post('/', protect, admin, prejuizoController.registrar);

router.get('/', protect, admin, prejuizoController.listar);

module.exports = router;