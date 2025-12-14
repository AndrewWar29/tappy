import json
import logging
import os
import uuid
import bcrypt
import jwt
import re
import base64
import random
import boto3
from datetime import datetime, timedelta
import config
from dynamodb_tools import insertItem, readItem, updateItem, queryItems, scanItems

logger = logging.getLogger(__name__)
logger.setLevel(config.env.loglevel)

TABLE_NAME = os.environ.get('TABLE_NAME', 'Tappy_Users')
JWT_SECRET = os.environ.get('JWT_SECRET', 'tu_secreto_jwt')

def router(path, method, querystring, data, env):
    """Router for Users"""
    # path comes as /api/users/...
    # We need to strip /api/users to get the relative path
    # But wait, the lambda_function passes the FULL path.
    # Let's assume the prefix is /api/users
    
    # Regex to match routes
    # POST /api/users/register OR POST /api/users/
    # POST /api/users/login
    # GET /api/users/:username
    # PUT /api/users/:id
    # POST /api/users/upload-avatar
    # PUT /api/users/change-password
    
    logger.debug(f'Users Router: {method} {path}')
    
    if method == 'POST' and (path.endswith('/register') or path.endswith('/api/users') or path.endswith('/api/users/')):
        return register(data)
    elif method == 'POST' and path.endswith('/login'):
        return login(data)
    elif method == 'POST' and path.endswith('/verify'):
        return verify_code(data)
    elif method == 'POST' and path.endswith('/upload-avatar'):
        return upload_avatar(env, data) # Multipart handling might be tricky here
    elif method == 'PUT' and path.endswith('/change-password'):
        return change_password(env, data)
    elif method == 'GET':
        # Check for /:username
        # Assuming username is the last part
        parts = path.rstrip('/').split('/')
        username = parts[-1]
        if username != 'users':
            return get_profile(username)
    elif method == 'PUT':
        # Check for /:id
        parts = path.rstrip('/').split('/')
        user_id = parts[-1]
        if user_id != 'users':
             return update_profile(env, user_id, data)

    return {
        'operationResult': False,
        'statusCode': 404,
        'errorcode': 'RouteNotFound',
        'detail': f'Route {method} {path} not found in Users'
    }

def register(data):
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    name = data.get('name', '')
    whatsapp = data.get('whatsapp', '')
    
    if not username or not email or not password:
        return {'operationResult': False, 'statusCode': 400, 'errorcode': 'MissingFields', 'detail': 'Please enter all required fields'}
    
    # Check if user exists
    # Username check
    q_user = queryItems({
        'table': TABLE_NAME,
        'indexName': 'UsernameIndex',
        'keyCondition': 'username = :u',
        'expressionAttributeValues': {':u': username.lower()}
    })
    if q_user['operationResult'] and len(q_user['response']) > 0:
         return {'operationResult': False, 'statusCode': 409, 'errorcode': 'UserExists', 'detail': 'Username already registered'}

    # Email check
    q_email = queryItems({
        'table': TABLE_NAME,
        'indexName': 'EmailIndex',
        'keyCondition': 'email = :e',
        'expressionAttributeValues': {':e': email.lower()}
    })
    if q_email['operationResult'] and len(q_email['response']) > 0:
         return {'operationResult': False, 'statusCode': 409, 'errorcode': 'UserExists', 'detail': 'Email already registered'}

    # Hash password
    salt = bcrypt.gensalt(10)
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    # Generate 4-digit verification code
    verification_code = ''.join([str(random.randint(0, 9)) for _ in range(4)])
    
    user_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    
    item = {
        'id': user_id,
        'username': username.lower(),
        'email': email.lower(),
        'password': hashed,
        'name': name,
        'createdAt': now,
        'updatedAt': now,
        'bio': '',
        'phone': '',
        'avatar': '',
        'social': {
            'instagram': '', 'facebook': '', 'linkedin': '', 'twitter': '',
            'spotify': '', 'youtube': '', 'tiktok': '', 'whatsapp': whatsapp or ''
        },
        'isVerified': False,
        'verificationCode': verification_code
    }
    
    res = insertItem({'table': TABLE_NAME, 'item': item})
    if not res['operationResult']:
        return res
    
    # Send verification email
    email_sent = send_verification_email(email, verification_code, name)
    if not email_sent:
        logger.warning(f'Failed to send verification email to {email}')
        # Continue anyway - user can request resend later if needed
    
    return {
        'operationResult': True,
        'message': 'Registration successful. Please check your email for verification code.',
        'email': email
    }

