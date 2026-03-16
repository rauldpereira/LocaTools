const express = require('express');
const { 
  registerUser, 
  loginUser, 
  getProfile,
  updateProfile,
  changePassword,
  getTeam, 
  updatePermissions,
  createFuncionario,
  updateFuncionarioDados, 
  deleteUser
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

router.put('/team/:id/dados', protect, admin, updateFuncionarioDados); 

router.post('/team', protect, admin, createFuncionario);

router.delete('/team/:id', protect, admin, deleteUser);

module.exports = router;