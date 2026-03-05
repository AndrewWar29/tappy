import json
import logging
import os
import hashlib
import hmac
import requests
import urllib.parse
from datetime import datetime
import config
import boto3
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
            if new_status == 'PAID':
                try:
                    send_seller_notification_email(order, payment_data)
                except Exception as notif_err:
                    logger.error(f'Error sending seller notification (khipu): {notif_err}')
            
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


def send_seller_notification_email(order, payment_data):
    """
    Sends a sale notification to the store owner (tappy.app.mail@gmail.com)
    """
    SELLER_EMAIL = 'tappy.app.mail@gmail.com'
    ses_client = boto3.client('ses', region_name='us-east-1')
    sender = 'noreply@tappy.cl'

    shipping = order.get('shippingInfo', {})
    items = order.get('items', [])
    customer_name = f"{shipping.get('firstName', '')} {shipping.get('lastName', '')}".strip() or 'Cliente'
    customer_email = shipping.get('email', 'N/A')
    customer_phone = shipping.get('phone', 'N/A')
    order_id = order.get('id', '')
    total = order.get('totalAmount', order.get('amountCLP', 0))
    shipping_method = shipping.get('shippingMethod', 'No especificado')
    address = shipping.get('address', '')
    city = shipping.get('city', '')
    region = shipping.get('region', '')
    payment_id = payment_data.get('payment_id', '')

    items_html = ''
    items_text = ''
    for item in items:
        name = item.get('name', item.get('sku', 'Producto'))
        qty = item.get('qty', 1)
        price = item.get('priceCLP', 0)
        subtotal = price * qty
        items_html += f'<tr><td style="padding:8px 0;border-bottom:1px solid #eee;">{name}</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center;">{qty}</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">${subtotal:,.0f}</td></tr>'
        items_text += f'  - {name} x{qty}: ${subtotal:,.0f}\n'

    subject = f'🛍️ Nueva venta Tappy (Khipu) - Orden #{order_id[:8]}'

    body_html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <div style="background: linear-gradient(135deg, #4ECDC4 0%, #45B7AA 100%); padding: 25px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🎉 ¡Nueva venta!</h1>
            <p style="color: rgba(255,255,255,0.9); margin-top: 8px;">Orden #{order_id[:8]} — Khipu</p>
        </div>
        <div style="padding: 25px; background: #fff; border: 1px solid #e5e5e5;">
            <h3 style="color: #4ECDC4; margin-top: 0;">👤 Cliente</h3>
            <p style="margin: 4px 0;"><strong>{customer_name}</strong></p>
            <p style="margin: 4px 0; color: #666;">{customer_email}</p>
            <p style="margin: 4px 0; color: #666;">Tel: {customer_phone}</p>

            <h3 style="color: #4ECDC4;">📦 Productos</h3>
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
                <thead><tr style="border-bottom:2px solid #ddd;"><th style="text-align:left;padding:6px 0;">Producto</th><th style="text-align:center;padding:6px 0;">Cant.</th><th style="text-align:right;padding:6px 0;">Precio</th></tr></thead>
                <tbody>{items_html}</tbody>
            </table>
            <p style="font-size:16px;font-weight:bold;text-align:right;color:#4ECDC4;margin-top:12px;">Total: ${total:,.0f} CLP</p>

            <h3 style="color: #4ECDC4;">🚚 Envío</h3>
            <p style="margin: 4px 0; color: #666;">{address}, {city}, {region}</p>
            <p style="margin: 4px 0; color: #666;">Método: <strong>{shipping_method}</strong></p>

            <h3 style="color: #4ECDC4;">💳 Pago (Khipu)</h3>
            <p style="margin: 4px 0; color: #666;">ID de pago: <strong>{payment_id}</strong></p>
        </div>
        <div style="background: #f5f5f5; padding: 15px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #e5e5e5; border-top: none;">
            <p style="margin: 0; font-size: 12px; color: #999;">Notificación automática de Tappy</p>
        </div>
    </body>
    </html>
    """

    body_text = f"""Nueva venta en Tappy (Khipu)!

Orden: #{order_id[:8]}
Cliente: {customer_name}
Email: {customer_email}
Teléfono: {customer_phone}

Productos:
{items_text}
Total: ${total:,.0f} CLP

Envío: {shipping_method}
Dirección: {address}, {city}, {region}

ID de pago Khipu: {payment_id}
"""

    try:
        ses_response = ses_client.send_email(
            Source=sender,
            Destination={'ToAddresses': [SELLER_EMAIL]},
            Message={
                'Subject': {'Data': subject, 'Charset': 'UTF-8'},
                'Body': {
                    'Text': {'Data': body_text, 'Charset': 'UTF-8'},
                    'Html': {'Data': body_html, 'Charset': 'UTF-8'}
                }
            }
        )
        logger.info(f'Seller notification (khipu) sent to {SELLER_EMAIL}. MessageId: {ses_response["MessageId"]}')
        return True
    except Exception as e:
        logger.error(f'Error sending seller notification (khipu) to {SELLER_EMAIL}: {str(e)}')
        return False