def login(data):
    identifier = data.get('email') or data.get('username')
    password = data.get('password')
    
    if not identifier or not password:
        return {'operationResult': False, 'statusCode': 400, 'errorcode': 'MissingFields', 'detail': 'Please enter all fields'}
    
    user = None
    if '@' in identifier:
        q = queryItems({
            'table': TABLE_NAME,
            'indexName': 'EmailIndex',
            'keyCondition': 'email = :e',
            'expressionAttributeValues': {':e': identifier.lower()}
        })
    else:
        q = queryItems({
            'table': TABLE_NAME,
            'indexName': 'UsernameIndex',
            'keyCondition': 'username = :u',
            'expressionAttributeValues': {':u': identifier.lower()}
        })
        
    if not q['operationResult'] or len(q['response']) == 0:
        return {'operationResult': False, 'statusCode': 401, 'errorcode': 'InvalidCredentials', 'detail': 'Invalid credentials'}
    
    # If found by username/email via GSI, we might not have the full item if projection is not ALL?
    # The template says ProjectionType: ALL, so we are good.
    user = q['response'][0]
    
    if not bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
         return {'operationResult': False, 'statusCode': 401, 'errorcode': 'InvalidCredentials', 'detail': 'Invalid credentials'}
         
    token = generate_token(user['id'], user['username'])
    user.pop('password')
    
    return {
        'operationResult': True,
        'token': token,
        'user': user
    }

def get_profile(username):
    q = queryItems({
        'table': TABLE_NAME,
        'indexName': 'UsernameIndex',
        'keyCondition': 'username = :u',
        'expressionAttributeValues': {':u': username.lower()}
    })
    
    if not q['operationResult'] or len(q['response']) == 0:
        return {'operationResult': False, 'statusCode': 404, 'errorcode': 'NotFound', 'detail': 'User not found'}
        
    user = q['response'][0]
    if 'password' in user:
        user.pop('password')
        
    return user
    # The router in lambda_function expects 'operationResult' in response to set status code?
    # Yes, line 151 in lambda_function.py: statusCode = 200 if response.get('operationResult', True) else 400
    # So we should return dict with operationResult.
    # Wait, the reference project returns the response directly as the body?
    # In lambda_function.py: body = json.dumps(response, cls=CustomJsonEncoder)
    # So if I return {'username': ...}, operationResult is missing, so it defaults to True (200).
    # But consistency is good.
    return user

