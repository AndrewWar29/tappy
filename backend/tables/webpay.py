import json
import logging
import os
import urllib.parse
from datetime import datetime
import config
import boto3
from dynamodb_tools import readItem, updateItem, insertItem
from transbank.webpay.webpay_plus.transaction import Transaction
from transbank.common.options import WebpayOptions
from transbank.common.integration_commerce_codes import IntegrationCommerceCodes
from transbank.common.integration_api_keys import IntegrationApiKeys
from transbank.common.integration_type import IntegrationType

logger = logging.getLogger(__name__)
logger.setLevel(config.env.loglevel)

ORDERS_TABLE = os.environ.get('ORDERS_TABLE', 'Tappy_Orders')
PAYMENTS_TABLE = os.environ.get('PAYMENTS_TABLE', 'Tappy_Payments')
API_BASE_URL = os.environ.get('API_BASE_URL', 'https://tappy.cl') # Fallback to prod
APP_BASE_URL = os.environ.get('APP_BASE_URL', 'https://tappy.cl')

def get_transaction():
    # Configure for Production or Integration based on env
    # For now, let's assume Integration for safety unless env vars are set
    # But the JS code used a lib/transbank.js which likely had the config.
    # I'll use Integration defaults if no env vars.
    
    cc = os.environ.get('TBK_COMMERCE_CODE', IntegrationCommerceCodes.WEBPAY_PLUS)
    api_key = os.environ.get('TBK_API_KEY', IntegrationApiKeys.WEBPAY)
    env_type = IntegrationType.TEST if cc == IntegrationCommerceCodes.WEBPAY_PLUS else IntegrationType.LIVE
    
    tx = Transaction(WebpayOptions(cc, api_key, env_type))
    return tx


def get_base_urls(env):
    """
    Returns the base URLs for API callbacks and frontend redirects.
    IMPORTANT: Always use the CloudFront domain (tappy.cl) for Webpay callbacks.
    Using the raw API Gateway URL causes 404s because it lacks the /Prod stage prefix.
    """
    api_url = os.environ.get('API_BASE_URL', 'https://tappy.cl')
    app_url = os.environ.get('APP_BASE_URL', 'https://tappy.cl')
    return api_url, app_url

def router(path, method, querystring, data, env):
    logger.debug(f'Webpay Router: {method} {path}')
    
    # POST /api/pay-webpay/init
    if method == 'POST' and (path.endswith('/init') or path.endswith('/init/')):
        return init_transaction(data, env)
        
    # POST /api/pay-webpay/commit
    # GET /api/pay-webpay/commit
    if path.endswith('/commit') or path.endswith('/commit/'):
        return commit_transaction(method, querystring, data, env)

    return {
        'operationResult': False,
        'errorcode': 'RouteNotFound',
        'detail': f'Route {method} {path} not found in Webpay'
    }

def init_transaction(data, env):
    api_base, app_base = get_base_urls(env)
    
    order_id = data.get('orderId')
    user_id = data.get('userId', 'guest')
    
    if not order_id:
        return {'operationResult': False, 'errorcode': 'MissingOrderId', 'detail': 'orderId required'}
        
    # 1. Get Order
    r = readItem({'table': ORDERS_TABLE, 'key': {'id': order_id}})
    if not r['operationResult']:
        return {'operationResult': False, 'errorcode': 'OrderNotFound', 'detail': 'Order not found'}
    
    order = r['response']
    if order.get('status') != 'PENDING':
         return {'operationResult': False, 'errorcode': 'InvalidStatus', 'detail': f"Order not PENDING (current: {order.get('status')})"}
         
    # 2. Prepare Transaction
    buy_order = str(order['id'])[:26]
    session_id = str(user_id)[:61]
    amount = order.get('totalAmount', order.get('amountCLP', 0))  # Usar totalAmount que incluye shipping
    
    # Use dynamic API_BASE_URL for the return link
    return_url = f"{api_base}/api/pay-webpay/commit?orderId={urllib.parse.quote(order['id'])}"
    
    try:
        tx = get_transaction()
        response = tx.create(buy_order, session_id, float(amount), return_url)
        return {
            'ok': True,
            'redirectUrl': f"{response['url']}?token_ws={response['token']}"
        }
    except Exception as e:
        logger.error(f"Webpay Init Error: {e}")
        return {'operationResult': False, 'errorcode': 'WebpayError', 'detail': str(e)}

