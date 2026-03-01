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
API_BASE_URL = os.environ.get('API_BASE_URL', 'https://tappy.cl')
APP_BASE_URL = os.environ.get('APP_BASE_URL', 'https://tappy.cl')

# Cache for SSM parameters — avoids calling SSM on every request
_ssm_cache = {}

def get_ssm_param(param_name):
    """Reads a SecureString from SSM Parameter Store with in-memory cache."""
    if param_name in _ssm_cache:
        return _ssm_cache[param_name]
    try:
        ssm = boto3.client('ssm', region_name='us-east-1')
        resp = ssm.get_parameter(Name=param_name, WithDecryption=True)
        value = resp['Parameter']['Value']
        _ssm_cache[param_name] = value
        logger.info(f"SSM param loaded: {param_name}")
        return value
    except Exception as e:
        logger.error(f"Error reading SSM param '{param_name}': {e}")
        return None

def get_transaction():
    """Returns a configured Webpay Transaction object.
    Reads credentials from SSM at runtime (SecureString, encrypted).
    Falls back to integration/test credentials if SSM params are not set.
    """
    cc_param = os.environ.get('TBK_COMMERCE_CODE_PARAM')
    api_key_param = os.environ.get('TBK_API_KEY_PARAM')

    if cc_param and api_key_param:
        # Production: read from SSM Parameter Store
        cc = get_ssm_param(cc_param) or IntegrationCommerceCodes.WEBPAY_PLUS
        api_key = get_ssm_param(api_key_param) or IntegrationApiKeys.WEBPAY
    else:
        # Fallback to env vars or integration defaults (for local testing)
        cc = os.environ.get('TBK_COMMERCE_CODE', IntegrationCommerceCodes.WEBPAY_PLUS)
        api_key = os.environ.get('TBK_API_KEY', IntegrationApiKeys.WEBPAY)

    env_type = IntegrationType.TEST if cc == IntegrationCommerceCodes.WEBPAY_PLUS else IntegrationType.LIVE
    logger.info(f"Webpay env_type: {env_type}, commerce_code: {cc[:6]}***")

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

    # Merge querystring and POST data for parameter extraction
    params = {}
    if querystring:
        params.update(querystring)
    if data:
        params.update(data)
    
    order_id = params.get('orderId', '')
    token_ws = params.get('token_ws')
    tbk_token = params.get('TBK_TOKEN')
    tbk_orden_compra = params.get('TBK_ORDEN_COMPRA')
    tbk_id_sesion = params.get('TBK_ID_SESION')
    
    logger.info(f"Webpay Commit - orderId: {order_id}, token_ws: {bool(token_ws)}, TBK_TOKEN: {bool(tbk_token)}, TBK_ORDEN_COMPRA: {tbk_orden_compra}")
    
    # ────────────────────────────────────────────────────
    # CASO 1: TIMEOUT / ABANDONO
    # Transbank envía TBK_TOKEN + TBK_ORDEN_COMPRA + TBK_ID_SESION
    # cuando el usuario no completó el pago a tiempo (timeout)
    # ────────────────────────────────────────────────────
    if tbk_token and tbk_orden_compra and not token_ws:
        logger.warning(f"Webpay TIMEOUT - Order: {order_id}, TBK_TOKEN: {tbk_token}")
        
        if order_id:
            _update_order_status(order_id, 'TIMEOUT', 'El pago expiró. El usuario no completó el formulario de pago a tiempo.')
        
        return redirect(f"{app_base}/pago/error?orderId={order_id}&reason=timeout")
    
    # ────────────────────────────────────────────────────
    # CASO 2: ANULACIÓN / USUARIO CANCELÓ
    # Transbank envía TBK_TOKEN (sin TBK_ORDEN_COMPRA y sin token_ws)
    # cuando el usuario hace clic en "Anular" en el formulario de Webpay
    # ────────────────────────────────────────────────────
    if tbk_token and not token_ws:
        logger.warning(f"Webpay CANCELLED by user - Order: {order_id}, TBK_TOKEN: {tbk_token}")
        
        if order_id:
            _update_order_status(order_id, 'CANCELLED', 'El usuario canceló el pago en el formulario de Webpay.')
        
        return redirect(f"{app_base}/pago/error?orderId={order_id}&reason=cancelled")
    
    # ────────────────────────────────────────────────────
    # CASO 3: NO HAY TOKEN (parámetros faltantes)
    # ────────────────────────────────────────────────────
    if not token_ws or not order_id:
        logger.error(f"Webpay Commit - Missing params. token_ws: {bool(token_ws)}, orderId: {order_id}")
        return redirect(f"{app_base}/pago/error?orderId={order_id or ''}&reason=missing_params")
        
    # ────────────────────────────────────────────────────
    # CASO 4: COMMIT NORMAL (token_ws presente)
    # Transbank envía token_ws cuando el usuario completó el formulario
    # ────────────────────────────────────────────────────
    try:
        tx = get_transaction()
        response = tx.commit(token_ws)
        
        logger.info(f"Webpay Commit Response - status: {response.get('status')}, response_code: {response.get('response_code')}, vci: {response.get('vci')}")
        
        # Determine transaction status and failure reason
        response_code = response.get('response_code')
        vci = response.get('vci', '')
        status_tbk = response.get('status', '')
        
        # Map response codes to human-readable reasons
        failure_reason = _get_failure_reason(response_code, vci, status_tbk)
        
        # Determine final status
        is_approved = (status_tbk == 'AUTHORIZED' and response_code == 0)
        final_status = 'PAID' if is_approved else 'FAILED'
        
        # Build payment details string for cuotas
        payment_type = response.get('payment_type_code', '')
        installments = response.get('installments_number', 0) or 0
        installments_amount = response.get('installments_amount', 0) or 0
        
        # Update Order
        order_update_fields = [
            {'name': 'status', 'value': final_status},
            {'name': 'provider', 'value': 'webpay'},
            {'name': 'updatedAt', 'value': datetime.utcnow().isoformat()}
        ]
        if not is_approved and failure_reason:
            order_update_fields.append({'name': 'failureReason', 'value': failure_reason})
        if installments > 0:
            order_update_fields.append({'name': 'installments', 'value': installments})
        
        updateItem({
            'table': ORDERS_TABLE,
            'key': {'id': order_id}
        }, order_update_fields)
        
        # Save Payment record
        now = datetime.utcnow().isoformat()
        payment_id = f"{order_id}#{response.get('buy_order') or response.get('authorization_code') or token_ws}"
        
        payment_item = {
            'id': payment_id,
            'orderId': order_id,
            'provider': 'webpay',
            'providerPaymentId': response.get('authorization_code') or response.get('buy_order'),
            'status': final_status,
            'failureReason': failure_reason if not is_approved else '',
            'amount': response.get('amount'),
            'buyOrder': response.get('buy_order'),
            'sessionId': response.get('session_id'),
            'authorizationCode': response.get('authorization_code'),
            'paymentTypeCode': payment_type,
            'installmentsNumber': installments,
            'installmentsAmount': installments_amount,
            'responseCode': response_code,
            'cardLast4': response.get('card_detail', {}).get('card_number'),
            'vci': vci,
            'accountingDate': response.get('accounting_date'),
            'transactionDate': response.get('transaction_date'),
            'commerceCode': response.get('commerce_code'),
            'raw': response,
            'createdAt': now,
            'updatedAt': now
        }
        
        # Convert 'raw' to dict if it's not
        if not isinstance(payment_item['raw'], dict):
             payment_item['raw'] = payment_item['raw'].__dict__ if hasattr(payment_item['raw'], '__dict__') else str(payment_item['raw'])

        insertItem({'table': PAYMENTS_TABLE, 'item': payment_item})
        
        if is_approved:
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
            
            return redirect(f"{app_base}/pago/exito?orderId={order_id}")
        else:
            reason_param = urllib.parse.quote(failure_reason) if failure_reason else 'rejected'
            return redirect(f"{app_base}/pago/error?orderId={order_id}&reason={reason_param}")
            
    except Exception as e:
        logger.error(f"Webpay Commit Error: {e}")
        if order_id:
            _update_order_status(order_id, 'ERROR', f'Error al confirmar el pago: {str(e)[:200]}')
        return redirect(f"{app_base}/pago/error?orderId={order_id}&reason=commit_error")


