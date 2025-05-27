// ===== GUÍA DE ENDPOINTS DE LA API TAPPY =====
// Base URL: http://localhost:3001

// ===== ENDPOINTS POST DISPONIBLES =====

// 1. 📝 CREAR USUARIO/PERFIL
// POST /api/users
// Crea un nuevo perfil de usuario
const createUserExample = {
  method: 'POST',
  url: 'http://localhost:3001/api/users',
  headers: {
    'Content-Type': 'application/json'
  },
  body: {
    "name": "María García",
    "username": "mariagarcia",
    "whatsapp": "+524451234567",
    "email": "maria@example.com",
    "social": {
      "instagram": "maria_garcia_oficial",
      "facebook": "maria.garcia.mx",
      "linkedin": "maria-garcia-mx",
      "twitter": "mariagarcia_mx"
    },
    "password": "miPassword123" // Opcional
  }
};

// 2. 🔐 LOGIN
// POST /api/users/login
// Autentica un usuario y devuelve un token JWT
const loginExample = {
  method: 'POST',
  url: 'http://localhost:3001/api/users/login',
  headers: {
    'Content-Type': 'application/json'
  },
  body: {
    "username": "mariagarcia",
    "password": "miPassword123"
  }
};

// ===== OTROS ENDPOINTS DISPONIBLES =====

// 3. 👤 OBTENER PERFIL PÚBLICO
// GET /api/users/:username
// Obtiene el perfil público de un usuario (sin password)

// 4. ✏️ ACTUALIZAR PERFIL (Requiere autenticación)
// PUT /api/users/:id
// Actualiza el perfil del usuario autenticado

// ===== COMANDOS CURL PARA PRUEBAS =====

// Crear usuario:
/*
curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ana López",
    "username": "analopez",
    "whatsapp": "+524451234568",
    "email": "ana@example.com",
    "social": {
      "instagram": "ana_lopez_photo",
      "facebook": "ana.lopez.photographer"
    }
  }'
*/

// Login:
/*
curl -X POST http://localhost:3001/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "analopez",
    "password": "password123"
  }'
*/

// ===== RESUMEN DEL ESTADO =====
// ✅ MongoDB conectado exitosamente
// ✅ Servidor corriendo en puerto 3001
// ✅ Endpoint POST /api/users (crear usuario) - FUNCIONANDO
// ✅ Endpoint POST /api/users/login - FUNCIONANDO
// ✅ Endpoint GET /api/users/:username - FUNCIONANDO
// ✅ Endpoint PUT /api/users/:id (requiere auth) - DISPONIBLE
