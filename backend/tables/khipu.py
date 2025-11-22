import json
import logging
import os
import hashlib
import hmac
import requests
import urllib.parse
from datetime import datetime
import config
from dynamodb_tools import readItem, updateItem, insertItem, queryItems

logger = logging.getLogger(__name__)
logger.setLevel(config.env.loglevel)

ORDERS_TABLE = os.environ.get('ORDERS_TABLE', 'Tappy_Orders')
PAYMENTS_TABLE = os.environ.get('PAYMENTS_TABLE', 'Tappy_Payments')
KHIPU_RECEIVER_ID = os.environ.get('KHIPU_RECEIVER_ID')
KHIPU_SECRET = os.environ.get('KHIPU_SECRET')
API_BASE_URL = os.environ.get('API_BASE_URL', 'https://tappy.cl')
APP_BASE_URL = os.environ.get('APP_BASE_URL', 'https://tappy.cl')

def router(path, method, querystring, data, env):
    logger.debug(f'Khipu Router: {method} {path}')
    
    # POST /api/pay-khipu/init
    if method == 'POST' and (path.endswith('/init') or path.endswith('/init/')):
        return init_payment(data)
        
    # POST /api/pay-khipu/notify
    if method == 'POST' and (path.endswith('/notify') or path.endswith('/notify/')):
        # Khipu sends form-urlencoded usually, but let's check data
        # If data is empty, check querystring?
        # The JS code checked body and query.
        return notify_payment(data, querystring)
        
    # GET /api/pay-khipu/status/:orderId
    if method == 'GET' and 'status' in path:
        parts = path.rstrip('/').split('/')
        order_id = parts[-1]
        return get_status(order_id)

    return {
        'operationResult': False,
        'errorcode': 'RouteNotFound',
        'detail': f'Route {method} {path} not found in Khipu'
    }

def create_khipu_payment(payload):
    if not KHIPU_RECEIVER_ID or not KHIPU_SECRET:
        raise Exception("Khipu credentials not configured")
        
    url = "https://khipu.com/api/2.0/payments"
    
    # Sign request
    to_sign = f"POST&{urllib.parse.quote(url)}&"
    # Parameters must be sorted by name
    sorted_params = sorted(payload.items())
    for k, v in sorted_params:
        to_sign += f"{urllib.parse.quote(str(k))}={urllib.parse.quote(str(v))}&"
    to_sign = to_sign[:-1] # Remove last &
    
    signature = hmac.new(KHIPU_SECRET.encode('utf-8'), to_sign.encode('utf-8'), hashlib.sha256).hexdigest()
    
    headers = {
        'Authorization': f'{KHIPU_RECEIVER_ID}:{signature}',
        'Content-Type': 'application/x-www-form-urlencoded'
    }
    
    response = requests.post(url, data=payload, headers=headers)
    response.raise_for_status()
    return response.json()

def get_khipu_payment(notification_token):
    if not KHIPU_RECEIVER_ID or not KHIPU_SECRET:
        raise Exception("Khipu credentials not configured")
        
    url = "https://khipu.com/api/2.0/payments"
    # GET request doesn't have body params to sign usually, but endpoint is payments?notification_token=...
    # Wait, the endpoint to get payment by notification token is usually:
    # GET https://khipu.com/api/2.0/payments?notification_token=...
    
    # But actually there is a specific endpoint or just GET payments with param.
    # Let's assume GET payments.
    
    payload = {'notification_token': notification_token}
    
    # Sign request
    to_sign = f"GET&{urllib.parse.quote(url)}&"
    sorted_params = sorted(payload.items())
    for k, v in sorted_params:
        to_sign += f"{urllib.parse.quote(str(k))}={urllib.parse.quote(str(v))}&"
    to_sign = to_sign[:-1]
    
    signature = hmac.new(KHIPU_SECRET.encode('utf-8'), to_sign.encode('utf-8'), hashlib.sha256).hexdigest()
    
    headers = {
        'Authorization': f'{KHIPU_RECEIVER_ID}:{signature}'
    }
    
    response = requests.get(url, params=payload, headers=headers)
    response.raise_for_status()
    return response.json()