def _get_failure_reason(response_code, vci, status):
    """Maps Transbank response codes and VCI to human-readable Spanish reasons"""
    
    # VCI (Visa Commerce Indicator) codes
    vci_failures = {
        'TSN': 'Autenticación fallida',
        'TSR': 'Autenticación fallida',
        'NP': 'No participante (tarjeta no soporta autenticación)',
        'U3': 'Autenticación fallida en el banco',
        'INV': 'Datos inválidos',
        'A': '',  # Authenticated OK
        'ECI': '', # OK
    }
    
    # Response code mapping
    # https://www.transbankdevelopers.cl/referencia/webpay#codigos-de-respuesta
    response_code_reasons = {
        0: '',  # Aprobado
        -1: 'Rechazo de la transacción. Posibles causas: fondos insuficientes, tarjeta bloqueada o límite excedido.',
        -2: 'Transacción debe reintentarse. Error temporal del banco.',
        -3: 'Error en la transacción. Contacte a su banco.',
        -4: 'Transacción rechazada por sospecha de fraude o motivos de seguridad.',
        -5: 'Rechazo sin motivo específico.',
        -6: 'Tarjeta inválida, vencida o con restricciones.',
        -7: 'Transacción rechazada. Excede límite permitido.',
        -8: 'Tarjeta no soportada o no habilitada para compras en línea.',
    }
    
    # Check VCI first
    vci_reason = vci_failures.get(vci, '')
    
    # Check response code
    if response_code is not None and response_code in response_code_reasons:
        code_reason = response_code_reasons[response_code]
        if code_reason:
            return code_reason
    
    if vci_reason:
        return vci_reason
    
    if status == 'FAILED':
        return 'La transacción fue rechazada por el banco emisor.'
    
    if response_code is not None and response_code != 0:
        return f'Transacción rechazada (código: {response_code}).'
    
    return ''


def _update_order_status(order_id, status, reason=''):
    """Helper to update order status and failure reason"""
    try:
        fields = [
            {'name': 'status', 'value': status},
            {'name': 'provider', 'value': 'webpay'},
            {'name': 'updatedAt', 'value': datetime.utcnow().isoformat()}
        ]
        if reason:
            fields.append({'name': 'failureReason', 'value': reason})
        
        updateItem({
            'table': ORDERS_TABLE,
            'key': {'id': order_id}
        }, fields)
    except Exception as e:
        logger.error(f"Error updating order {order_id}: {e}")

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
