require('dotenv').config();
const { CreateTableCommand, DynamoDBClient } = require('@aws-sdk/client-dynamodb');

// Usar el perfil tappy específicamente para este script
const dynamoClient = new DynamoDBClient({
  region: 'us-east-1',
  profile: 'tappy'  // Usará el perfil que acabas de configurar
});

async function createUserTable() {
  // Definir el esquema de la tabla de usuarios
  const params = {
    TableName: 'Tappy_Users',
    KeySchema: [
      { AttributeName: 'id', KeyType: 'HASH' } // Clave primaria
    ],
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
      { AttributeName: 'username', AttributeType: 'S' },
      { AttributeName: 'email', AttributeType: 'S' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'UsernameIndex',
        KeySchema: [
          { AttributeName: 'username', KeyType: 'HASH' }
        ],
        Projection: {
          ProjectionType: 'ALL'
        },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        }
      },
      {
        IndexName: 'EmailIndex',
        KeySchema: [
          { AttributeName: 'email', KeyType: 'HASH' }
        ],
        Projection: {
          ProjectionType: 'ALL'
        },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        }
      }
    ],
    BillingMode: 'PROVISIONED',
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
    }
  };

  try {
    const data = await dynamoClient.send(new CreateTableCommand(params));
    console.log('✅ Tabla Tappy_Users creada:', data);
    return data;
  } catch (err) {
    if (err.name === 'ResourceInUseException') {
      console.log('⚠️ La tabla Tappy_Users ya existe');
    } else {
      console.error('❌ Error al crear tabla:', err);
    }
  }
}

// Ejecutar la creación de tablas
async function setupDynamoDB() {
  console.log('🔧 Configurando tablas de DynamoDB...');
  
  try {
    await createUserTable();
    console.log('✅ Configuración de DynamoDB completada');
  } catch (err) {
    console.error('❌ Error en la configuración de DynamoDB:', err);
  }
}

setupDynamoDB();
