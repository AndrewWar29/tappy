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

### Despliegue y ejecución con AWS SAM (recomendado para serverless)

Esta carpeta incluye un template SAM (`template.yaml`) que crea la tabla `Tappy_Users`, una función Lambda que ejecuta tu app Express y un API Gateway.

Requisitos:
- AWS SAM CLI instalado: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html
- AWS CLI configurado con un perfil que tenga permisos para desplegar CloudFormation y crear recursos (DynamoDB, Lambda, IAM, API Gateway).

Comandos básicos:

1) Instalar dependencias (ya desde la carpeta `server`):

```bash
cd server
npm install
```

2) Construir con SAM (instala dependencias y prepara artefactos):

```bash
sam build
```

3) Probar localmente (inicia API Gateway local y proxys a Lambda):

```bash
sam local start-api
```

Esto expondrá la API local en `http://127.0.0.1:3000` por defecto. Puedes llamar a tus endpoints, p.ej. `GET /` o `POST /api/users`.

4) Desplegar a AWS:

```bash
# Empaqueta y despliega con parámetros interactivos
sam deploy --guided
```

Durante `sam deploy --guided` se te preguntará por el nombre del stack, región y el parámetro `JwtSecret` (requerido). Guarda la configuración para despliegues posteriores.

Notas importantes:
- En producción recomendamos crear la tabla `Tappy_Users` con IaC fuera de la función (ya hace la template) y eliminar la lógica de creación dentro de la Lambda (`ensureUserTable`) para reducir permisos y cold-start.
- Asegúrate de no subir secretos en texto plano: `JwtSecret` se maneja como parámetro NoEcho en la plantilla.
- Lambda no tiene almacenamiento persistente local para `uploads/`; usa S3 para manejar avatares y archivos.


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
# Backend updated Sun Nov 16 14:48:27 -03 2025
