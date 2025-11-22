const express = require('express');
const { QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../config/dynamodb');

const router = express.Router();
const PAYMENTS_TABLE = 'Tappy_Payments';

router.get('/health', (_req, res) => res.json({ ok: true, service: 'payments' }));

// GET /api/payments/by-order/:orderId
router.get('/by-order/:orderId', async (req, res) => {
  const { orderId } = req.params;
  if (!orderId) return res.status(400).json({ ok: false, message: 'orderId requerido' });
  try {
    const out = await docClient.send(new QueryCommand({
      TableName: PAYMENTS_TABLE,
      IndexName: 'OrderIndex',
      KeyConditionExpression: 'orderId = :o',
      ExpressionAttributeValues: { ':o': orderId }
    }));
    return res.json({ ok: true, payments: out.Items || [] });
  } catch (err) {
    console.error('[payments/by-order] error', err);
    return res.status(500).json({ ok: false, message: 'Error al obtener pagos' });
  }
});

module.exports = router;
