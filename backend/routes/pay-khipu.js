const express = require('express');
const { GetCommand, UpdateCommand, PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../config/dynamodb');
const { createPayment, getPaymentByNotification } = require('../lib/khipuClient');

const router = express.Router();
const ORDERS_TABLE = 'Tappy_Orders';
const PAYMENTS_TABLE = 'Tappy_Payments';

// Helper idempotencia: buscamos pagos por orderId
async function findPaymentsByOrder(orderId) {
  const out = await docClient.send(new QueryCommand({
    TableName: PAYMENTS_TABLE,
    IndexName: 'OrderIndex',
    KeyConditionExpression: 'orderId = :o',
    ExpressionAttributeValues: { ':o': orderId }
  }));
  return out.Items || [];
}

router.post('/init', async (req, res) => {
  try {
    const { orderId } = req.body || {};
    if (!orderId) return res.status(400).json({ ok: false, message: 'orderId requerido' });

    // 1) Cargar orden
    const out = await docClient.send(new GetCommand({ TableName: ORDERS_TABLE, Key: { id: orderId } }));
    const order = out.Item;
    if (!order) return res.status(404).json({ ok: false, message: 'Orden no encontrada' });
    if (order.status !== 'PENDING') {
      return res.status(400).json({ ok: false, message: `Orden no está PENDING (actual: ${order.status})` });
    }

    const amount = order.amountCLP;
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ ok: false, message: 'Monto inválido' });
    }

    const appSuccess = process.env.PUBLIC_SUCCESS_URL || 'https://tappy.cl/checkout/success';
    const appCancel = process.env.PUBLIC_CANCEL_URL || 'https://tappy.cl/checkout/cancel';
    const apiBase = process.env.PUBLIC_BASE_API || process.env.API_BASE_URL || '';
    const returnUrl = `${appSuccess}?orderId=${encodeURIComponent(orderId)}`;
    const cancelUrl = `${appCancel}?orderId=${encodeURIComponent(orderId)}`;
    const notifyUrl = `${apiBase}/api/pay-khipu/notify`;

    const payerEmail = order.email || order.userEmail || 'cliente@tappy.cl';
    const subject = `Tappy - Orden ${orderId}`;

    // 2) Crear pago en Khipu
    const kp = await createPayment({
      orderId,
      amount,
      email: payerEmail,
      subject,
      returnUrl,
      cancelUrl,
      notifyUrl
    });

    const nowIso = new Date().toISOString();

    // 3) Insertar registro de pago (idempotente)
    try {
      await docClient.send(new PutCommand({
        TableName: PAYMENTS_TABLE,
        Item: {
          id: kp.paymentId,
          orderId,
          provider: 'khipu',
            status: 'INITIATED',
          amount,
          currency: 'CLP',
          raw: kp.data,
          createdAt: nowIso,
          updatedAt: nowIso
        },
        ConditionExpression: 'attribute_not_exists(id)'
      }));
    } catch (e) {
      if (e.name !== 'ConditionalCheckFailedException') throw e;
    }

    return res.json({ ok: true, redirectUrl: kp.paymentUrl });
  } catch (err) {
    console.error('[khipu/init] error', err);
    return res.status(500).json({ ok: false, message: 'No se pudo iniciar el pago' });
  }
});

// Webhook notify (Khipu reintenta). Aceptamos form-urlencoded o JSON.
router.post('/notify', async (req, res) => {
  const token = req.body?.notification_token || req.body?.notificationToken || req.query?.notification_token;
  if (!token) {
    return res.status(400).json({ ok: false, message: 'notification_token faltante' });
  }
  try {
    const data = await getPaymentByNotification(token);
    const paymentId = data.payment_id;
    const orderId = data.transaction_id; // lo pusimos como orderId
    const amountPaid = data.amount;
    const statusK = data.status; // 'done', 'pending', 'verifying', 'rejected'

    // Cargar orden
    const out = await docClient.send(new GetCommand({ TableName: ORDERS_TABLE, Key: { id: orderId } }));
    const order = out.Item;
    if (!order) {
      console.warn('[khipu/notify] Orden no existe', orderId);
      return res.status(200).json({ ok: true }); // Respondemos 200 igual
    }

    // Validar monto
    if (Number(order.amountCLP) !== Number(amountPaid)) {
      console.warn('[khipu/notify] Monto no coincide', { esperada: order.amountCLP, recibida: amountPaid });
      // Podríamos marcar FAILED
    }

    let newOrderStatus = order.status;
    if (statusK === 'done') newOrderStatus = 'PAID';
    else if (statusK === 'rejected') newOrderStatus = 'FAILED';
    else if (statusK === 'canceled') newOrderStatus = 'CANCELED';

    // Idempotencia: si ya está PAID no cambiar
    if (order.status !== 'PAID' && newOrderStatus !== order.status) {
      try {
        await docClient.send(new UpdateCommand({
          TableName: ORDERS_TABLE,
          Key: { id: orderId },
          UpdateExpression: 'set #s = :s, updatedAt = :u',
          ExpressionAttributeNames: { '#s': 'status' },
          ExpressionAttributeValues: { ':s': newOrderStatus, ':u': new Date().toISOString() }
        }));
      } catch (e) {
        console.error('[khipu/notify] update order error', e);
      }
    }

    // Actualizar pago (si existe) -> status + raw
    try {
      await docClient.send(new UpdateCommand({
        TableName: PAYMENTS_TABLE,
        Key: { id: paymentId },
        UpdateExpression: 'set #s = :s, raw = :r, updatedAt = :u',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: { ':s': statusK === 'done' ? 'CONFIRMED' : statusK.toUpperCase(), ':r': data, ':u': new Date().toISOString() }
      }));
    } catch (e) {
      console.error('[khipu/notify] update payment error', e);
    }

    console.log('[khipu/notify] pago', {
      paymentId,
      orderId,
      statusK,
      bank: data.bank,
      amount: data.amount,
      khipuFee: data.khipu_fee
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[khipu/notify] error', err);
    // Igual 200 para evitar loops infinitos si el token ya fue usado o inválido
    return res.status(200).json({ ok: true });
  }
});

router.get('/status/:orderId', async (req, res) => {
  const { orderId } = req.params;
  try {
    const out = await docClient.send(new GetCommand({ TableName: ORDERS_TABLE, Key: { id: orderId } }));
    if (!out.Item) return res.status(404).json({ ok: false, message: 'Orden no encontrada' });
    const payments = await findPaymentsByOrder(orderId);
    return res.json({ ok: true, order: out.Item, payments });
  } catch (err) {
    console.error('[khipu/status] error', err);
    return res.status(500).json({ ok: false });
  }
});

module.exports = router;