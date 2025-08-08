// Pruebas manuales de la API
// Puedes copiar estos comandos curl y ejecutarlos en otra terminal

// 1. Crear un usuario nuevo
/*
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Juan Pérez",
    "username": "juanperez",
    "whatsapp": "+1234567890",
    "email": "juan@example.com",
    "social": {
      "instagram": "juanperez_ig",
      "facebook": "juan.perez.fb",
      "linkedin": "juan-perez-li",
      "twitter": "juanperez_tw"
    },
    "password": "password123"
  }'
*/

// 2. Login
/*
curl -X POST http://localhost:5000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "juanperez",
    "password": "password123"
  }'
*/

// 3. Obtener perfil público
/*
curl http://localhost:5000/api/users/juanperez
*/