def commit_transaction(method, querystring, data, env):
    api_base, app_base = get_base_urls(env)

    # Token can be in body (POST) or querystring (GET)?
    # Webpay usually POSTs to returnUrl, but sometimes GET?
    # The JS code handled both.
    
    token = None
    if method == 'POST':
        token = data.get('token_ws')
    elif method == 'GET':
        # querystring is a dict
        token = querystring.get('token_ws')
        
    order_id = querystring.get('orderId')
    
    if not token or not order_id:
        # Redirect to error
        return redirect(f"{app_base}/pago/error?orderId={order_id or ''}")
        
    try:
        tx = get_transaction()
        response = tx.commit(token)
        
        status = 'AUTHORIZED' if response['status'] == 'AUTHORIZED' and response['response_code'] == 0 else 'FAILED'
        final_status = 'PAID' if status == 'AUTHORIZED' else 'FAILED'
        
        # Update Order
        updateItem({
            'table': ORDERS_TABLE,
            'key': {'id': order_id}
        }, [
            {'name': 'status', 'value': final_status},
            {'name': 'provider', 'value': 'webpay'},
            {'name': 'updatedAt', 'value': datetime.utcnow().isoformat()}
        ])
        
        # Save Payment
        now = datetime.utcnow().isoformat()
        payment_id = f"{order_id}#{response.get('buy_order') or response.get('authorization_code') or token}"
        
        payment_item = {
            'id': payment_id,
            'orderId': order_id,
            'provider': 'webpay',
            'providerPaymentId': response.get('authorization_code') or response.get('buy_order'),
            'status': final_status,
            'amount': response.get('amount'),
            'buyOrder': response.get('buy_order'),
            'sessionId': response.get('session_id'),
            'authorizationCode': response.get('authorization_code'),
            'paymentTypeCode': response.get('payment_type_code'),
            'installmentsNumber': response.get('installments_number'),
            'responseCode': response.get('response_code'),
            'cardLast4': response.get('card_detail', {}).get('card_number'),
            'vci': response.get('vci'),
            'accountingDate': response.get('accounting_date'),
            'transactionDate': response.get('transaction_date'),
            'commerceCode': response.get('commerce_code'),
            'raw': response, # Might need JSON serialization if it's an object
            'createdAt': now,
            'updatedAt': now
        }
        
        # Convert 'raw' to dict if it's not
        if not isinstance(payment_item['raw'], dict):
             payment_item['raw'] = payment_item['raw'].__dict__ if hasattr(payment_item['raw'], '__dict__') else str(payment_item['raw'])

        insertItem({'table': PAYMENTS_TABLE, 'item': payment_item})
        
        if final_status == 'PAID':
            # Send confirmation email
            try:
                order_data = readItem({'table': ORDERS_TABLE, 'key': {'id': order_id}})
                if order_data.get('operationResult'):
                    order = order_data['response']
                    shipping = order.get('shippingInfo', {})
                    email = shipping.get('email', '')
                    if email:
                        send_purchase_confirmation_email(email, order, payment_item)
                    else:
                        logger.warning(f'No email found for order {order_id}, skipping confirmation email')
            except Exception as email_err:
                logger.error(f'Error sending confirmation email: {email_err}')
                # Don't fail the payment flow if email fails
            
            return redirect(f"{app_base}/pago/exito?orderId={order_id}")
        else:
            return redirect(f"{app_base}/pago/error?orderId={order_id}")
            
    except Exception as e:
        logger.error(f"Webpay Commit Error: {e}")
        return redirect(f"{app_base}/pago/error?orderId={order_id}")

def redirect(url):
    return {
        'statusCode': 302,
        'headers': {'Location': url},
        'body': ''
    }

