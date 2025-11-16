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

### Frontend → CloudFront
Ver guía completa: [`client/DEPLOY-CHECKLIST.md`](client/DEPLOY-CHECKLIST.md)

**Resumen:**
1. Solicitar certificado SSL en ACM (us-east-1)
2. Crear infraestructura: `cd client && ./create-cloudfront-stack.sh <cert-arn>`
3. Configurar DNS (Route 53 o proveedor externo)
4. Deploy: `npm run build && ./deploy-frontend.sh`

**Deploy automático**: Push a `main` con cambios en `client/` → GitHub Actions despliega a CloudFront.

### Backend → Lambda
Ver documentación: [`server/README.md`](server/README.md)

**Deploy automático**: Push a `main` con cambios en `server/` → GitHub Actions despliega a Lambda.

## CI/CD (Backend Serverless con GitHub Actions + SAM)

Workflow: `.github/workflows/deploy-backend.yml` despliega automáticamente la carpeta `server/` a AWS cuando haces push a `main`.

Requisitos previos:
1. Crear un Role IAM con confianza OIDC para GitHub (aws-actions). Ejemplo de trust policy (reemplaza ORG/REPO):
```json
{
	"Version": "2012-10-17",
	"Statement": [
		{
			"Effect": "Allow",
			"Principal": {
				"Federated": "arn:aws:iam::TU_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
			},
			"Action": "sts:AssumeRoleWithWebIdentity",
			"Condition": {
				"StringEquals": {
					"token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
				},
				"StringLike": {
					"token.actions.githubusercontent.com:sub": "repo:ORG/REPO:*"
				}
			}
		}
	]
}
```
2. Permisos mínimos del Role (ejemplo): CloudFormation deploy (cloudformation:* para stack scope), IAM PassRole limitado si aplicara, Lambda (Update/Create), APIGateway (PUT/POST/DELETE), Logs (CreateLogGroup/Stream, PutLogEvents), S3 (para bucket de artefactos), DynamoDB (CRUD sobre la tabla `Tappy_Users`). Para simplificar puedes iniciar con `AdministratorAccess` y luego restringir.
3. Añade a GitHub Secrets:
	 - `AWS_DEPLOY_ROLE_ARN`: ARN del Role IAM OIDC.
	 - `JWT_SECRET`: secreto JWT del backend.

Flujo:
1. Haces push a `main` con cambios en `server/`.
2. Action instala deps, compila con `sam build` y despliega con `sam deploy` pasando `JwtSecret`.
3. Output final muestra la URL de la API (Output: ApiUrl). Puedes consultarla también en CloudFormation Console.

Para forzar un despliegue manual: ve a Actions > Deploy Backend (SAM) > Run workflow.

Frontend: puedes apuntar tus peticiones al endpoint desplegado reemplazando el base URL en tu cliente.

Seguridad:
- Nunca guardes el secreto en el repo; solo en Secrets.
- Rota `JWT_SECRET` si sospechas exposición (desplegar nuevamente invalidará tokens emitidos previamente si cambias su valor).

### CORS

La configuración CORS para API Gateway ahora es explícita en `server/template.yaml` dentro de `Globals.Api.Cors` (AllowOrigin, AllowHeaders, AllowMethods). Si modificas estos valores debes volver a desplegar (`sam build && sam deploy`) para que API Gateway regenere las respuestas OPTIONS con los encabezados correctos.
