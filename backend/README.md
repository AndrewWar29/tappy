?# Tappy Backend API

Backend minimalista para el portal de usuarios Tappy. Gestiona usuarios, órdenes y pagos con una arquitectura serverless simple y eficiente.

## 🏗️ Arquitectura Minimalista

- **Runtime**: Python 3.11
- **Portal de Integración**: API Gateway (HTTP API)
- **Compute**: AWS Lambda (función única)
- **Base de datos**: DynamoDB (3 tablas)
- **Deployment**: AWS SAM (CloudFormation)

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
# Instalar dependencias Python
pip install -r requirements.txt

# Configurar variables de entorno
export JWT_SECRET="tu-secreto-jwt"
export TABLE_NAME="Tappy_Users_Dev"
export ORDERS_TABLE="Tappy_Orders_Dev"
export PAYMENTS_TABLE="Tappy_Payments_Dev"

# Testing local con SAM
sam local start-api
# http://localhost:3000
```

## 📦 Deploy a AWS

El deployment es automático via GitHub Actions cuando hay cambios en `backend/`:

```bash
git add backend/
git commit -m "feat: nueva funcionalidad"
git push origin main
```

### Deploy Manual

```bash
# Crear tablas DynamoDB primero
aws cloudformation deploy \
  --template-file dynamodb.yaml \
  --stack-name tappy-dynamodb \
  --parameter-overrides Stage=Prod

# Build con SAM
sam build

# Deploy API
sam deploy \
  --stack-name tappy-backend \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    Stage=Prod \
    JwtSecret=tu-secreto-jwt \
    UserTableName=Tappy_Users_Prod \
    OrdersTableName=Tappy_Orders_Prod \
    PaymentsTableName=Tappy_Payments_Prod \
  --resolve-s3
```

## 🔑 Variables de Entorno (Lambda)

- `JWT_SECRET` - Secreto para tokens JWT (requerido)
- `KHIPU_RECEIVER_ID` - ID receptor Khipu (opcional)
- `KHIPU_SECRET` - Secret Khipu (opcional)
- `WEBPAY_COMMERCE_CODE` - Código comercio Webpay (opcional)
- `WEBPAY_API_KEY` - API Key Webpay (opcional)

## 📁 Estructura Minimalista

```
backend/
├── tables/                  # Lógica de negocio por recurso
│   ├── __init__.py
│   ├── users.py            # Gestión de usuarios y auth
│   ├── orders.py           # Órdenes y checkout
│   ├── payments.py         # Consulta de pagos
│   ├── webpay.py           # Integración Transbank Webpay
│   └── khipu.py            # Integración Khipu
├── lambda_function.py      # Handler principal Lambda
├── config.py               # Gestión de configuración
├── dynamodb_tools.py       # Utilidades DynamoDB
├── permissions.py          # Validación de permisos
├── requirements.txt        # Dependencias Python
├── api.yaml                # CloudFormation API Gateway + Lambda
├── dynamodb.yaml           # CloudFormation DynamoDB Tables
└── README.md
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
