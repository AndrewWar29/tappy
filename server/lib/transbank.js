// server/lib/transbank.js
const {
  WebpayPlus,
  Options,
  Environment,
  IntegrationCommerceCodes,
  IntegrationApiKeys
} = require('transbank-sdk');

/**
 * Helper para obtener la transacción Webpay.
 * - Sandbox (recomendado ahora): setear TBK_USE_INTEGRATION=1
 * - Producción: cambiar a Options(..., Environment.Production) con tus credenciales reales
 */
function getWebpay() {
  // Sandbox / integración oficial (no requiere credenciales propias)
  if (process.env.TBK_USE_INTEGRATION === '1') {
    const options = new Options(
      IntegrationCommerceCodes.WEBPAY_PLUS,
      IntegrationApiKeys.WEBPAY,
      Environment.Integration
    );
    return new WebpayPlus.Transaction(options);
  }

  // Producción (placeholder para más adelante: usa Secrets Manager o env vars)
  // const options = new Options(
  //   process.env.TBK_COMMERCE_CODE,
  //   process.env.TBK_API_KEY,
  //   Environment.Production
  // );
  // return new WebpayPlus.Transaction(options);

  // Fallback seguro a integración si no se configuró nada
  const options = new Options(
    IntegrationCommerceCodes.WEBPAY_PLUS,
    IntegrationApiKeys.WEBPAY,
    Environment.Integration
  );
  return new WebpayPlus.Transaction(options);
}

module.exports = { getWebpay };
