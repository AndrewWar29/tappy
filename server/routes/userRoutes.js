const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const multer = require('multer');
const path = require('path');

// Configuración de multer para guardar archivos en /uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + ext;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });
// Endpoint para subir imagen de perfil
router.post('/upload-avatar', upload.single('avatar'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ msg: 'No se subió ningún archivo' });
  }
  // Devolver la URL relativa para usarla en el frontend
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});
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
