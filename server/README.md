# Tappy API Server

Este es el servidor API para la aplicación Tappy, que utiliza DynamoDB como base de datos.

## Configuración

1. Crea un archivo `.env` basado en el archivo `.env.example` y configura tus credenciales de AWS
2. Instala las dependencias: `npm install`
3. Crea la tabla de DynamoDB: `npm run setup`

## Ejecución

Hay varias formas de ejecutar el servidor:

- Con variables de entorno del archivo .env: `npm start` o `npm run dev` (nodemon)
- Con perfil AWS específico: `npm run start:profile` o `npm run dev:profile`
- Con credenciales explícitas: `npm run start:creds`
- Con variables de entorno específicas: `npm run start:env`

## Estructura de la aplicación

- `server.js`: Punto de entrada principal
- `config/`: Configuración de DynamoDB y otras utilidades
- `models/`: Modelos de datos para DynamoDB
- `controllers/`: Controladores para manejar la lógica de negocio
- `routes/`: Definición de rutas de la API
- `middleware/`: Middleware para autenticación y otras funciones
- `uploads/`: Carpeta donde se almacenan los archivos subidos

## Scripts de utilidad

- `setup-dynamodb.js`: Crea la tabla en DynamoDB
- `run-with-profile.sh`: Ejecuta el servidor con un perfil AWS específico
- `start-with-credentials.sh`: Ejecuta el servidor con credenciales AWS explícitas
- `start-with-env.sh`: Ejecuta el servidor con variables de entorno específicas
