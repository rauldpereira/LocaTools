const express = require('express');
const router = express.Router();
const { getConfig, updateConfig } = require('../controllers/configController');
const { protect, admin } = require('../middlewares/authMiddleware');

router.get('/', getConfig);

router.put('/', protect, admin, updateConfig);

module.exports = router;