import json
import logging
import os
import config
from dynamodb_tools import insertItem

logger = logging.getLogger(__name__)
logger.setLevel(config.env.loglevel)

TABLE_NAME = os.environ.get('PAYMENTS_TABLE', 'Tappy_Payments')

def router(path, method, querystring, data, env):
    logger.debug(f'Payments Router: {method} {path}')
    
    # This module might be used for internal payment creation or listing?
    # The JS routes/payments.js was very simple, let's check it if needed.
    # But based on pay-webpay.js, payments are created there.
    # If there are specific payment routes, implement them here.
    # For now, I'll implement a generic create method if needed, or just return not allowed if no public routes exist.
    
    return {
        'operationResult': False,
        'errorcode': 'RouteNotFound',
        'detail': f'Route {method} {path} not found in Payments'
    }

def create_payment(payment_data):
    # Helper function to be used by other modules if needed, 
    # though they might use dynamodb_tools directly.
    return insertItem({'table': TABLE_NAME, 'item': payment_data})
