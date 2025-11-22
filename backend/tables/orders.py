import json
import logging
import os
import uuid
from datetime import datetime
import config
from dynamodb_tools import insertItem, readItem, queryItems

logger = logging.getLogger(__name__)
logger.setLevel(config.env.loglevel)

TABLE_NAME = os.environ.get('ORDERS_TABLE', 'Tappy_Orders')

PRICE_CATALOG = {
  'tappy-card': 4990,
  'tappy-basic': 4990,
  'tappy-premium': 4990,
  'tappy-pack10': 4990
}

def router(path, method, querystring, data, env):
    logger.debug(f'Orders Router: {method} {path}')
    
    # POST /api/checkout (Create Order)
    if method == 'POST' and (path.endswith('/checkout') or path.endswith('/checkout/')):
        return create_order(data)
    
    # GET /api/checkout/orders-by-user/:userId
    if method == 'GET' and 'orders-by-user' in path:
        parts = path.rstrip('/').split('/')
        user_id = parts[-1]
        return get_orders_by_user(user_id)
        
    # GET /api/checkout/orders/:id
    if method == 'GET' and 'orders' in path:
        parts = path.rstrip('/').split('/')
        order_id = parts[-1]
        return get_order(order_id)

    return {
        'operationResult': False,
        'errorcode': 'RouteNotFound',
        'detail': f'Route {method} {path} not found in Orders'
    }

def validate_and_correct_items(items):
    validated = []
    for item in items:
        sku = item.get('sku') or item.get('id')
        catalog_price = PRICE_CATALOG.get(sku)
        
        if not catalog_price:
            raise ValueError(f"Producto no encontrado: {sku}")
            
        validated.append({
            **item,
            'sku': sku,
            'priceCLP': catalog_price,
            'qty': int(item.get('qty', 1))
        })
    return validated

def create_order(data):
    items = data.get('items')
    user_id = data.get('userId', 'guest')
    
    if not items or not isinstance(items, list):
        return {'operationResult': False, 'errorcode': 'InvalidInput', 'detail': 'Items required'}
        
    try:
        validated_items = validate_and_correct_items(items)
    except ValueError as e:
        return {'operationResult': False, 'errorcode': 'InvalidProduct', 'detail': str(e)}
        
    amount_clp = sum(item['priceCLP'] * item['qty'] for item in validated_items)
    
    if amount_clp <= 0:
        return {'operationResult': False, 'errorcode': 'InvalidAmount', 'detail': 'Total must be > 0'}
        
    now = datetime.utcnow().isoformat()
    order_id = str(uuid.uuid4())
    
    order = {
        'id': order_id,
        'userId': user_id,
        'items': validated_items,
        'amountCLP': amount_clp,
        'currency': 'CLP',
        'status': 'PENDING',
        'provider': None,
        'createdAt': now,
        'updatedAt': now
    }
    
    res = insertItem({'table': TABLE_NAME, 'item': order})
    
    if res['operationResult']:
        return {
            'ok': True, # Frontend expects { ok: true, orderId: ... }
            'orderId': order_id,
            'amountCLP': amount_clp,
            'currency': 'CLP'
        }
    return res

def get_orders_by_user(user_id):
    if not user_id:
        return {'ok': False, 'message': 'userId required'}
        
    res = queryItems({
        'table': TABLE_NAME,
        'indexName': 'UserIndex',
        'keyCondition': 'userId = :u',
        'expressionAttributeValues': {':u': user_id},
        'scanIndexForward': False
    })
    
    if res['operationResult']:
        return {'ok': True, 'orders': res['response']}
    return {'ok': False, 'message': 'Error listing orders'}

def get_order(order_id):
    res = readItem({'table': TABLE_NAME, 'key': {'id': order_id}})
    
    if res['operationResult']:
        return {'ok': True, 'order': res['response']}
    return {'ok': False, 'message': 'Order not found'}
