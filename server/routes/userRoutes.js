const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');

// @route   POST api/users/register
// @desc    Registrar un nuevo usuario
// @access  Public
router.post('/register', userController.registerUser);

// @route   POST api/users
// @desc    Registrar un nuevo usuario (ruta alternativa)
// @access  Public
router.post('/', userController.registerUser);

// @route   POST api/users/login
// @desc    Autenticar usuario y obtener token
// @access  Public
router.post('/login', userController.loginUser);

// @route   GET api/users/:username
// @desc    Obtener perfil de usuario por username
// @access  Public
router.get('/:username', userController.getUserProfile);

// @route   PUT api/users/:id
// @desc    Actualizar perfil de usuario
// @access  Private
router.put('/:id', auth, userController.updateProfile);

// @route   POST api/users/upload-avatar
// @desc    Subir foto de perfil
// @access  Private
router.post('/upload-avatar', auth, userController.uploadAvatar);

// @route   PUT api/users/change-password
// @desc    Cambiar contraseña
// @access  Private
router.put('/change-password', auth, userController.changePassword);

// Rutas unificadas apuntando a DynamoDB
module.exports = require('./dynamoUserRoutes');
