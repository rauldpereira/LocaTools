const express = require('express');
const router = express.Router();
const { getFinancialReport, getOperationalReport } = require('../controllers/reportsController');
const { protect, admin } = require('../middlewares/authMiddleware');


router.get('/financial', protect, admin, getFinancialReport);
router.get('/operational', protect, admin, getOperationalReport);

module.exports = router;