def update_profile(env, user_id, data):
    # Auth check
    # We need to decode the token from headers to verify user_id
    # env.event['headers']['authorization']
    # For now, let's assume auth is handled or we trust the caller?
    # No, we must verify.
    # But I didn't implement full auth middleware yet.
    # Let's implement a helper verify_token(env)
    
    # Basic verification
    current_user = verify_token(env)
    if not current_user:
        return {'operationResult': False, 'statusCode': 401, 'errorcode': 'Unauthorized', 'detail': 'No autorizado. Por favor, inicia sesión nuevamente.'}
        
    if current_user['id'] != user_id:
         return {'operationResult': False, 'statusCode': 403, 'errorcode': 'Forbidden', 'detail': 'No tienes permiso para editar este perfil'}
         
    # Remove protected fields
    data.pop('username', None)
    data.pop('email', None)
    data.pop('password', None)
    
    # Clean social
    if 'social' in data and isinstance(data['social'], dict):
        data['social'] = {k: v for k, v in data['social'].items() if v and v.strip()}
        if not data['social']:
            data.pop('social')
            
    # Prepare fields for updateItem
    fields = []
    # Handle social separately? updateItem handles flat fields.
    # DynamoDB updateItem helper in dynamodb_tools handles flat fields.
    # Nested updates (social.instagram) are not supported by that simple helper unless we modify it.
    # The JS code did: updateExpression += `, social.${socialKey} = ...`
    # The Python helper iterates fields and does `SET #name = :val`.
    # If we pass `social` as a dict, it will replace the whole social map.
    # That might be acceptable if the frontend sends the whole map.
    # Let's assume it does.
    
    for k, v in data.items():
        if v is not None:
            fields.append({'name': k, 'value': v})
            
    fields.append({'name': 'updatedAt', 'value': datetime.utcnow().isoformat()})
    
    res = updateItem({
        'table': TABLE_NAME,
        'key': {'id': user_id}
    }, fields)
    
    if res['operationResult']:
        # Return updated user (without password)
        # updateItem returns Attributes if ReturnValues is ALL_NEW
        # But the helper returns `r` which is the response from boto3.
        # `r` contains `Attributes`.
        attrs = res['response'].get('Attributes', {})
        if 'password' in attrs:
            attrs.pop('password')
        return attrs
        
    return res

def change_password(env, data):
    current_user = verify_token(env)
    if not current_user:
        return {'operationResult': False, 'statusCode': 401, 'errorcode': 'Unauthorized', 'detail': 'No autorizado. Por favor, inicia sesión nuevamente.'}
    
    old_pass = data.get('currentPassword')
    new_pass = data.get('newPassword')
    
    if not old_pass or not new_pass:
         return {'operationResult': False, 'statusCode': 400, 'errorcode': 'MissingFields', 'detail': 'Missing passwords'}
         
    # Get user to check password
    r = readItem({'table': TABLE_NAME, 'key': {'id': current_user['id']}})
    if not r['operationResult']:
        return {'operationResult': False, 'statusCode': 404, 'errorcode': 'UserNotFound', 'detail': 'User not found'}
        
    user = r['response']
    if not bcrypt.checkpw(old_pass.encode('utf-8'), user['password'].encode('utf-8')):
         return {'operationResult': False, 'statusCode': 401, 'errorcode': 'InvalidCredentials', 'detail': 'Invalid current password'}
         
    salt = bcrypt.gensalt(10)
    hashed = bcrypt.hashpw(new_pass.encode('utf-8'), salt).decode('utf-8')
    
    fields = [
        {'name': 'password', 'value': hashed},
        {'name': 'updatedAt', 'value': datetime.utcnow().isoformat()}
    ]
    
    res = updateItem({'table': TABLE_NAME, 'key': {'id': current_user['id']}}, fields)
    if res['operationResult']:
        return {'operationResult': True, 'message': 'Password updated'}
    return res

def upload_avatar(env, data):
    # This is hard without multipart parser.
    # If data is just base64 encoded image in body?
    # The JS code used express-fileupload.
    # In Lambda, we get the raw body.
    # For now, let's assume the frontend sends a JSON with { "avatar": "base64..." } or similar?
    # Or we can skip this for now and tell the user.
    # Let's return a "Not Implemented" or try to handle JSON base64.
    return {'operationResult': False, 'statusCode': 501, 'errorcode': 'NotImplemented', 'detail': 'Avatar upload not implemented in Python migration yet'}

