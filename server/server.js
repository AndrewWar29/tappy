require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const path = require('path');
const userRoutes = require('./routes/dynamoUserRoutes');
const checkoutRoutes = require('./routes/checkout');
const webpayRoutes = require('./routes/pay-webpay');
const paymentsRoutes = require('./routes/payments');
const khipuRoutes = require('./routes/pay-khipu');
const { dynamoClient } = require('./config/dynamodb');
const { ListTablesCommand, CreateTableCommand, DescribeTableCommand } = require('@aws-sdk/client-dynamodb');

const app = express();

// Middleware
// CORS personalizado: reflejar origen permitido y responder preflight de forma consistente.
// Motivo: el uso de cors() con lista limitada de headers causaba fallas en API Gateway para OPTIONS.
const ALLOWED_ORIGINS = [
  'https://tappy.cl',
  'https://www.tappy.cl'
  // Agrega aquí otros dominios válidos (por ejemplo staging) si se requiere.
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (ALLOWED_ORIGINS.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    // Informar a caches/CDN que la respuesta varía según Origin
    const vary = res.getHeader('Vary');
    res.setHeader('Vary', vary ? `${vary}, Origin` : 'Origin');
  } else {
    // Como fallback temporal (si quieres abrir todo mientras pruebas) descomenta:
    // res.setHeader('Access-Control-Allow-Origin', '*');
  }

  // Métodos soportados
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');

  // Permitir dinámicamente los headers pedidos en el preflight
  const reqHeaders = req.headers['access-control-request-headers'];
  if (reqHeaders) {
    res.setHeader('Access-Control-Allow-Headers', reqHeaders);
  } else {
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-auth-token');
  }

  // Exponer headers personalizados al cliente
  res.setHeader('Access-Control-Expose-Headers', 'x-auth-token');

  // Credentials sólo si en el futuro se necesitan cookies o auth con credenciales
  // res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    // Preflight: respuesta vacía / rápida
    return res.status(204).end();
  }
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // para /api/pay-khipu/notify
// Health check temprano (antes de otros middlewares que puedan interferir)
app.get('/api/health', (_req, res) => {
  res.status(200).json({ ok: true, service: 'tappy-api', t: Date.now() });
});
app.use(fileUpload({
  createParentPath: true,
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
}));

// Health check global (útil para monitoreo y pruebas rápidas)
app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true, service: 'tappy-api', t: Date.now() });
});

// Servir archivos estáticos de uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Verificar la conexión a DynamoDB
const TABLE_NAME = 'Tappy_Users';
const ORDERS_TABLE = 'Tappy_Orders';
const PAYMENTS_TABLE = 'Tappy_Payments';

async function ensureUserTable() {
  // Verifica si la tabla existe
  const tables = await dynamoClient.send(new ListTablesCommand({}));
  if (!tables.TableNames.includes(TABLE_NAME)) {
    console.log(`Tabla ${TABLE_NAME} no existe. Creando...`);
    await dynamoClient.send(new CreateTableCommand({
      TableName: TABLE_NAME,
      KeySchema: [
        { AttributeName: 'id', KeyType: 'HASH' }
      ],
      AttributeDefinitions: [
        { AttributeName: 'id', AttributeType: 'S' },
        { AttributeName: 'username', AttributeType: 'S' },
        { AttributeName: 'email', AttributeType: 'S' }
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'UsernameIndex',
          KeySchema: [ { AttributeName: 'username', KeyType: 'HASH' } ],
          Projection: { ProjectionType: 'ALL' },
          ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
        },
        {
          IndexName: 'EmailIndex',
          KeySchema: [ { AttributeName: 'email', KeyType: 'HASH' } ],
          Projection: { ProjectionType: 'ALL' },
          ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
        }
      ],
      BillingMode: 'PROVISIONED',
      ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
    }));
    // Esperar a que la tabla esté ACTIVE
    let status = 'CREATING';
    while (status !== 'ACTIVE') {
      await new Promise(r => setTimeout(r, 2000));
      const desc = await dynamoClient.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
      status = desc.Table.TableStatus;
      console.log(`Esperando a que la tabla esté ACTIVE... Estado actual: ${status}`);
    }
    console.log(`✅ Tabla ${TABLE_NAME} creada y activa.`);
  } else {
    // Verifica que esté ACTIVE
    const desc = await dynamoClient.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
    if (desc.Table.TableStatus !== 'ACTIVE') {
      let status = desc.Table.TableStatus;
      while (status !== 'ACTIVE') {
        await new Promise(r => setTimeout(r, 2000));
        const d = await dynamoClient.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
        status = d.Table.TableStatus;
        console.log(`Esperando a que la tabla esté ACTIVE... Estado actual: ${status}`);
      }
    }
    console.log(`✅ Tabla ${TABLE_NAME} lista.`);
  }
}

