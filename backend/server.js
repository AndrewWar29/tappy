const { dynamoClient } = require('./config/dynamodb');
const fs = require('fs');

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

// Dynamic Routing (Proxy Pattern)
// Requests to /api/:resource will be routed to ./tables/:resource.js
app.use('/api/:resource', (req, res, next) => {
  const { resource } = req.params;
  const modulePath = path.join(__dirname, 'tables', `${resource}.js`);

  if (fs.existsSync(modulePath)) {
    const router = require(modulePath);
    router(req, res, next);
  } else {
    res.status(404).json({ ok: false, message: `Resource ${resource} not found` });
  }
});

app.get('/', (_req, res) => res.send('API Tappy (DynamoDB) 🚀'));

// Si el archivo se ejecuta directamente (node server.js), arrancamos un servidor HTTP
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));
}

module.exports = { app };