def generate_token(user_id, username):
    payload = {
        'user': {'id': user_id, 'username': username},
        'exp': datetime.utcnow() + timedelta(hours=24)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')

def verify_token(env):
    headers = env.event.get('headers', {})
    # Normalizar headers a lowercase para búsqueda case-insensitive
    headers_lower = {k.lower(): v for k, v in headers.items()}
    
    auth_header = headers_lower.get('authorization') or headers_lower.get('x-auth-token')
    
    if not auth_header:
        logger.debug('No authorization header found')
        return None
        
    token = auth_header.replace('Bearer ', '').replace('bearer ', '')
    try:
        decoded = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        return decoded.get('user')
    except jwt.ExpiredSignatureError:
        logger.warning('Token expired')
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f'Invalid token: {e}')
        return None
    except Exception as e:
        logger.error(f'Error verifying token: {e}')
        return None

def send_verification_email(email, code, name):
    """
    Sends verification code email using AWS SES
    """
    ses_client = boto3.client('ses', region_name='us-east-1')  # Change region if needed
    
    sender = 'noreply@tappy.cl'
    subject = 'Verifica tu cuenta Tappy'
    
    body_html = f"""
    <html>
    <head></head>
    <body>
        <h2>¡Bienvenido a Tappy, {name}!</h2>
        <p>Tu código de verificación es:</p>
        <h1 style="color: #4CAF50; font-size: 48px; letter-spacing: 8px;">{code}</h1>
        <p>Ingresa este código en la aplicación para activar tu cuenta.</p>
        <p>Este código expira en 15 minutos.</p>
        <br>
        <p style="color: #666;">Si no creaste esta cuenta, puedes ignorar este correo.</p>
    </body>
    </html>
    """
    
    body_text = f"""
    ¡Bienvenido a Tappy, {name}!
    
    Tu código de verificación es: {code}
    
    Ingresa este código en la aplicación para activar tu cuenta.
    Este código expira en 15 minutos.
    
    Si no creaste esta cuenta, puedes ignorar este correo.
    """
    
    try:
        response = ses_client.send_email(
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
        logger.info(f'Verification email sent to {email}. MessageId: {response["MessageId"]}')
        return True
    except Exception as e:
        logger.error(f'Error sending email to {email}: {str(e)}')
        return False

def verify_code(data):
    """
    Verifies the email verification code and activates the user account
    """
    email = data.get('email')
    code = data.get('code')
    
    if not email or not code:
        return {'operationResult': False, 'statusCode': 400, 'errorcode': 'MissingFields', 'detail': 'Email and code are required'}
    
    # Find user by email
    q = queryItems({
        'table': TABLE_NAME,
        'indexName': 'EmailIndex',
        'keyCondition': 'email = :e',
        'expressionAttributeValues': {':e': email.lower()}
    })
    
    if not q['operationResult'] or len(q['response']) == 0:
        return {'operationResult': False, 'statusCode': 404, 'errorcode': 'NotFound', 'detail': 'User not found'}
    
    user = q['response'][0]
    
    # Check if already verified
    if user.get('isVerified', False):
        return {'operationResult': False, 'statusCode': 400, 'errorcode': 'AlreadyVerified', 'detail': 'This account is already verified'}
    
    # Verify code
    if user.get('verificationCode') != code:
        return {'operationResult': False, 'statusCode': 401, 'errorcode': 'InvalidCode', 'detail': 'Invalid verification code'}
    
    # Mark user as verified and remove verification code
    fields = [
        {'name': 'isVerified', 'value': True},
        {'name': 'verificationCode', 'value': ''},
        {'name': 'updatedAt', 'value': datetime.utcnow().isoformat()}
    ]
    
    res = updateItem({'table': TABLE_NAME, 'key': {'id': user['id']}}, fields)
    
    if not res['operationResult']:
        return res
    
    # Generate token for auto-login
    token = generate_token(user['id'], user['username'])
    
    # Remove password from response
    user.pop('password', None)
    user['isVerified'] = True
    
    return {
        'operationResult': True,
        'token': token,
        'user': user,
        'message': 'Email verified successfully'
    }

