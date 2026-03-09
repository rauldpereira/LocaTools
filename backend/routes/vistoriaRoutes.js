const express = require('express');
const router = express.Router();
const { createVistoria, getVistoriasByOrder } = require('../controllers/vistoriaController');
const { protect, checkPermissao } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/multerConfig');

router.post('/', protect, checkPermissao('fazer_vistoria'), upload.any(), createVistoria);

router.get('/order/:orderId', protect, getVistoriasByOrder);

module.exports = router;