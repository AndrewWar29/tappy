require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const path = require('path');
const userRoutes = require('./routes/dynamoUserRoutes');
const checkoutRoutes = require('./routes/checkout');
const khipuRoutes = require('./routes/pay-khipu');
const webpayRoutes = require('./routes/pay-webpay');
const paymentsRoutes = require('./routes/payments');
const { dynamoClient } = require('./config/dynamodb');
const { ListTablesCommand, CreateTableCommand, DescribeTableCommand } = require('@aws-sdk/client-dynamodb');

const app = express();

// Middleware
// CORS explícito para asegurar preflight correcto en API Gateway
const corsOptions = {
  origin: ['https://tappy.cl', 'https://www.tappy.cl', 'http://localhost:3000'], // Ajusta a dominio específico si luego necesitas restringir
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token'],
  exposedHeaders: ['x-auth-token']
};
app.use(cors(corsOptions));
// Responder explícitamente preflight para cualquier ruta
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(fileUpload({
  createParentPath: true,
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
}));

// Servir archivos estáticos de uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Verificar la conexión a DynamoDB
const TABLE_NAME = process.env.TABLE_NAME || 'Tappy_Users';
const ORDERS_TABLE = process.env.ORDERS_TABLE || 'Tappy_Orders';
const PAYMENTS_TABLE = process.env.PAYMENTS_TABLE || 'Tappy_Payments';

async function ensureTable(tableName, schema) {
  const tables = await dynamoClient.send(new ListTablesCommand({}));
  if (!tables.TableNames.includes(tableName)) {
    console.log(`Tabla ${tableName} no existe. Creando...`);
    await dynamoClient.send(new CreateTableCommand(schema));

    let status = 'CREATING';
    while (status !== 'ACTIVE') {
      await new Promise(r => setTimeout(r, 2000));
      const desc = await dynamoClient.send(new DescribeTableCommand({ TableName: tableName }));
      status = desc.Table.TableStatus;
      console.log(`Esperando a que ${tableName} esté ACTIVE... Estado: ${status}`);
    }
    console.log(`✅ Tabla ${tableName} creada y activa.`);
  } else {
    const desc = await dynamoClient.send(new DescribeTableCommand({ TableName: tableName }));
    if (desc.Table.TableStatus !== 'ACTIVE') {
      let status = desc.Table.TableStatus;
      while (status !== 'ACTIVE') {
        await new Promise(r => setTimeout(r, 2000));
        const d = await dynamoClient.send(new DescribeTableCommand({ TableName: tableName }));
        status = d.Table.TableStatus;
      }
    }
    console.log(`✅ Tabla ${tableName} lista.`);
  }
}

async function ensureUserTable() {
  await ensureTable(TABLE_NAME, {
    TableName: TABLE_NAME,
    KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
      { AttributeName: 'username', AttributeType: 'S' },
      { AttributeName: 'email', AttributeType: 'S' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'UsernameIndex',
        KeySchema: [{ AttributeName: 'username', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
      },
      {
        IndexName: 'EmailIndex',
        KeySchema: [{ AttributeName: 'email', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
      }
    ],
    BillingMode: 'PROVISIONED',
    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
  });
}

async function ensureOrdersTable() {
  await ensureTable(ORDERS_TABLE, {
    TableName: ORDERS_TABLE,
    KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
      { AttributeName: 'userId', AttributeType: 'S' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'UserIndex',
        KeySchema: [{ AttributeName: 'userId', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
      }
    ],
    BillingMode: 'PROVISIONED',
    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
  });
}

async function ensurePaymentsTable() {
  await ensureTable(PAYMENTS_TABLE, {
    TableName: PAYMENTS_TABLE,
    KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
      { AttributeName: 'orderId', AttributeType: 'S' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'OrderIndex',
        KeySchema: [{ AttributeName: 'orderId', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
      }
    ],
    BillingMode: 'PROVISIONED',
    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
  });
}

async function ensureAllTables() {
  await ensureUserTable();
  await ensureOrdersTable();
  await ensurePaymentsTable();
}

// Rutas
app.use('/api/users', userRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/pay-khipu', khipuRoutes);
app.use('/api/pay-webpay', webpayRoutes);
app.use('/api/payments', paymentsRoutes);
app.get('/', (_req, res) => res.send('API Tappy (DynamoDB) 🚀'));

// Si el archivo se ejecuta directamente (node server.js), arrancamos un servidor HTTP
if (require.main === module) {
  (async () => {
    await ensureAllTables();
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));
  })();
}

module.exports = { app, ensureAllTables, ensureUserTable };
