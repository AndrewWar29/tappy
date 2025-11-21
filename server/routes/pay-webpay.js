const express = require('express');
const { GetCommand, UpdateCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../config/dynamodb'); // o '../dynamodb'
const { getWebpay } = require('../lib/transbank');

const router = express.Router();
const ORDERS_TABLE = process.env.ORDERS_TABLE || 'Tappy_Orders';
const PAYMENTS_TABLE = process.env.PAYMENTS_TABLE || 'Tappy_Payments';

router.get('/health', (_req, res) => res.json({ ok: true, service: 'webpay' }));

/**
 * POST /api/pay-webpay/init
 * body: { orderId, userId? }
 * → { ok, redirectUrl }
 */
router.post('/init', async (req, res) => {
  try {
    const { orderId, userId = 'guest' } = req.body || {};
    if (!orderId) return res.status(400).json({ ok: false, message: 'orderId requerido' });

    // 1) Buscar orden
    const out = await docClient.send(new GetCommand({
      TableName: ORDERS_TABLE, Key: { id: orderId }
    }));
    const order = out.Item;
    if (!order) return res.status(404).json({ ok: false, message: 'Orden no encontrada' });
    if (order.status !== 'PENDING') {
      return res.status(400).json({ ok: false, message: `Orden no está PENDING (actual: ${order.status})` });
    }

    // 2) Preparar transacción
    const tx = getWebpay();
    // Restringir longitudes y caracteres según Webpay Plus
    const sanitize = (s, max) => String(s || '')
      .replace(/[^A-Za-z0-9]/g, '')
      .slice(0, max);
    const buyOrder = sanitize(order.id, 26); // máx 26
    const sessionId = sanitize(userId, 61);  // máx 61
    const amount = order.amountCLP;

    // URL pública de retorno (API Gateway)
    const apiBase = process.env.API_BASE_URL || '';
    if (!apiBase) {
      console.warn('API_BASE_URL no seteado; usa Outputs.ApiUrl en template.yaml');
    }
    const returnUrl = `${apiBase}/api/pay-webpay/commit?orderId=${encodeURIComponent(order.id)}`;

    // 3) Crear transacción
    const { token, url } = await tx.create(buyOrder, sessionId, amount, returnUrl);

    // 4) Responder al frontend para redirigir
    return res.json({ ok: true, redirectUrl: `${url}?token_ws=${token}` });
  } catch (err) {
    console.error('[webpay/init] error', err);
    return res.status(500).json({ ok: false, message: 'No se pudo iniciar el pago' });
  }
});

// Handler compartido para commit (POST/GET)
async function handleCommit(req, res) {
  const token = req.body?.token_ws || req.query?.token_ws;
  const orderId = req.query?.orderId;
  const appBase = process.env.APP_BASE_URL || 'https://tappy.cl';

  try {
    if (!token || !orderId) {
      const to = `${appBase}/pago/error?orderId=${encodeURIComponent(orderId || '')}`;
      return res.redirect(302, to);
    }

    const tx = getWebpay();
    const result = await tx.commit(token); // status AUTHORIZED en éxito

    const approved = result.status === 'AUTHORIZED' && Number(result.response_code) === 0;
    const status = approved ? 'PAID' : 'FAILED';

    try {
      await docClient.send(new UpdateCommand({
        TableName: ORDERS_TABLE,
        Key: { id: orderId },
        UpdateExpression: 'set #s = :s, provider = :p, updatedAt = :u',
        ConditionExpression: 'attribute_not_exists(#s) OR #s <> :paid',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: {
          ':s': status,
          ':p': 'webpay',
          ':u': new Date().toISOString(),
          ':paid': 'PAID'
        }
      }));
    } catch (e) {
      if (e.name !== 'ConditionalCheckFailedException') throw e;
    }

    const nowIso = new Date().toISOString();
    const paymentId = `${orderId}#${result.buy_order || result.authorization_code || token}`;
    try {
      await docClient.send(new PutCommand({
        TableName: PAYMENTS_TABLE,
        Item: {
          id: paymentId,
          orderId,
          provider: 'webpay',
          providerPaymentId: result.authorization_code || result.buy_order || null,
          status,
          amount: result.amount,
          buyOrder: result.buy_order,
          sessionId: result.session_id,
          authorizationCode: result.authorization_code,
          paymentTypeCode: result.payment_type_code,
          installmentsNumber: result.installments_number,
          responseCode: result.response_code,
          cardLast4: result.card_detail?.card_number,
          vci: result.vci,
          accountingDate: result.accounting_date,
          transactionDate: result.transaction_date,
          commerceCode: result.commerce_code,
          raw: result,
          createdAt: nowIso,
          updatedAt: nowIso
        },
        ConditionExpression: 'attribute_not_exists(id)'
      }));
    } catch (e) {
      if (e.name !== 'ConditionalCheckFailedException') throw e;
    }

    const okUrl = `${appBase}/pago/exito?orderId=${encodeURIComponent(orderId)}`;
    const failUrl = `${appBase}/pago/error?orderId=${encodeURIComponent(orderId)}`;
    return res.redirect(302, status === 'PAID' ? okUrl : failUrl);
  } catch (err) {
    console.error('[webpay/commit] error', err);
    const appBase = process.env.APP_BASE_URL || 'https://tappy.cl';
    const orderId = req.query?.orderId;
    const failUrl = `${appBase}/pago/error?orderId=${encodeURIComponent(orderId || '')}`;
    return res.redirect(302, failUrl);
  }
}

/**
 * POST /api/pay-webpay/commit
 * GET  /api/pay-webpay/commit
 */
router.post('/commit', handleCommit);
router.get('/commit', handleCommit);

module.exports = router;
