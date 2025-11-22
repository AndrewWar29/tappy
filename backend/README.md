# Tappy API Server

Backend API para el portal de usuarios Tappy. Gestiona usuarios, órdenes y pagos con DynamoDB y se despliega como Lambda function en AWS.

## 🏗️ Arquitectura

- **Runtime**: Node.js 18
- **Framework**: Express.js
- **Base de datos**: DynamoDB (3 tablas)
- **Deployment**: AWS Lambda + API Gateway (SAM)

## 📊 Tablas DynamoDB

### Tappy_Users
Gestión de usuarios y perfiles
- Primary Key: `id`
- GSI: `UsernameIndex`, `EmailIndex`

### Tappy_Orders
Órdenes de compra
- Primary Key: `id`
- GSI: `UserIndex` (por userId)

### Tappy_Payments
Registro de pagos (Khipu, Webpay)
- Primary Key: `id`
- GSI: `OrderIndex` (por orderId)

## 🚀 Endpoints

### Usuarios
- `POST /api/users/register` - Registrar usuario
- `POST /api/users/login` - Login
- `GET /api/users/me` - Perfil actual (requiere auth)
- `PUT /api/users/profile` - Actualizar perfil
- `GET /api/users/:username` - Perfil público por username
- `POST /api/users/upload` - Subir foto de perfil

### Checkout y Órdenes
- `POST /api/checkout` - Crear orden
- `GET /api/checkout/order/:orderId` - Detalle de orden

### Pagos
- `POST /api/pay-khipu` - Iniciar pago Khipu
- `GET /api/pay-khipu/status/:orderId` - Estado pago Khipu
- `POST /api/pay-webpay` - Iniciar pago Webpay
- `POST /api/pay-webpay/confirm` - Confirmar pago Webpay
- `GET /api/payments/order/:orderId` - Pagos de una orden

## 🛠️ Desarrollo Local

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno (opcional para local)
# AWS_REGION=us-east-1
# AWS_PROFILE=tappy

# Iniciar servidor local
npm start
# http://localhost:3001
```

## 📦 Deploy a AWS

El deployment es automático via GitHub Actions cuando hay cambios en `server/`:

```bash
git add server/
git commit -m "feat: nueva funcionalidad"
git push origin main
```

### Deploy Manual

```bash
# Build con SAM
sam build --use-container

# Deploy a AWS
sam deploy \
  --stack-name tappy-backend \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides JwtSecret=tu-secreto-jwt \
  --resolve-s3
```

## 🔑 Variables de Entorno (Lambda)

- `JWT_SECRET` - Secreto para tokens JWT (requerido)
- `KHIPU_RECEIVER_ID` - ID receptor Khipu (opcional)
- `KHIPU_SECRET` - Secret Khipu (opcional)
- `WEBPAY_COMMERCE_CODE` - Código comercio Webpay (opcional)
- `WEBPAY_API_KEY` - API Key Webpay (opcional)

## 📁 Estructura

```
server/
├── config/
│   └── dynamodb.js          # Cliente DynamoDB
├── controllers/
│   └── dynamoUserController.js  # Lógica de usuarios
├── middleware/
│   └── dynamoAuth.js        # Autenticación JWT
├── models/
│   └── DynamoUser.js        # Modelo de usuario
├── routes/
│   ├── dynamoUserRoutes.js  # Rutas de usuarios
│   ├── checkout.js          # Rutas de checkout
│   ├── pay-khipu.js         # Integración Khipu
│   ├── pay-webpay.js        # Integración Webpay
│   └── payments.js          # Consulta de pagos
├── lib/
│   ├── khipuClient.js       # Cliente API Khipu
│   └── transbank.js         # Cliente API Transbank
├── lambda.js                # Handler Lambda
├── server.js                # App Express
├── template.yaml            # SAM template
└── package.json
```

## 🔐 Autenticación

El API usa JWT tokens. Incluir en headers:
```
x-auth-token: <tu-token-jwt>
```

## 🧪 Testing

```bash
# Test health endpoint
curl https://u1yadifvmj.execute-api.us-east-1.amazonaws.com/Prod/

# Test con autenticación
curl -H "x-auth-token: TOKEN" \
  https://u1yadifvmj.execute-api.us-east-1.amazonaws.com/Prod/api/users/me
```

## 📝 Notas

- Las tablas DynamoDB se crean automáticamente si no existen
- Los archivos subidos se almacenan en memoria (Lambda es efímera)
- Para producción, considerar usar S3 para almacenamiento de imágenes
- Los pagos usan APIs de sandbox por defecto
