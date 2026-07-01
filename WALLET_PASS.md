# 📱 Wallet Pass - Documentación Completa

## Resumen

Tappy implementa la capacidad de **descargar y agregar perfiles de usuario a Apple Wallet (iOS) y Google Wallet (Android)** sin necesidad de app nativa. Los usuarios pueden descargar un `.pkpass` con su información y agregarlo directamente a su wallet.

## 🎯 Propósito

Cuando un usuario de Tappy quiere compartir su perfil:
1. Va a su perfil en `https://profile.tappy.cl/user/{username}`
2. Inicia sesión
3. Hace clic en **"Descargar Contacto"**
4. Se descarga un archivo `.pkpass` (Apple Wallet) o se agrega a Google Wallet
5. La otra persona abre la tarjeta y ve el perfil completo

## 🏗️ Arquitectura

### Stack Tecnológico

| Componente | Tecnología | Descripción |
|---|---|---|
| **Frontend** | React | Botón "Descargar Contacto" en UserProfile.js |
| **Backend** | Python (AWS Lambda) | Endpoint GET `/api/users/{username}/wallet-pass` |
| **API externa** | WalletWallet.dev | Genera archivos `.pkpass` firmados |
| **Storage** | AWS S3 | Cachea los pases generados (opcional) |
| **CI/CD** | GitHub Actions | Automatiza deployment con secrets |

### Flujo de Datos

```
Usuario en perfil
    ↓
Click "Descargar Contacto"
    ↓
Frontend: GET /api/users/{username}/wallet-pass
    ↓
Backend Lambda:
  1. Busca usuario en DynamoDB (tabla Tappy_Users_Prod)
  2. Obtiene API key de WalletWallet desde env vars
  3. Prepara JSON con info del usuario
  4. Llama POST a https://api.walletwallet.dev/api/pkpass
    ↓
WalletWallet API:
  1. Valida el JSON del pass
  2. Genera QR con URL del perfil
  3. Crea archivo .pkpass firmado
  4. Retorna binary
    ↓
Backend Lambda:
  1. Recibe .pkpass binary
  2. Cachea en S3 (opcional)
  3. Retorna con headers: Content-Type: application/vnd.apple.pkpass
    ↓
Frontend:
  1. Recibe binary base64-encoded
  2. Crea Blob
  3. Dispara descarga: {username}.pkpass
    ↓
Usuario:
  - iOS: Abre archivo → "Agregar a Wallet"
  - Android: Se agrega automáticamente a Google Wallet
```

## 🔧 Configuración

### Dependencias Requeridas

**Backend (`backend/requirements.txt`):**
```
boto3          # AWS SDK
requests       # HTTP para WalletWallet API
bcrypt         # Password hashing
pyjwt          # JWT auth
transbank-sdk  # Webpay (pagos)
anthropic      # Claude API (chat)
```

### Variables de Entorno (Lambda)

| Variable | Valor | Obligatorio | Fuente |
|---|---|---|---|
| `TABLE_NAME` | `Tappy_Users_Prod` | ✅ | SAM template (condicional por Stage) |
| `WALLET_WALLET_API_KEY` | `ww_live_c352faf7e8ae7b9b745820c27a0ea2cb` | ✅ | GitHub Secrets |
| `WALLET_WALLET_API_KEY_PARAM` | `/tappy/wallet-wallet/api-key` | ❌ | SAM template (fallback) |
| `JWT_SECRET` | [value] | ✅ | GitHub Secrets |
| `ORDERS_TABLE` | `Tappy_Orders_Prod` | ✅ | SAM template |
| `PAYMENTS_TABLE` | `Tappy_Payments_Prod` | ✅ | SAM template |

### Setup en GitHub

**Secret requerido en**: https://github.com/AndrewWar29/tappy/settings/secrets/actions

```
Name: WALLET_WALLET_API_KEY
Value: ww_live_c352faf7e8ae7b9b745820c27a0ea2cb
```

## 📝 Endpoints

### GET `/api/users/{username}/wallet-pass`

