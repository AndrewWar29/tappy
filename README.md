# Tappy - Portal de Usuarios

Aplicación completa de gestión de perfiles de usuarios para Tappy.

## 🏗️ Arquitectura

- **Frontend**: React (SPA) → CloudFront + S3 → `profile.tappy.cl`
- **Backend**: Express → AWS Lambda + API Gateway + DynamoDB
- **E-commerce**: Shopify → `tappy.cl`

## 🚀 Quick Start

### Frontend (Desarrollo)
```bash
cd client
npm install
npm start  # Usa API remota automáticamente
```

### Backend (Desarrollo Local - Opcional)
```bash
cd server
npm install
npm start  # Puerto 3001
```

## 📦 Deployment

### Automático (Recomendado)
Push a `main` despliega automáticamente backend y/o frontend según los archivos modificados:

```bash
git add .
git commit -m "feat: nueva funcionalidad"
git push origin main
```

El workflow unificado (`deploy.yml`) detecta cambios en:
- `server/**` → Despliega backend (Lambda + API Gateway + DynamoDB)
- `client/**` → Despliega frontend (build + S3 + CloudFront invalidation)

### Manual
Ejecuta el workflow desde GitHub Actions:
1. Ve a **Actions** → **Deploy Tappy**
2. Click **Run workflow**
3. Selecciona qué componentes desplegar

## 🔧 Configuración AWS

### Servicios en Uso
- **Lambda**: `TappyApiFunction` (Node.js 18)
- **API Gateway**: REST API endpoint
- **DynamoDB**: `Tappy_Users` table
- **S3**: `profile-tappy-cl-frontend` bucket
- **CloudFront**: Distribution `E1XEL279LISMBM`
- **Route 53**: DNS para `profile.tappy.cl`
- **ACM**: Certificado SSL

### GitHub Secrets Requeridos
- `AWS_DEPLOY_ROLE_ARN`: ARN del Role IAM OIDC
- `JWT_SECRET`: Secreto JWT del backend

### Stack CloudFormation
- **Backend**: `tappy-backend` (SAM template en `server/template.yaml`)
- **Frontend**: Infraestructura manual (S3 + CloudFront configurados manualmente)

## 🌐 URLs

- **Producción Frontend**: https://profile.tappy.cl
- **Producción API**: https://u1yadifvmj.execute-api.us-east-1.amazonaws.com/Prod
- **E-commerce**: https://tappy.cl (Shopify)
- **Desarrollo**: http://localhost:3000

## 📁 Estructura del Proyecto

```
tappy/
├── .github/
│   └── workflows/
│       └── deploy.yml          # ⭐ Workflow unificado
├── client/                      # Frontend React
│   ├── src/
│   │   ├── apiConfig.js        # Configuración API centralizada
│   │   ├── AuthContext.js      # Context de autenticación
│   │   └── ...
│   ├── build/                  # Build de producción
│   └── package.json
├── server/                      # Backend Express → Lambda
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── models/
│   ├── lambda.js               # Handler Lambda
│   ├── server.js               # Express app
│   ├── template.yaml           # SAM template
│   └── package.json
└── CLOUDFRONT_FIX.md           # Troubleshooting guide
```

## 🔍 Debugging

### Backend
- CloudWatch Logs: `/aws/lambda/TappyApiFunction`
- Test API: `curl https://u1yadifvmj.execute-api.us-east-1.amazonaws.com/Prod/api/health`

### Frontend
- CloudFront directo: https://d35z4vve4benyl.cloudfront.net
- Verificar cache: `curl -I https://profile.tappy.cl`
- Console del navegador para errores de API

### Deployment
- GitHub Actions logs: https://github.com/AndrewWar29/tappy/actions
- CloudFormation stack: `tappy-backend`
- Stack events: AWS Console → CloudFormation

## 📝 Notas

- El frontend usa infraestructura manual (no CloudFormation) porque el workflow `setup-cloudfront.yml` falló por permisos OIDC
- CloudFront invalidation puede fallar por permisos IAM limitados - no crítico, cache se actualiza en 24h
- DynamoDB table `Tappy_Users` se crea automáticamente si no existe

---

**Última actualización**: Noviembre 2025  
**Autor**: Andrew Guerra  
**Repo**: https://github.com/AndrewWar29/tappy
