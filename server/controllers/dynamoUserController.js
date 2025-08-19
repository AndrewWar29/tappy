const {
  createUser,
  getUserById,
  getUserByUsername,
  updateUser,
  changePassword,
  authenticateUser
} = require('../models/DynamoUser');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// @route   POST api/users/register
// @desc    Registrar un nuevo usuario
// @access  Public
exports.registerUser = async (req, res) => {
  try {
    const { username, email, password, name } = req.body;
  console.log('[registerUser] body recibido', req.body);
    
    if (!username || !email || !password) {
      return res.status(400).json({ msg: 'Por favor ingrese todos los campos requeridos' });
    }
    
    // Creación de usuario
    const newUser = await createUser({
      username,
      email,
      password,
      name
    });
    
    // Login automático tras registro
    const { token, user } = await authenticateUser(email, password);
    
    res.status(201).json({
      token,
      user
    });
  } catch (err) {
    console.error('Error en registro (controller):', err);
    const msg = err.message === 'Usuario o correo ya registrado' || err.message.startsWith('Por favor')
      ? err.message
      : 'Error interno en registro';
    res.status( err.message === 'Usuario o correo ya registrado' ? 409 : 500).json({ msg });
  }
};

// @route   POST api/users/login
// @desc    Autenticar usuario y obtener token
// @access  Public
exports.loginUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Permitir login con username o email
    const loginIdentifier = email || username;
    
    if (!loginIdentifier || !password) {
      return res.status(400).json({ msg: 'Por favor ingrese todos los campos' });
    }
    
    console.log(`Intentando login para: ${loginIdentifier}`);
    
    const authResult = await authenticateUser(loginIdentifier, password);
    
    console.log('Login exitoso, retornando token y datos de usuario');
    
    res.json(authResult);
  } catch (err) {
    console.error('Error en login:', err.message);
    res.status(400).json({ msg: err.message });
  }
};

// @route   GET api/users/:username
// @desc    Obtener perfil de usuario por username
// @access  Public
exports.getUserProfile = async (req, res) => {
  try {
    const username = req.params.username;
    const user = await getUserByUsername(username);
    
    if (!user) {
      return res.status(404).json({ msg: 'Usuario no encontrado' });
    }
    
    res.json(user);
  } catch (err) {
    console.error('Error al obtener perfil:', err.message);
    res.status(500).json({ msg: err.message });
  }
};

// @route   PUT api/users/:id
// @desc    Actualizar perfil de usuario
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    // Verificar que el ID del token coincida con el ID a actualizar
    if (req.params.id !== req.user.id) {
      return res.status(401).json({ msg: 'No autorizado para editar este perfil' });
    }

    console.log('Actualizando perfil para usuario:', req.user.id);
    console.log('Datos recibidos en req.body:', JSON.stringify(req.body, null, 2));

    // Log extra: mostrar el tipo de cada campo
    Object.entries(req.body).forEach(([k, v]) => {
      console.log(`Campo: ${k}, Tipo: ${typeof v}, Valor:`, v);
    });

    const updatedUser = await updateUser(req.user.id, req.body);

    console.log('Perfil actualizado:', updatedUser);

    res.json(updatedUser);
  } catch (err) {
    console.error('Error al actualizar perfil:', err.message);
    if (err.stack) console.error(err.stack);
    res.status(500).json({ msg: err.message });
  }
};

// @route   POST api/users/upload-avatar
// @desc    Subir foto de perfil
// @access  Private
exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.files || Object.keys(req.files).length === 0 || !req.files.avatar) {
      return res.status(400).json({ msg: 'No se ha subido ninguna imagen' });
    }
    
    const avatar = req.files.avatar;
    const userId = req.user.id;
    
    // Validar que sea una imagen
    if (!avatar.mimetype.startsWith('image')) {
      return res.status(400).json({ msg: 'El archivo debe ser una imagen' });
    }
    
    // Crear nombre de archivo único
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(avatar.name)}`;
    const uploadPath = path.join(__dirname, '../uploads', fileName);
    
    // Mover la imagen al directorio de uploads
    await avatar.mv(uploadPath);
    
    // Actualizar la URL del avatar en el perfil del usuario
    const avatarUrl = `/uploads/${fileName}`;
    await updateUser(userId, { avatar: avatarUrl });
    
    res.json({ url: avatarUrl });
  } catch (err) {
    console.error('Error al subir avatar:', err.message);
    res.status(500).json({ msg: err.message });
  }
};

// @route   PUT api/users/change-password
// @desc    Cambiar contraseña
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ msg: 'Por favor ingrese ambas contraseñas' });
    }
    
    const result = await changePassword(req.user.id, currentPassword, newPassword);
    
    res.json(result);
  } catch (err) {
    console.error('Error al cambiar contraseña:', err.message);
    res.status(400).json({ msg: err.message });
  }
};