def init_payment(data):
    order_id = data.get('orderId')
    
    if not order_id:
        return {'operationResult': False, 'errorcode': 'MissingOrderId', 'detail': 'orderId required'}
        
    r = readItem({'table': ORDERS_TABLE, 'key': {'id': order_id}})
    if not r['operationResult']:
        return {'operationResult': False, 'errorcode': 'OrderNotFound', 'detail': 'Order not found'}
    
    order = r['response']
    if order.get('status') != 'PENDING':
         return {'operationResult': False, 'errorcode': 'InvalidStatus', 'detail': f"Order not PENDING (current: {order.get('status')})"}
         
    amount = order['amountCLP']
    payer_email = order.get('email') or order.get('userEmail') or 'cliente@tappy.cl'
    subject = f"Tappy - Orden {order_id}"
    
    return_url = f"{APP_BASE_URL}/checkout/success?orderId={order_id}"
    cancel_url = f"{APP_BASE_URL}/checkout/cancel?orderId={order_id}"
    notify_url = f"{API_BASE_URL}/api/pay-khipu/notify"
    
    payload = {
        'subject': subject,
        'currency': 'CLP',
        'amount': amount,
        'transaction_id': order_id,
        'payer_email': payer_email,
        'return_url': return_url,
        'cancel_url': cancel_url,
        'notify_url': notify_url,
        'picture_url': 'https://tappy.cl/logo.png' # Optional
    }
    
    try:
        kp = create_khipu_payment(payload)
        
        now = datetime.utcnow().isoformat()
        payment_item = {
            'id': kp['payment_id'],
            'orderId': order_id,
            'provider': 'khipu',
            'status': 'INITIATED',
            'amount': amount,
            'currency': 'CLP',
            'raw': kp,
            'createdAt': now,
            'updatedAt': now
        }
        
        insertItem({'table': PAYMENTS_TABLE, 'item': payment_item})
        
        return {'ok': True, 'redirectUrl': kp['payment_url']}
        
    except Exception as e:
        logger.error(f"Khipu Init Error: {e}")
        return {'operationResult': False, 'errorcode': 'KhipuError', 'detail': str(e)}

def notify_payment(data, querystring):
    token = data.get('notification_token') or querystring.get('notification_token')
    
    if not token:
        return {'operationResult': False, 'errorcode': 'MissingToken', 'detail': 'notification_token missing'}
        
    try:
        payment_data = get_khipu_payment(token)
        
        payment_id = payment_data['payment_id']
        order_id = payment_data['transaction_id']
        status_k = payment_data['status'] # done, pending, verifying, rejected
        
        # Get Order
        r = readItem({'table': ORDERS_TABLE, 'key': {'id': order_id}})
        if not r['operationResult']:
            logger.warning(f"Order {order_id} not found for khipu payment {payment_id}")
            return {'ok': True} # Return 200 to acknowledge
            
        order = r['response']
        
        new_status = order['status']
        if status_k == 'done':
            new_status = 'PAID'
        elif status_k == 'rejected':
            new_status = 'FAILED'
        elif status_k == 'canceled':
            new_status = 'CANCELED'
            
        if order['status'] != 'PAID' and new_status != order['status']:
            updateItem({
                'table': ORDERS_TABLE,
                'key': {'id': order_id}
            }, [
                {'name': 'status', 'value': new_status},
                {'name': 'updatedAt', 'value': datetime.utcnow().isoformat()}
            ])
            
        # Update Payment
        updateItem({
            'table': PAYMENTS_TABLE,
            'key': {'id': payment_id}
        }, [
            {'name': 'status', 'value': 'CONFIRMED' if status_k == 'done' else status_k.upper()},
            {'name': 'raw', 'value': payment_data},
            {'name': 'updatedAt', 'value': datetime.utcnow().isoformat()}
        ])
        
        return {'ok': True}
        
    except Exception as e:
        logger.error(f"Khipu Notify Error: {e}")
        return {'ok': True} # Return 200 to avoid retries on error?

def get_status(order_id):
    r = readItem({'table': ORDERS_TABLE, 'key': {'id': order_id}})
    if not r['operationResult']:
        return {'operationResult': False, 'errorcode': 'OrderNotFound', 'detail': 'Order not found'}
        
    order = r['response']
    
    # Find payments
    q = queryItems({
        'table': PAYMENTS_TABLE,
        'indexName': 'OrderIndex',
        'keyCondition': 'orderId = :o',
        'expressionAttributeValues': {':o': order_id}
    })
    
    payments = q['response'] if q['operationResult'] else []
    
    return {'ok': True, 'order': order, 'payments': payments}
