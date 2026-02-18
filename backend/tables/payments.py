import json
import logging
import os
import config
from dynamodb_tools import insertItem, queryItems, scanItems
from boto3.dynamodb.conditions import Attr

logger = logging.getLogger(__name__)
logger.setLevel(config.env.loglevel)

TABLE_NAME = os.environ.get('PAYMENTS_TABLE', 'Tappy_Payments')

def router(path, method, querystring, data, env):
    logger.debug(f'Payments Router: {method} {path}')
    
    # GET /api/payments/by-order/:orderId
    if method == 'GET' and 'by-order' in path:
        parts = path.rstrip('/').split('/')
        order_id = parts[-1]
        return get_payments_by_order(order_id)
    
    return {
        'operationResult': False,
        'errorcode': 'RouteNotFound',
        'detail': f'Route {method} {path} not found in Payments'
    }

def create_payment(payment_data):
    # Helper function to be used by other modules if needed, 
    # though they might use dynamodb_tools directly.
    return insertItem({'table': TABLE_NAME, 'item': payment_data})

def get_payments_by_order(order_id):
    if not order_id:
        return {'ok': False, 'message': 'orderId required'}
        
    # Use Scan with FilterExpression to find payments for this order
    # logic: Scan(FilterExpression=Attr('orderId').eq(order_id))
    
    res = scanItems({
        'table': TABLE_NAME,
        'filterExpression': Attr('orderId').eq(order_id)
    })
    
    if res['operationResult']:
        return {'ok': True, 'payments': res['response']}
    
    return {'ok': False, 'message': 'Error searching payments', 'detail': res.get('detail', '')}

