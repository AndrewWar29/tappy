const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');

router.post('/', (req, res, next) => {
  console.log('POST /api/users recibido');
  next();
}, userController.createUser);
// Obtener perfil público
router.get('/:username', userController.getUserByUsername);
// Editar perfil (protegido)
router.put('/:id', auth, userController.updateUser);
// Login (opcional)
router.post('/login', userController.login);
// Obtener todos los usuarios (para pruebas)
router.get('/', userController.getAllUsers);

module.exports = router;
