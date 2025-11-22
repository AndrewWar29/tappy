import json
import logging
import os
import urllib.parse
from datetime import datetime
import config
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

def router(path, method, querystring, data, env):
    logger.debug(f'Webpay Router: {method} {path}')
    
    # POST /api/pay-webpay/init
    if method == 'POST' and (path.endswith('/init') or path.endswith('/init/')):
        return init_transaction(data)
        
    # POST /api/pay-webpay/commit
    # GET /api/pay-webpay/commit
    if path.endswith('/commit') or path.endswith('/commit/'):
        return commit_transaction(method, querystring, data)

    return {
        'operationResult': False,
        'errorcode': 'RouteNotFound',
        'detail': f'Route {method} {path} not found in Webpay'
    }

def init_transaction(data):
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
    amount = order['amountCLP']
    return_url = f"{API_BASE_URL}/api/pay-webpay/commit?orderId={urllib.parse.quote(order['id'])}"
    
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

def commit_transaction(method, querystring, data):
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
        return redirect(f"{APP_BASE_URL}/pago/error?orderId={order_id or ''}")
        
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
            return redirect(f"{APP_BASE_URL}/pago/exito?orderId={order_id}")
        else:
            return redirect(f"{APP_BASE_URL}/pago/error?orderId={order_id}")
            
    except Exception as e:
        logger.error(f"Webpay Commit Error: {e}")
        return redirect(f"{APP_BASE_URL}/pago/error?orderId={order_id}")

def redirect(url):
    return {
        'statusCode': 302,
        'headers': {'Location': url},
        'body': ''
    }
