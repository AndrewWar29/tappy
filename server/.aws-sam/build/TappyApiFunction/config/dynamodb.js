const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

const region = process.env.AWS_REGION || 'us-east-1';
const clientOptions = { region };

// Detectar si estamos en Lambda
const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;

// Solo usar credenciales de entorno si NO estamos en Lambda
if (!isLambda && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  clientOptions.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
  console.log('Usando credenciales de AWS desde variables de entorno');
} else {
  if (process.env.AWS_PROFILE) {
    console.log(`Usando perfil AWS: ${process.env.AWS_PROFILE}`);
  } else {
    console.log('Usando configuración AWS por defecto');
  }
}

const dynamoClient = new DynamoDBClient(clientOptions);
const docClient = DynamoDBDocumentClient.from(dynamoClient);

module.exports = { dynamoClient, docClient };
