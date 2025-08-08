const jwt = require('jsonwebtoken');
const { getUserById } = require('../models/User');

// Middleware para verificar el token JWT
module.exports = async function (req, res, next) {
  // Obtener token del header
  let token = req.header('x-auth-token');
  
  // Verificar si el token viene como Bearer Token
  const authHeader = req.header('Authorization');
  if (!token && authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }
  
  // Verificar si no hay token
  if (!token) {
    return res.status(401).json({ msg: 'No hay token, autorización denegada' });
  }
  
  try {
    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu_secreto_jwt');
    
    // Buscar usuario en DynamoDB
    const user = await getUserById(decoded.user.id);
    if (!user) {
      return res.status(401).json({ msg: 'Token inválido, usuario no encontrado' });
    }
    
    // Adjuntar usuario al request
    req.user = decoded.user;
    next();
  } catch (err) {
    console.error('Error en middleware de autenticación:', err.message);
    res.status(401).json({ msg: 'Token no válido' });
  }
};
