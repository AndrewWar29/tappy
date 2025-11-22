import json
import logging
import re
import os
import sys
import config
import importlib
from decimal import Decimal
from datetime import datetime, date
from time import time, struct_time, mktime

logger = logging.getLogger(__name__)
logger.setLevel(config.env.loglevel)
logger.debug('Lambda Data Handler Started')

class CustomJsonEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, datetime):
            return str(o)
        if isinstance(o, date):
            return str(o)
        if isinstance(o, Decimal):
            return float(o)
        if isinstance(o, struct_time):
            return datetime.fromtimestamp(mktime(o))
        return super(CustomJsonEncoder, self).default(o)

def lambda_handler(event, context):
    env = config.Config()
    env.event = event
    
    # Regex para capturar el recurso: /api/RESOURCE/...
    # Ejemplo: /api/users, /api/checkout
    regexp = r'/api/(?P<resource>[a-zA-Z0-9_-]+)'
    
    # Lista de tablas/recursos permitidos
    # Esto debería venir de una variable de entorno o estar hardcodeado
    allowedtables = ['users', 'checkout', 'payments', 'pay-webpay', 'pay-khipu']
    
    logger.debug(f'Allowed tables: {allowedtables}')

    valid = True
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    response = {}
    method = ''
    path = ''
    data = {}
    querystring = {}
    routed = False

    try:
        if 'requestContext' in event and 'http' in event['requestContext']:
            # HTTP API (v2)
            method = event['requestContext']['http']['method']
            path = event['requestContext']['http']['path']
            stage = event['requestContext']['stage']
        elif 'httpMethod' in event and 'path' in event:
            # REST API (v1)
            method = event['httpMethod']
            path = event['path']
            stage = event['requestContext']['stage'] if 'requestContext' in event and 'stage' in event['requestContext'] else 'prod'
        else:
             # Fallback
             pass

        # Determinar stage
        if stage.startswith('dev'):
            env.stage = 'dev'
        elif stage.startswith('prod'):
            env.stage = 'prod'
        
        if method not in methods:
            response = {'operationResult': False, 'errorcode': 'MethodNotAllowed', 'detail': f'Method {method} Not Allowed'}
            valid = False
        
        # CORS Preflight
        if method == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-auth-token',
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
                },
                'body': ''
            }

        if valid:
            if 'queryStringParameters' in event:
                querystring = event['queryStringParameters'] if event['queryStringParameters'] else {}
            
            if 'body' in event and event['body']:
                try:
                    if event.get('isBase64Encoded', False):
                        import base64
                        body_decoded = base64.b64decode(event['body']).decode('utf-8')
                        data = json.loads(body_decoded)
                    else:
                        data = json.loads(event['body'])
                except Exception as e:
                    logger.error(f"Error parsing body: {e}")
                    data = {}
            
            logger.debug(f'Method: {method}, Path: {path}')

            match = re.search(regexp, path)
            if match:
                resource = match.group('resource')
                if resource in allowedtables:
                    logger.debug(f'Routing to table: {resource}')
                    try:
                        mod = importlib.import_module(f'backend.tables.{resource.replace("-", "_")}') # python modules can't have dashes usually, but let's see. 
                        # Actually, importlib can import files with dashes if we use filename, but standard import expects underscores.
                        # I will rename pay-webpay.py to webpay.py and pay-khipu.py to khipu.py to be safe and clean.
                        # For now let's assume I will rename them in the next step.
                        # Let's map resource names to module names.
                        module_map = {
                            'users': 'users',
                            'checkout': 'orders', # Renaming checkout to orders internally
                            'payments': 'payments',
                            'pay-webpay': 'webpay',
                            'pay-khipu': 'khipu'
                        }
                        
                        module_name = module_map.get(resource, resource)
                        mod = importlib.import_module(f'backend.tables.{module_name}')
                        
                        func = getattr(mod, 'router')
                        # Pass path relative to the resource to the router?
                        # The reference router takes the full path and strips the prefix.
                        response = func(path, method, querystring, data, env)
                        routed = True
                    except ImportError as e:
                        logger.error(f"ImportError: {e}")
                        response = {'operationResult': False, 'errorcode': 'ModuleNotFound', 'detail': f'Module for {resource} not found'}
                    except Exception as e:
                        logger.error(f"Error executing router: {e}", exc_info=True)
                        response = {'operationResult': False, 'errorcode': 'InternalError', 'detail': str(e)}

            if not routed:
                response = {'operationResult': False, 'errorcode': 'NotAllowedPath', 'detail': f'Path {path} Not Allowed'}

        # Map 'detail' to 'msg' for frontend compatibility if needed
        if not response.get('operationResult', True) and 'detail' in response and 'msg' not in response:
            response['msg'] = response['detail']

        body = json.dumps(response, cls=CustomJsonEncoder)
        
        return {
            'isBase64Encoded': False,
            'statusCode': 200 if response.get('operationResult', True) else 400, # Simple status mapping
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*', # CORS
                'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-auth-token',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
            },
            'body': body
        }

    except Exception as e:
        logger.critical(e, exc_info=True)
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
