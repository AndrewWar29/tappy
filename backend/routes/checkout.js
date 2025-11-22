const express = require('express');
const { v4: uuid } = require('uuid');
const DynamoOrder = require('../models/DynamoOrder');
const router = express.Router();

// CATÁLOGO DE PRECIOS - FUENTE DE VERDAD EN EL BACKEND
const PRICE_CATALOG = {
  'tappy-card': 4990,
  'tappy-basic': 4990,
  'tappy-premium': 4990,
  'tappy-pack10': 4990
};

// Función para validar y corregir precios
function validateAndCorrectItems(items) {
  return items.map(item => {
    const sku = item.sku || item.id;
    const catalogPrice = PRICE_CATALOG[sku];

    if (!catalogPrice) {
      throw new Error(`Producto no encontrado: ${sku}`);
    }

    // Sobrescribir el precio con el precio del catálogo
    return {
      ...item,
      sku,
      priceCLP: catalogPrice,
      qty: Math.round(Number(item.qty)) || 1
    };
  });
}

/**
 * Health
 */
router.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'checkout' });
});

/**
 * GET /api/checkout/orders-by-user/:userId
 * Lista órdenes por usuario (requiere GSI UserIndex en { userId, createdAt })
 */
router.get('/orders-by-user/:userId', async (req, res) => {
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ ok: false, message: 'userId requerido' });
  try {
    const orders = await DynamoOrder.getOrdersByUserId(userId);
    return res.json({ ok: true, orders });
  } catch (err) {
    console.error('[checkout] error listando ordenes por usuario', err);
    return res.status(500).json({ ok: false, message: 'Error al listar las órdenes' });
  }
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

    // VALIDAR Y CORREGIR PRECIOS CON EL CATÁLOGO DEL SERVIDOR
    let validatedItems;
    try {
      validatedItems = validateAndCorrectItems(items);
    } catch (error) {
      return res.status(400).json({ ok: false, message: error.message });
    }

    // Calcula el total en el servidor usando precios validados
    const amountCLP = validatedItems.reduce((acc, it) => {
      const price = it.priceCLP; // Ya validado por validateAndCorrectItems
      const qty = it.qty;
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
      items: validatedItems, // Usar items validados con precios correctos
      amountCLP,
      currency: 'CLP',
      status: 'PENDING',
      provider: null,
      createdAt: now,
      updatedAt: now
    };

    // Escribe de forma atómica (no sobrescribir si ya existe)
    await DynamoOrder.createOrder(order);

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
    const order = await DynamoOrder.getOrder(id);
    if (!order) {
      return res.status(404).json({ ok: false, message: 'Orden no encontrada' });
    }
    return res.json({ ok: true, order });
  } catch (err) {
    console.error('[checkout] error obteniendo orden', err);
    return res.status(500).json({ ok: false, message: 'Error al obtener la orden' });
  }
});

module.exports = router;
