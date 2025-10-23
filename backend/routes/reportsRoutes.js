const express = require('express');
const router = express.Router();
const { getFinancialReport } = require('../controllers/reportsController');
const { protect, admin } = require('../middlewares/authMiddleware');


router.get('/financial', protect, admin, getFinancialReport);


module.exports = router;