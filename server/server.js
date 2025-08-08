require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const path = require('path');
const userRoutes = require('./routes/userRoutes');

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
const { dynamoClient } = require('./config/dynamodb');
const { ListTablesCommand } = require('@aws-sdk/client-dynamodb');
async function testDynamoDBConnection() {
  try {
    const command = new ListTablesCommand({});
    const response = await dynamoClient.send(command);
    console.log('✅ Conexión a DynamoDB establecida');
    console.log('Tablas disponibles:', response.TableNames);
  } catch (error) {
    console.error('❌ Error al conectar con DynamoDB:', error);
  }
}

// Inicializar DynamoDB
testDynamoDBConnection();

// Rutas de usuario
app.use('/api/users', userRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('API Tappy con DynamoDB funcionando 🚀');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));