**Descripción**: Genera y descarga un archivo `.pkpass` con el perfil del usuario.

**Request**:
```bash
GET https://profile.tappy.cl/api/users/admin/wallet-pass
Authorization: Bearer {token}
```

**Response (200 OK)**:
```
Content-Type: application/vnd.apple.pkpass
Content-Disposition: attachment; filename="admin.pkpass"
Body: [binary .pkpass file, base64-encoded in Lambda response]
```

**Response (404 Not Found)**:
```json
{
  "operationResult": false,
  "errorcode": "NotFound",
  "detail": "User not found"
}
```

**Response (500 Error)**:
```json
{
  "operationResult": false,
  "statusCode": 500,
  "errorcode": "WalletGenerationError",
  "detail": "Failed to generate wallet pass"
}
```

## 📦 Contenido del Pass

El `.pkpass` incluye:

| Campo | Ejemplo | Obligatorio |
|---|---|---|
| **Nombre** (headerFields) | "Andres Guerra" | ✅ |
| **URL del Perfil** (primaryFields) | "https://profile.tappy.cl/user/admin" | ✅ |
| **Empresa** (secondaryFields) | "Tappy Inc" | ❌ (si existe) |
| **Cargo** (secondaryFields) | "CEO" | ❌ (si existe) |
| **Teléfono** (secondaryFields) | "+56 9 XXXX XXXX" | ❌ (si existe) |
| **Email** (secondaryFields) | "admin@gmail.com" | ❌ (si existe) |
| **QR Code** (barcode) | Escanea a la URL del perfil | ✅ |
| **Logo/Avatar** | Foto del usuario | ❌ (si existe) |
| **Colores** | Azul Tappy (#4ECDC4) | ✅ |

## 🔐 Seguridad

### Permisos AWS

El Lambda tiene permisos para:
- ✅ Leer de DynamoDB (`Tappy_Users_Prod`)
- ✅ Escribir en S3 (`tappy-profile-pictures/wallet-passes/`)
- ✅ Llamar HTTP a APIs externas (requests)
- ❌ No tiene acceso a otros buckets o tablas

### Validaciones

1. **Usuario debe existir** en `Tappy_Users_Prod`
2. **API key debe estar configurada** (falla gracefully si no)
3. **WalletWallet firma criptográficamente** el `.pkpass` (no manipulable)
4. **CORS habilitado** para llamadas desde navegador

## 🐛 Troubleshooting

### Error: "User not found"

**Causa**: El usuario no existe en la tabla de producción (`Tappy_Users_Prod`).

**Solución**:
```bash
# Verificar que el usuario existe:
aws dynamodb query \
  --table-name Tappy_Users_Prod \
  --index-name UsernameIndex \
  --key-condition-expression "username = :u" \
  --expression-attribute-values '{":u":{"S":"admin"}}' \
  --profile tappy \
  --region us-east-1
```

### Error: "WalletGenerationError"

**Causa**: Fallo en la llamada a WalletWallet API.

**Soluciones**:
1. Verificar que `WALLET_WALLET_API_KEY` esté en GitHub Secrets
2. Revisar logs: `aws logs tail /aws/lambda/TappyApiFunction-Prod --follow --profile tappy --region us-east-1`
3. Verificar que el JSON del pass sea válido (revisar formato en logs)

### Error: "barcodeValue is required"

**Causa**: WalletWallet API requiere `barcodeValue` y `barcodeFormat`.

**Solución**: Backend debe enviar:
```python
'barcodeValue': profile_url,
'barcodeFormat': 'QR',
```

### No aparece el botón "Descargar Contacto"

**Causa**: Usuario no está logueado en su propio perfil.

**Solución**: El botón solo aparece cuando:
- ✅ Usuario está logueado
- ✅ Está viendo su PROPIO perfil
- ✅ Navegador no lo bloquea (AdBlock, etc.)

## 📊 Monitoreo

### CloudWatch Logs

```bash
# Tail en tiempo real
aws logs tail /aws/lambda/TappyApiFunction-Prod --follow --profile tappy --region us-east-1

# Buscar errores de WalletWallet
aws logs tail /aws/lambda/TappyApiFunction-Prod --follow --profile tappy --region us-east-1 | grep -i wallet
```

### Métricas a monitorear

- **Invocaciones del endpoint**: CloudWatch → Lambda → Metrics
- **Tasa de éxito**: Descargas exitosas vs. errores
- **Latencia**: Típicamente 1-3 segundos

## 🚀 Deployment

### Flujo Automático (Recomendado)

1. Hacer cambios en `backend/tables/users.py` o `backend/api.yaml`
2. Commit y push a `main`
3. GitHub Actions detecta cambios en `backend/`
4. Ejecuta: `sam build` → `sam deploy`
5. Backend actualizado en 2-5 minutos

### Deployment Manual

```bash
cd backend

# Build
sam build -t api.yaml --use-container

# Deploy
sam deploy \
  --template-file .aws-sam/build/template.yaml \
  --stack-name tappy-backend \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND \
  --parameter-overrides \
    JwtSecret=$JWT_SECRET \
    WalletWalletApiKey=$WALLET_WALLET_API_KEY \
    Stage=Prod \
    UserTableName=Tappy_Users_Prod \
    OrdersTableName=Tappy_Orders_Prod \
    PaymentsTableName=Tappy_Payments_Prod \
  --profile tappy \
  --region us-east-1
```

## 📚 Archivos Clave

| Archivo | Descripción |
|---|---|
| `backend/tables/users.py` | Función `generate_wallet_pass()` (línea ~773) |
| `backend/api.yaml` | SAM template con configuración Lambda |
| `backend/lambda_function.py` | Router principal que detecta `wallet-pass` en path |
| `frontend/src/components/WalletButton.js` | Componente React del botón |
| `frontend/src/styles/WalletButton.css` | Estilos del botón |
| `frontend/src/pages/UserProfile.js` | Página del perfil que renderiza WalletButton |
| `.github/workflows/deploy.yml` | CI/CD que inyecta secrets |

## 🔗 Enlaces Útiles

- **WalletWallet API Docs**: https://www.walletwallet.dev/
- **Apple Wallet Specs**: https://developer.apple.com/library/archive/documentation/UserExperience/Conceptual/PassKit_PG/
- **Google Wallet API**: https://developers.google.com/wallet
- **AWS Lambda CloudWatch**: https://console.aws.amazon.com/cloudwatch/

## 📅 Historial de Cambios

| Fecha | Commit | Cambio |
|---|---|---|
| 2026-05-10 | `d92a39f` | Feature: agregar descarga de pase para Apple/Google Wallet |
| 2026-05-10 | `16bf5a1` | Integrar WalletWallet API key desde GitHub secrets |
| 2026-06-29 | `3ab87f2` | Fix: corregir extracción de username en endpoint |
| 2026-06-29 | `a16d750` | Fix: remover campos server-owned |
| 2026-06-29 | `465553e` | Fix: agregar barcodeValue y barcodeFormat |

## ❓ Preguntas Frecuentes

**¿Funciona sin Apple Developer Account?**
Sí. WalletWallet firma los pases con su propio certificado. Los usuarios pueden descargar y agregar sin problemas.

**¿Se puede personalizar el diseño del pass?**
Sí, en la función `generate_wallet_pass()` puedes cambiar colores, campos, layout, etc.

**¿Dónde se almacenan los pases?**
Opcionalmente en S3 (`tappy-profile-pictures/wallet-passes/`), pero se generan on-demand cada vez que se descargan.

**¿Hay límite de descargas?**
WalletWallet ofrece 1,000 passes/mes gratis. Después, tarifa por uso (~$0.0002 por pass).

**¿Qué datos se envían a WalletWallet?**
Solo la info del perfil (nombre, email, teléfono, empresa, etc.) en JSON. Luego se descarta.

---

**Última actualización**: 1 de Julio 2026  
**Mantenedor**: Andrew Guerra  
**API Version**: WalletWallet v1.0
