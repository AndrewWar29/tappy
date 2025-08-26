const express = require('express');
const { v4: uuid } = require('uuid');
const { PutCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../config/dynamodb'); // o '../dynamodb' si prefieres
const router = express.Router();

const ORDERS_TABLE = 'Tappy_Orders';

/**
 * Health
 */
router.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'checkout' });
});

/**
 * POST /api/checkout
 * Body:
 * {
 *   "items": [{ "sku": "tappy-card", "name": "Tarjeta NFC", "priceCLP": 14990, "qty": 1 }],
 *   "userId": "user-123"      // opcional, por defecto "guest"
 * }
 *
 * Crea una orden PENDING en DynamoDB y devuelve { orderId, amountCLP, currency }.
 */
router.post('/', async (req, res) => {
  try {
    const { items, userId = 'guest' } = req.body || {};

    // Validaciones mínimas
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ ok: false, message: 'Items requeridos' });
    }
    for (const it of items) {
      if (!it || typeof it !== 'object') {
        return res.status(400).json({ ok: false, message: 'Item inválido' });
      }
      if (typeof it.priceCLP === 'undefined' || isNaN(Number(it.priceCLP))) {
        return res.status(400).json({ ok: false, message: 'priceCLP inválido' });
      }
      if (typeof it.qty === 'undefined' || isNaN(Number(it.qty)) || Number(it.qty) <= 0) {
        return res.status(400).json({ ok: false, message: 'qty inválido' });
      }
    }

    // Calcula el total en el servidor (confianza)
    const amountCLP = items.reduce((acc, it) => {
      const price = Math.round(Number(it.priceCLP));
      const qty = Math.round(Number(it.qty));
      return acc + (price * qty);
    }, 0);

    if (amountCLP <= 0) {
      return res.status(400).json({ ok: false, message: 'El total debe ser mayor a 0' });
    }

    // Construye la orden
    const now = new Date().toISOString();
    const id = uuid();
    const order = {
      id,
      userId,
      items,
      amountCLP,
      currency: 'CLP',
      status: 'PENDING',
      provider: null,
      createdAt: now,
      updatedAt: now
    };

    // Escribe de forma atómica (no sobrescribir si ya existe)
    await docClient.send(new PutCommand({
      TableName: ORDERS_TABLE,
      Item: order,
      ConditionExpression: 'attribute_not_exists(id)'
    }));

    return res.json({ ok: true, orderId: id, amountCLP, currency: 'CLP' });
  } catch (err) {
    console.error('[checkout] error creando orden', err);
    return res.status(500).json({ ok: false, message: 'No se pudo crear la orden' });
  }
});

/**
 * GET /api/checkout/orders/:id
 * Devuelve el estado de una orden
 */
router.get('/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const out = await docClient.send(new GetCommand({
      TableName: ORDERS_TABLE,
      Key: { id }
    }));
    if (!out.Item) {
      return res.status(404).json({ ok: false, message: 'Orden no encontrada' });
    }
    return res.json({ ok: true, order: out.Item });
  } catch (err) {
    console.error('[checkout] error obteniendo orden', err);
    return res.status(500).json({ ok: false, message: 'Error al obtener la orden' });
  }
});

module.exports = router;
