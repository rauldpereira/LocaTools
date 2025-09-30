const express = require('express');
const router = express.Router();
const { createVistoria, getVistoriasByOrder } = require('../controllers/vistoriaController');
const { protect, admin } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/multerConfig');

router.post('/', protect, admin, upload.any(), createVistoria);

router.get('/order/:orderId', protect, getVistoriasByOrder);

module.exports = router;