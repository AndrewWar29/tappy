const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Crear usuario/perfil
exports.createUser = async (req, res) => {
  try {
    const { name, username, whatsapp, email, social, password, avatar } = req.body;
    let user = await User.findOne({ username });
    if (user) return res.status(400).json({ msg: 'El usuario ya existe' });
    const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;
    user = new User({ name, username, whatsapp, email, social, password: hashedPassword, avatar });
    await user.save();
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// Obtener perfil público
exports.getUserByUsername = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select('-password -__v');
    if (!user) return res.status(404).json({ msg: 'Usuario no encontrado' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// Editar perfil (requiere auth)
exports.updateUser = async (req, res) => {
  try {
    console.log('Datos recibidos para actualizar:', req.body); // Debug
    console.log('ID del usuario:', req.params.id); // Debug
    
    const updates = req.body;
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }
    // Permitir actualizar avatar
    if (typeof updates.avatar === 'undefined' && updates.avatar !== null) {
      delete updates.avatar;
    }
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password -__v');
    if (!user) return res.status(404).json({ msg: 'Usuario no encontrado' });
    
    console.log('Usuario actualizado:', user); // Debug
    res.json(user);
  } catch (err) {
    console.error('Error al actualizar usuario:', err); // Debug
    res.status(500).json({ msg: err.message });
  }
};

// Login (opcional)
exports.login = async (req, res) => {
  try {
    console.log('Intento de login con datos:', req.body); // Debug
    const { username, password } = req.body;
    
    const user = await User.findOne({ username });
    console.log('Usuario encontrado:', user ? 'Sí' : 'No'); // Debug
    
    if (!user) return res.status(400).json({ msg: 'Credenciales inválidas' });
    
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Contraseña coincide:', isMatch ? 'Sí' : 'No'); // Debug
    
    if (!isMatch) return res.status(400).json({ msg: 'Credenciales inválidas' });
    
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    console.log('Login exitoso para usuario:', username); // Debug
    
    res.json({ token, user: { id: user._id, username: user.username, name: user.name } });
  } catch (err) {
    console.error('Error en login:', err); // Debug
    res.status(500).json({ msg: err.message });
  }
};

// Obtener todos los usuarios (para pruebas/admin)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password -__v').sort({ createdAt: -1 });
    res.json({
      count: users.length,
      users
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};
