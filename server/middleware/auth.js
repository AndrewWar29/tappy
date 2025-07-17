const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  // Buscar token en diferentes headers
  let token = req.header('x-auth-token');
  
  // Si no está en x-auth-token, buscar en Authorization header
  if (!token) {
    const authHeader = req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remover "Bearer " del inicio
    }
  }
  
  if (!token) return res.status(401).json({ msg: 'No token, autorización denegada' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token no válido' });
  }
};
