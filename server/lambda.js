const { app, ensureUserTable } = require('./server');
const serverlessExpress = require('@vendia/serverless-express');

// Preparar la tabla al inicializar la Lambda (no obligatorio en producción si ya existe)
(async () => {
  try {
    await ensureUserTable();
  } catch (err) {
    console.warn('No se pudo asegurar la tabla al iniciar Lambda (puede que ya exista o que falten permisos):', err.message);
  }
})();

const handler = serverlessExpress({ app });

module.exports.handler = async (event, context) => {
  return handler(event, context);
};

// Para testing local: node lambda.js -> simula handler (no se ejecuta automáticamente)
if (require.main === module) {
  console.log('Este archivo es el handler Lambda. Deploya `server/lambda.handler` a Lambda.');
}