async function ensureOrdersTable() {
  const tables = await dynamoClient.send(new ListTablesCommand({}));
  if (!tables.TableNames.includes(ORDERS_TABLE)) {
    console.log(`Tabla ${ORDERS_TABLE} no existe. Creando...`);
    await dynamoClient.send(new CreateTableCommand({
      TableName: ORDERS_TABLE,
      KeySchema: [
        { AttributeName: 'id', KeyType: 'HASH' }
      ],
      AttributeDefinitions: [
        { AttributeName: 'id', AttributeType: 'S' },
        { AttributeName: 'userId', AttributeType: 'S' },
        { AttributeName: 'createdAt', AttributeType: 'S' }
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'UserIndex',
          KeySchema: [
            { AttributeName: 'userId', KeyType: 'HASH' },
            { AttributeName: 'createdAt', KeyType: 'RANGE' }
          ],
          Projection: { ProjectionType: 'ALL' },
          ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
        }
      ],
      BillingMode: 'PROVISIONED',
      ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
    }));
    let status = 'CREATING';
    while (status !== 'ACTIVE') {
      await new Promise(r => setTimeout(r, 2000));
      const desc = await dynamoClient.send(new DescribeTableCommand({ TableName: ORDERS_TABLE }));
      status = desc.Table.TableStatus;
      console.log(`Esperando ${ORDERS_TABLE} ACTIVE... Estado actual: ${status}`);
    }
    console.log(`✅ Tabla ${ORDERS_TABLE} creada y activa.`);
  } else {
    const desc = await dynamoClient.send(new DescribeTableCommand({ TableName: ORDERS_TABLE }));
    if (desc.Table.TableStatus !== 'ACTIVE') {
      let status = desc.Table.TableStatus;
      while (status !== 'ACTIVE') {
        await new Promise(r => setTimeout(r, 2000));
        const d = await dynamoClient.send(new DescribeTableCommand({ TableName: ORDERS_TABLE }));
        status = d.Table.TableStatus;
        console.log(`Esperando ${ORDERS_TABLE} ACTIVE... Estado actual: ${status}`);
      }
    }
    console.log(`✅ Tabla ${ORDERS_TABLE} lista.`);
  }
}

async function ensurePaymentsTable() {
  const tables = await dynamoClient.send(new ListTablesCommand({}));
  if (!tables.TableNames.includes(PAYMENTS_TABLE)) {
    console.log(`Tabla ${PAYMENTS_TABLE} no existe. Creando...`);
    await dynamoClient.send(new CreateTableCommand({
      TableName: PAYMENTS_TABLE,
      KeySchema: [
        { AttributeName: 'id', KeyType: 'HASH' }
      ],
      AttributeDefinitions: [
        { AttributeName: 'id', AttributeType: 'S' },
        { AttributeName: 'orderId', AttributeType: 'S' }
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'OrderIndex',
          KeySchema: [ { AttributeName: 'orderId', KeyType: 'HASH' } ],
          Projection: { ProjectionType: 'ALL' },
          ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
        }
      ],
      BillingMode: 'PROVISIONED',
      ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
    }));
    let status = 'CREATING';
    while (status !== 'ACTIVE') {
      await new Promise(r => setTimeout(r, 2000));
      const desc = await dynamoClient.send(new DescribeTableCommand({ TableName: PAYMENTS_TABLE }));
      status = desc.Table.TableStatus;
      console.log(`Esperando ${PAYMENTS_TABLE} ACTIVE... Estado actual: ${status}`);
    }
    console.log(`✅ Tabla ${PAYMENTS_TABLE} creada y activa.`);
  } else {
    const desc = await dynamoClient.send(new DescribeTableCommand({ TableName: PAYMENTS_TABLE }));
    if (desc.Table.TableStatus !== 'ACTIVE') {
      let status = desc.Table.TableStatus;
      while (status !== 'ACTIVE') {
        await new Promise(r => setTimeout(r, 2000));
        const d = await dynamoClient.send(new DescribeTableCommand({ TableName: PAYMENTS_TABLE }));
        status = d.Table.TableStatus;
        console.log(`Esperando ${PAYMENTS_TABLE} ACTIVE... Estado actual: ${status}`);
      }
    }
    console.log(`✅ Tabla ${PAYMENTS_TABLE} lista.`);
  }
}

// Rutas (se agregan cuando la app se inicializa)
app.use('/api/users', userRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/pay-webpay', webpayRoutes);
app.use('/api/pay-khipu', khipuRoutes);
app.use('/api/payments', paymentsRoutes);
app.get('/', (_req, res) => res.send('API Tappy (DynamoDB) 🚀'));

// Si el archivo se ejecuta directamente (node server.js), arrancamos un servidor HTTP
if (require.main === module) {
  (async () => {
    await ensureUserTable();
    await ensureOrdersTable();
    await ensurePaymentsTable();
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));
  })();
}

module.exports = { app, ensureUserTable };
