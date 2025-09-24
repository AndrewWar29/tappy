const { app, ensureUserTable } = require('./server');
const serverlessExpress = require('@vendia/serverless-express');

// Evitar asegurar tablas dentro de Lambda para no requerir permisos extras
if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
  (async () => {
    try {
      await ensureUserTable();
    } catch (err) {
      console.warn('No se pudo asegurar la tabla al iniciar entorno local:', err.message);
    }
  })();
}

module.exports.handler = serverlessExpress({ app });

// Para testing local: node lambda.js -> simula handler (no se ejecuta automáticamente)
if (require.main === module) {
  console.log('Este archivo es el handler Lambda. Deploya `server/lambda.handler` a Lambda.');
}
