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
                        # Let's map resource names to module names.
                        module_map = {
                            'users': 'users',
                            'checkout': 'orders', # Renaming checkout to orders internally
                            'payments': 'payments',
                            'pay-webpay': 'webpay',
                            'pay-khipu': 'khipu'
                        }
                        
                        module_name = module_map.get(resource, resource)
                        mod = importlib.import_module(f'tables.{module_name}')
                        
                        func = getattr(mod, 'router')
                        # Pass path relative to the resource to the router?
                        # The reference router takes the full path and strips the prefix.
                        response = func(path, method, querystring, data, env)
                        routed = True
                    except ImportError as e:
                        logger.error(f"ImportError: {e}")
                        response = {'operationResult': False, 'errorcode': 'ModuleNotFound', 'detail': f'Module for {resource} not found: {str(e)}'}
                    except Exception as e:
                        logger.error(f"Error executing router: {e}", exc_info=True)
                        response = {'operationResult': False, 'errorcode': 'InternalError', 'detail': str(e)}

            if not routed and not response:
                response = {'operationResult': False, 'errorcode': 'NotAllowedPath', 'detail': f'Path {path} Not Allowed'}

        # Headers por defecto (CORS)
        headers = {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-auth-token',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        }

        # Si la respuesta del router trae headers (ej: Location para redirect), los mezclamos
        if 'headers' in response:
            headers.update(response['headers'])

        # Determinar status code y body
        if 'statusCode' in response:
            status_code = response['statusCode']
            
            # Si es una redirección o ya tiene un body formateado string, usarlo tal cual
            if 'body' in response and isinstance(response['body'], str):
                body = response['body']
            else:
                # Si no, asumimos que es data y la serializamos
                # Quitamos statusCode y headers del body para no duplicar info si ya se procesaron
                response_data = {k: v for k, v in response.items() if k not in ['statusCode', 'headers']}
                # Si queda algo en response_data lo usamos, si no, quizás la respuesta original era la data
                if not response_data and ('statusCode' not in response or len(response) > 2): 
                     # Caso borde: si response era solo statusCode y headers, body vacio
                     # Pero si response tenie mas cosas, usar response completo (menos lo filtrado)
                     body = json.dumps(response_data, cls=CustomJsonEncoder)
                elif response_data:
                     body = json.dumps(response_data, cls=CustomJsonEncoder)
                else:
                     # Fallback seguro
                     body = json.dumps(response, cls=CustomJsonEncoder)

            # Caso especial para Webpay redirect que retorna structure completa
            if status_code in [301, 302] and 'Location' in headers:
                body = '' # Body vacio para redirects
        else:
            status_code = 200
            body = json.dumps(response, cls=CustomJsonEncoder)
            
        # Mapeo de errores antiguos si aun se usa ese formato
        if not response.get('operationResult', True) and 'errorcode' in response and status_code == 200:
             error_code = response.get('errorcode', '')
             status_map = {
                'Unauthorized': 401, 'Forbidden': 403, 'NotFound': 404,
                'UserExists': 409, 'MissingFields': 400, 'InvalidCredentials': 401,
                'NotImplemented': 501, 'RouteNotFound': 404
             }
             status_code = status_map.get(error_code, 400)

        return {
            'isBase64Encoded': False,
            'statusCode': status_code,
            'headers': headers,
            'body': body
        }

    except Exception as e:
        logger.critical(e, exc_info=True)
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
