require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const path = require('path');
const userRoutes = require('./routes/dynamoUserRoutes');
const { dynamoClient } = require('./config/dynamodb');
const { ListTablesCommand, CreateTableCommand, DescribeTableCommand } = require('@aws-sdk/client-dynamodb');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(fileUpload({
  createParentPath: true,
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
}));

// Servir archivos estáticos de uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Verificar la conexión a DynamoDB
const TABLE_NAME = 'Tappy_Users';

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

(async () => {
  await ensureUserTable();
  app.use('/api/users', userRoutes);
  app.get('/', (_req, res) => res.send('API Tappy (DynamoDB) 🚀'));
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));
})();