def send_purchase_confirmation_email(email, order, payment):
    """
    Sends a purchase confirmation email with order details
    """
    ses_client = boto3.client('ses', region_name='us-east-1')
    sender = 'noreply@tappy.cl'
    
    shipping = order.get('shippingInfo', {})
    items = order.get('items', [])
    customer_name = f"{shipping.get('firstName', '')} {shipping.get('lastName', '')}".strip() or 'Cliente'
    order_id = order.get('id', '')
    total = order.get('totalAmount', order.get('amountCLP', 0))
    card_last4 = payment.get('cardLast4', '****')
    auth_code = payment.get('authorizationCode', '')
    
    # Build items HTML
    items_html = ''
    for item in items:
        name = item.get('name', item.get('sku', 'Producto'))
        qty = item.get('qty', 1)
        price = item.get('priceCLP', 0)
        subtotal = price * qty
        items_html += f'''
        <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee;">{name}</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: center;">{qty}</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right;">${subtotal:,.0f}</td>
        </tr>
        '''
    
    # Shipping info
    shipping_method = shipping.get('shippingMethod', 'No especificado')
    shipping_cost = shipping.get('shippingCost', 0)
    address = shipping.get('address', '')
    city = shipping.get('city', '')
    region = shipping.get('region', '')
    phone = shipping.get('phone', '')
    
    subject = f'✅ Confirmación de compra Tappy - Orden #{order_id[:8]}'
    
    body_html = f"""
    <html>
    <head></head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <div style="background: linear-gradient(135deg, #4ECDC4 0%, #45B7AA 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">¡Gracias por tu compra!</h1>
            <p style="color: rgba(255,255,255,0.9); margin-top: 8px;">Tu pedido ha sido confirmado</p>
        </div>
        
        <div style="padding: 30px; background: #fff; border: 1px solid #e5e5e5;">
            <p>Hola <strong>{customer_name}</strong>,</p>
            <p>Tu pago ha sido procesado exitosamente. Aquí están los detalles de tu pedido:</p>
            
            <div style="background: #f9f9f9; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #4ECDC4;">📦 Detalle del pedido</h3>
                <p style="font-size: 13px; color: #666;">Orden: #{order_id[:8]}</p>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <thead>
                        <tr style="border-bottom: 2px solid #ddd;">
                            <th style="text-align: left; padding: 8px 0;">Producto</th>
                            <th style="text-align: center; padding: 8px 0;">Cant.</th>
                            <th style="text-align: right; padding: 8px 0;">Precio</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items_html}
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #eee;">Envío ({shipping_method})</td>
                            <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: center;">-</td>
                            <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right;">${shipping_cost:,.0f}</td>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="2" style="padding: 12px 0; font-weight: bold; font-size: 16px;">Total</td>
                            <td style="padding: 12px 0; font-weight: bold; font-size: 16px; text-align: right; color: #4ECDC4;">${total:,.0f} CLP</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            <div style="background: #f9f9f9; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #4ECDC4;">🚚 Datos de envío</h3>
                <p style="margin: 4px 0;"><strong>{customer_name}</strong></p>
                <p style="margin: 4px 0; color: #666;">{address}</p>
                <p style="margin: 4px 0; color: #666;">{city}, {region}</p>
                <p style="margin: 4px 0; color: #666;">Tel: {phone}</p>
                <p style="margin: 4px 0; color: #666;">Envío por: <strong>{shipping_method}</strong></p>
            </div>
            
            <div style="background: #e8f5e9; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px;">💳 Pago con tarjeta terminada en <strong>{card_last4}</strong></p>
                <p style="margin: 4px 0 0; font-size: 12px; color: #666;">Código de autorización: {auth_code}</p>
            </div>
            
            <p style="font-size: 13px; color: #666; margin-top: 20px;">Te notificaremos cuando tu pedido sea despachado.</p>
        </div>
        
        <div style="background: #f5f5f5; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #e5e5e5; border-top: none;">
            <p style="margin: 0; font-size: 12px; color: #999;">Este correo fue enviado por Tappy. Si tienes dudas, contáctanos a soporte@tappy.cl</p>
        </div>
    </body>
    </html>
    """
    
    body_text = f"""¡Gracias por tu compra, {customer_name}!

Tu pedido ha sido confirmado.
Orden: #{order_id[:8]}
Total: ${total:,.0f} CLP
Tarjeta: ****{card_last4}

Te notificaremos cuando tu pedido sea despachado.
"""
    
    try:
        ses_response = ses_client.send_email(
            Source=sender,
            Destination={'ToAddresses': [email]},
            Message={
                'Subject': {'Data': subject, 'Charset': 'UTF-8'},
                'Body': {
                    'Text': {'Data': body_text, 'Charset': 'UTF-8'},
                    'Html': {'Data': body_html, 'Charset': 'UTF-8'}
                }
            }
        )
        logger.info(f'Confirmation email sent to {email}. MessageId: {ses_response["MessageId"]}')
        return True
    except Exception as e:
        logger.error(f'Error sending confirmation email to {email}: {str(e)}')
        return False
