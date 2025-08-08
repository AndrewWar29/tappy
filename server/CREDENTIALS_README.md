# Tappy - Manejo de Credenciales

## Configuración de Credenciales AWS

Para manejar las credenciales de AWS de manera segura:

1. **No incluyas nunca credenciales reales en el repositorio**
2. Usa los archivos de ejemplo como plantillas:
   - Copia `.env.dynamo.example` a `.env.dynamo` y añade tus credenciales reales
   - Copia `start-with-credentials.sh.example` a `start-with-credentials.sh` y añade tus credenciales reales

## Ejecutar la Aplicación

### Con Perfil AWS Configurado

```bash
npm run start:profile
```

### Con Variables de Entorno

```bash
npm run start:env
```

### Con Credenciales Directas

```bash
npm run start:creds
```

## Configuración de DynamoDB

Para crear la tabla en DynamoDB:

```bash
npm run setup
```

O con un perfil específico:

```bash
./setup-dynamo-with-creds.sh
```

## Archivo .gitignore

El archivo `.gitignore` está configurado para excluir archivos que contienen credenciales:
- `.env` y variantes
- `*credentials*.sh` 
- `aws-credentials*.txt`

Si necesitas añadir más archivos con información sensible, asegúrate de añadirlos al `.gitignore`.
