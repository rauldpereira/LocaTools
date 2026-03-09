const express = require('express');
const { 
  registerUser, 
  loginUser, 
  getProfile,
  updateProfile,
  changePassword,
  getTeam, 
  updatePermissions,
  createFuncionario
} = require('../controllers/userController');
const { protect, admin } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);

router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.put('/profile/password', protect, changePassword);

router.get('/team', protect, getTeam);
router.put('/team/:id/permissions', protect, updatePermissions);

router.post('/team', protect, admin, createFuncionario);

module.exports = router;