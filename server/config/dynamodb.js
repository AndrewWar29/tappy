const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

// Configuración de credenciales de AWS
const region = process.env.AWS_REGION || 'us-east-1';

// Opciones de configuración para DynamoDB
const clientOptions = {
  region,
};

// Usar credenciales específicas si están disponibles en las variables de entorno
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  clientOptions.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
  console.log('Usando credenciales de AWS desde variables de entorno');
}
// El perfil AWS se configura a través de la variable de entorno AWS_PROFILE
// y Node.js lo reconoce automáticamente, no es necesario configurarlo explícitamente
else {
  if (process.env.AWS_PROFILE) {
    console.log(`Usando perfil AWS: ${process.env.AWS_PROFILE}`);
  } else {
    console.log('Usando configuración AWS por defecto');
  }
}

// Crea un cliente DynamoDB con las opciones configuradas
const dynamoClient = new DynamoDBClient(clientOptions);

// Crea un cliente de documento que facilita el trabajo con objetos JavaScript
const docClient = DynamoDBDocumentClient.from(dynamoClient);

module.exports = { dynamoClient, docClient };
