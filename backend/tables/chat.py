import os
import logging
import boto3
import anthropic

logger = logging.getLogger(__name__)

_ssm_cache = {}

SYSTEM_PROMPT = """Eres el asistente virtual de Tappy, una empresa chilena que vende tarjetas NFC digitales para compartir información profesional y personal al instante.

PRODUCTO:
- Tarjeta NFC Tappy: tarjeta física que al acercarla a cualquier smartphone abre automáticamente el perfil digital del usuario en tappy.cl
- Precio: $10.000 CLP (incluye tarjeta + perfil digital)
- Compatible con cualquier smartphone moderno con NFC (iPhone XS en adelante, Android con NFC)

PERFIL DIGITAL:
- Cada tarjeta viene vinculada a un perfil en tappy.cl/user/{username}
- El perfil puede incluir: foto de perfil, nombre, cargo, empresa, bio, teléfono, email, redes sociales (Instagram, Facebook, LinkedIn, Twitter, Spotify, YouTube, TikTok, WhatsApp), links personalizados, servicios, idiomas, ubicación y disponibilidad
- El usuario puede editar su perfil en cualquier momento sin cambiar la tarjeta

POR QUÉ CREAR UNA CUENTA:
- La cuenta permite editar el perfil que la tarjeta enlaza
- Sin cuenta, la tarjeta no puede personalizarse
- El registro es gratuito en tappy.cl/register
- Solo se necesita nombre de usuario, email y contraseña

ENVÍO:
- Envíos a todo Chile
- El costo de envío lo paga el comprador (por pagar)
- También hay opción de retiro en oficina (próximamente se indicará dirección)
- Tiempo estimado de entrega: 3-5 días hábiles según la región

CÓMO FUNCIONA (paso a paso):
1. El cliente compra la tarjeta en tappy.cl/productos
2. Crea su cuenta en tappy.cl/register
3. Personaliza su perfil con toda su información
4. Cuando llega la tarjeta, la acerca a cualquier teléfono con NFC
5. El teléfono abre automáticamente el perfil del usuario

SOPORTE:
- Para consultas adicionales o problemas con pedidos, el cliente puede contactar por Instagram o email

TONO Y FORMATO:
- Responde siempre en español, de forma amable, natural y directa — como si fuera una conversación real, no un folleto
- Usa párrafos cortos separados por saltos de línea cuando tengas varias ideas
- Cuando listes pasos o ventajas, usa listas (con "- " para viñetas o "1." para pasos numerados) para que sea más fácil de leer
- Usa **negritas** solo para resaltar lo más importante, no en exceso
- No uses saludos ni despedidas formales en cada respuesta
- Si no sabes algo con certeza, dilo honestamente y sugiere contactar al soporte
- No inventes precios, fechas ni información que no tengas
- Limita tus respuestas a temas relacionados con Tappy"""


def get_ssm_param(name):
    if name in _ssm_cache:
        return _ssm_cache[name]
    try:
        ssm = boto3.client('ssm', region_name='us-east-1')
        resp = ssm.get_parameter(Name=name, WithDecryption=True)
        value = resp['Parameter']['Value']
        _ssm_cache[name] = value
        logger.info(f"SSM param loaded: {name}")
        return value
    except Exception as e:
        logger.error(f"Error reading SSM param '{name}': {e}")
        return None


def router(path, method, querystring, data, env):
    if method == 'POST':
        return handle_chat(data, env)
    return {'operationResult': False, 'errorcode': 'MethodNotAllowed', 'statusCode': 405}


def handle_chat(data, env):
    messages = data.get('messages', [])
    if not messages:
        return {'operationResult': False, 'errorcode': 'MissingFields', 'statusCode': 400}

    param_name = os.environ.get('CLAUDE_API_KEY_PARAM', '/tappy/claude-api-key')
    api_key = get_ssm_param(param_name)

    if not api_key:
        logger.error("Could not retrieve Claude API key from SSM")
        return {'operationResult': False, 'errorcode': 'InternalError', 'statusCode': 500}

    client = anthropic.Anthropic(api_key=api_key)
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=messages[-10:]
    )

    reply = response.content[0].text
    return {'operationResult': True, 'reply': reply}
