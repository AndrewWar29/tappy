import boto3
import json
import logging
import uuid
import config
from decimal import Decimal
from boto3.dynamodb.conditions import Key, Attr
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)
logger.setLevel(config.env.loglevel)

def insertItem(data: dict):
    """Inserta un item en DynamoDB"""
    result = False
    tablename = data['table']
    item = data['item']
    
    # Generar GUID si no existe
    if 'guid' in item:
        if item['guid'] is None or item['guid'] == '':
            item['guid'] = str(uuid.uuid4())
    
    item = json.loads(json.dumps(item), parse_float=Decimal)
    r = None
    errorcode = ''
    detail = ''
    
    logger.debug(f"Insertando item: {item}")
    
    try:
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table(tablename)
        
        # Condición para evitar duplicados
        conditionExpression = ''
        if 'conditionExpression' in data:
             conditionExpression = data['conditionExpression']
        else:
            for k in table.key_schema:
                conditionExpression += f"attribute_not_exists({k['AttributeName']})" if len(conditionExpression) == 0 else f" AND attribute_not_exists({k['AttributeName']})"
        
        logger.debug(f"Condition: {conditionExpression}")
        r = table.put_item(Item=item, ConditionExpression=conditionExpression)
        result = True
    except ClientError as e:
        logging.critical(e, exc_info=True)
        errorcode = e.response['Error']['Code']
        detail = f"Error HTTPStatusCode {e.response['ResponseMetadata']['HTTPStatusCode']} ({e.response['Error']['Code']}): {e.response['Error']['Message']}"
        result = False
    
    return {'operationResult': result, 'response': r, 'errorcode': errorcode, 'detail': detail}

def readItem(data: dict):
    """Lee un item de DynamoDB"""
    result = False
    tablename = data['table']
    key = data['key']
    r = None
    errorcode = ''
    detail = ''
    
    try:
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table(tablename)
        tr = table.get_item(Key=key)
        
        if 'Item' not in tr:
            result = False
            errorcode = 'ItemNotExists'
            detail = 'Item Not Existing in DB'
        else:
            r = tr['Item']
            result = True
    except Exception as e:
        logging.critical(e, exc_info=True)
        errorcode = getattr(e, 'response', {}).get('Error', {}).get('Code', 'UnknownError')
        detail = str(e)
        result = False
    
    return {'operationResult': result, 'response': r, 'errorcode': errorcode, 'detail': detail}

def updateItem(key: dict, fields: dict):
    """Actualiza un item en DynamoDB"""
    result = False
    tablename = key['table']
    key_dict = key['key']
    r = None
    errorcode = ''
    detail = ''
    
    try:
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table(tablename)
        
        updateExpression = 'set '
        namesExpression = {}
        valuesExpression = {}
        counter = 0
        
        for field in fields:
            namestring = field['name']
            valstring = f":{counter}"
            updateExpression += f'#{namestring} = {valstring}, '
            
            field['value'] = json.loads(json.dumps(field['value']), parse_float=Decimal)
            valuesExpression[valstring] = field['value']
            namesExpression[f'#{namestring}'] = namestring
            counter += 1
        
        updateExpression = updateExpression[:-2]  # Quitar última coma
        
        logger.debug(f"UpdateExpression: {updateExpression}")
        
        r = table.update_item(
            Key=key_dict,
            UpdateExpression=updateExpression,
            ExpressionAttributeNames=namesExpression,
            ExpressionAttributeValues=valuesExpression,
            ReturnValues="ALL_NEW"
        )
        result = True
    except Exception as e:
        logging.critical(e, exc_info=True)
        errorcode = getattr(e, 'response', {}).get('Error', {}).get('Code', 'UnknownError')
        detail = str(e)
        result = False
    
    return {'operationResult': result, 'response': r, 'errorcode': errorcode, 'detail': detail}

def deleteItem(data: dict):
    """Elimina un item de DynamoDB"""
    result = False
    tablename = data['table']
    key = data['key']
    r = None
    errorcode = ''
    detail = ''
    
    try:
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table(tablename)
        r = table.delete_item(Key=key)
        result = True
    except Exception as e:
        logging.critical(e, exc_info=True)
        errorcode = getattr(e, 'response', {}).get('Error', {}).get('Code', 'UnknownError')
        detail = str(e)
        result = False
    
    return {'operationResult': result, 'response': r, 'errorcode': errorcode, 'detail': detail}

def queryItems(data: dict):
    """Query items en DynamoDB"""
    result = False
    tablename = data['table']
    r = []
    errorcode = ''
    detail = ''
    
    try:
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table(tablename)
        
        kwargs = {}
        
        if 'keyCondition' in data:
            kwargs['KeyConditionExpression'] = data['keyCondition']
        
        if 'filterExpression' in data:
            kwargs['FilterExpression'] = data['filterExpression']
        
        if 'indexName' in data:
            kwargs['IndexName'] = data['indexName']
        
        if 'limit' in data:
            kwargs['Limit'] = data['limit']
        
        if 'expressionAttributeValues' in data:
            kwargs['ExpressionAttributeValues'] = data['expressionAttributeValues']

        if 'scanIndexForward' in data:
            kwargs['ScanIndexForward'] = data['scanIndexForward']
        
        response = table.query(**kwargs)
        r = response['Items'] if 'Items' in response else []
        result = True
    except Exception as e:
        logging.critical(e, exc_info=True)
        errorcode = getattr(e, 'response', {}).get('Error', {}).get('Code', 'UnknownError')
        detail = str(e)
        result = False
    
    return {'operationResult': result, 'response': r, 'errorcode': errorcode, 'detail': detail}

def scanItems(data: dict):
    """Scan items en DynamoDB"""
    result = False
    tablename = data['table']
    r = []
    errorcode = ''
    detail = ''
    
    try:
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table(tablename)
        
        kwargs = {}
        if 'filterExpression' in data:
            kwargs['FilterExpression'] = data['filterExpression']
        if 'limit' in data:
            kwargs['Limit'] = data['limit']
        
        response = table.scan(**kwargs)
        r = response['Items'] if 'Items' in response else []
        result = True
    except Exception as e:
        logging.critical(e, exc_info=True)
        errorcode = getattr(e, 'response', {}).get('Error', {}).get('Code', 'UnknownError')
        detail = str(e)
        result = False
    
    return {'operationResult': result, 'response': r, 'errorcode': errorcode, 'detail': detail}
