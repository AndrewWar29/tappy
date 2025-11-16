# Arquitectura Tappy - Diagrama Detallado

## 🏗️ Vista Completa del Sistema

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              INTERNET / USERS                               │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
          ┌─────────▼──────────┐    ┌────────▼─────────┐
          │   tappy.cl         │    │ profile.tappy.cl │
          │   (Shopify)        │    │  (React SPA)     │
          │                    │    └────────┬─────────┘
          │  E-commerce Store  │             │
          └────────────────────┘             │
                                             │
                                   ┌─────────▼──────────┐
                                   │   Route 53 (DNS)   │
                                   │  A/CNAME Record    │
                                   └─────────┬──────────┘
                                             │
                                   ┌─────────▼──────────────────┐
                                   │   CloudFront Distribution  │
                                   │   - SSL/TLS (ACM Cert)    │
                                   │   - Global CDN            │
                                   │   - Gzip/Brotli          │
                                   │   - Cache policies       │
                                   └─────────┬────────────────┘
                                             │
                                   ┌─────────▼──────────┐
                                   │   S3 Bucket        │
                                   │   (Static Hosting) │
                                   │   - index.html     │
                                   │   - JS/CSS/assets  │
                                   │   - SPA routing    │
                                   └────────────────────┘
                                             │
                                             │ API Calls (fetch)
                                             │
                                   ┌─────────▼──────────────────┐
                                   │   API Gateway (REST API)   │
                                   │   - CORS enabled           │
                                   │   - Custom domain (opt)    │
                                   │   - Throttling            │
                                   │   - API Keys (opt)        │
                                   └─────────┬────────────────┘
                                             │
                                   ┌─────────▼──────────────────┐
                                   │   Lambda Function          │
                                   │   (Node.js + Express)      │
                                   │                            │
                                   │   Routes:                  │
                                   │   - /api/users/register   │
                                   │   - /api/users/login      │
                                   │   - /api/users/:username  │
                                   │   - /api/users/:id (PUT)  │
                                   │   - /api/users/upload     │
                                   │   - /api/users/password   │
                                   │                            │
                                   │   Middleware:              │
                                   │   - JWT Auth              │
                                   │   - CORS                  │
                                   │   - Body Parser           │
                                   └─────────┬────────────────┘
                                             │
                                   ┌─────────▼──────────────────┐
                                   │   DynamoDB Table           │
                                   │   Name: Tappy_Users        │
                                   │                            │
                                   │   Schema:                  │
                                   │   - id (PK)               │
                                   │   - username (GSI)        │
                                   │   - email (GSI)           │
                                   │   - password (hashed)     │
                                   │   - profile data          │
                                   │   - timestamps            │
                                   └────────────────────────────┘
```

## 🔄 Flujo de Requests

### 1. Carga Inicial de la Aplicación
```
Usuario → Route 53 → CloudFront → S3 → CloudFront (cache) → Usuario
                                    ↓
                              index.html + JS/CSS
```

### 2. Login de Usuario
```
1. Usuario → profile.tappy.cl/cuenta → Formulario Login
   ↓
2. Frontend → POST https://api-gateway-url/Prod/api/users/login
   Headers: { Content-Type: application/json }
   Body: { email, password }
   ↓
3. API Gateway → Lambda (Express Handler)
   ↓
4. Lambda → DynamoDB Query (EmailIndex)
   ↓
5. Lambda → Verify password (bcrypt)
   ↓
6. Lambda → Generate JWT token
   ↓
7. Lambda → Response { token, user }
   Headers: { x-auth-token: jwt }
   ↓
8. Frontend → Store token (localStorage/sessionStorage)
   ↓
9. Frontend → Redirect to /cuenta (authenticated)
```

### 3. Obtener Perfil (Authenticated)
```
1. Usuario → profile.tappy.cl/cuenta
   ↓
2. Frontend → GET https://api-gateway-url/Prod/api/users/:username
   Headers: { x-auth-token: jwt }
   ↓
3. API Gateway → Lambda
   ↓
4. Lambda → JWT Middleware (verify token)
   ↓
5. Lambda → DynamoDB Query (UsernameIndex)
   ↓
6. Lambda → Response { user data }
   ↓
7. Frontend → Render profile page
```

### 4. Actualizar Perfil
```
1. Usuario → Edit form → Submit
   ↓
2. Frontend → PUT https://api-gateway-url/Prod/api/users/:id
   Headers: { x-auth-token: jwt, Content-Type: application/json }
   Body: { updated fields }
   ↓
3. API Gateway → Lambda
   ↓
4. Lambda → JWT Middleware → Verify ownership
   ↓
5. Lambda → DynamoDB UpdateItem
   ↓
6. Lambda → Response { updated user }
   ↓
7. Frontend → Update UI + Show success message
```

## 🔐 Seguridad

### Frontend (CloudFront + S3)
```
┌──────────────────────────────────────┐
│  Security Measures:                  │
├──────────────────────────────────────┤
│  ✅ HTTPS only (SSL/TLS)            │
│  ✅ ACM Certificate (auto-renewal)  │
│  ✅ Origin Access Control (OAC)     │
│  ✅ S3 bucket private (not public)  │
│  ✅ Security headers (via CF)       │
│  ✅ DDoS protection (AWS Shield)    │
└──────────────────────────────────────┘
```

### Backend (Lambda + DynamoDB)
```
┌──────────────────────────────────────┐
│  Security Measures:                  │
├──────────────────────────────────────┤
│  ✅ JWT authentication               │
│  ✅ Password hashing (bcrypt)        │
│  ✅ CORS configured                  │
│  ✅ IAM least-privilege roles        │
│  ✅ Encrypted env variables          │
│  ✅ DynamoDB encryption at rest      │
│  ✅ VPC (optional, not enabled)      │
│  ✅ API throttling/rate limiting     │
└──────────────────────────────────────┘
```

## 📊 CI/CD Pipeline

### Frontend Deploy Pipeline
```
┌─────────────────────────────────────────────────────────────┐
│  GitHub Actions Workflow: deploy-frontend.yml              │
└─────────────────────────────────────────────────────────────┘
         │
         ├─ 1. Trigger: Push to main (client/** changes)
         │
         ├─ 2. Checkout code
         │
         ├─ 3. Setup Node.js 18
         │
         ├─ 4. npm install (client/)
         │
         ├─ 5. npm run build
         │    └─ Output: client/build/
         │
         ├─ 6. Configure AWS (OIDC, no keys!)
         │
         ├─ 7. Get Stack Outputs
         │    ├─ Bucket name
         │    └─ Distribution ID
         │
         ├─ 8. Sync to S3
         │    ├─ Static assets (cache: 1 year)
         │    └─ HTML/manifest (cache: 0)
         │
         ├─ 9. Invalidate CloudFront cache
         │    └─ Paths: /*
         │
         └─ 10. Success! 🎉
              └─ Live at https://profile.tappy.cl
```

### Backend Deploy Pipeline
```
┌─────────────────────────────────────────────────────────────┐
│  GitHub Actions Workflow: deploy-backend.yml               │
└─────────────────────────────────────────────────────────────┘
         │
         ├─ 1. Trigger: Push to main (server/** changes)
         │
         ├─ 2. Checkout code
         │
         ├─ 3. Setup Node.js 18
         │
         ├─ 4. Setup SAM CLI
         │
         ├─ 5. Configure AWS (OIDC)
         │
         ├─ 6. sam build
         │    └─ Build Lambda package
         │
         ├─ 7. sam deploy
         │    ├─ Upload to S3
         │    ├─ CloudFormation change set
         │    └─ Update Lambda + API Gateway
         │
         └─ 8. Success! 🎉
              └─ API live at API Gateway URL
```

## 🔧 Development Workflow

### Local Development
```
┌────────────────────────┐
│  Developer Machine     │
└────────────────────────┘
         │
         ├─ Terminal 1: Frontend Dev Server
         │  $ cd client
         │  $ npm start
         │  → http://localhost:3000
         │  → Uses remote API (AWS)
         │
         ├─ Terminal 2: Backend (Optional)
         │  $ cd server
         │  $ npm start
         │  → http://localhost:3001
         │  → For local API testing
         │
         └─ Browser: DevTools
            ├─ Network tab → API calls
            ├─ Console → Errors/logs
            └─ Application → JWT token
```

### Production Deploy
```
┌────────────────────────┐
│  Git Workflow          │
└────────────────────────┘
         │
         ├─ 1. Create feature branch
         │    $ git checkout -b feature/new-feature
         │
         ├─ 2. Make changes
         │    (edit files in client/ or server/)
         │
         ├─ 3. Commit
         │    $ git add .
         │    $ git commit -m "feat: add feature"
         │
         ├─ 4. Push to GitHub
         │    $ git push origin feature/new-feature
         │
         ├─ 5. Create Pull Request
         │    → Review → Approve → Merge to main
         │
         └─ 6. Auto-deploy
              ├─ GitHub Actions triggered
              ├─ Build + Deploy
              └─ Live in 2-5 minutes!
```

## 💾 Data Flow (User Management)

### Create User (Register)
```
POST /api/users/register
Body: { username, email, password, ... }
  ↓
[Lambda Handler]
  ↓
Validate input
  ↓
Check email exists (DynamoDB Query EmailIndex)
  ↓
Check username exists (DynamoDB Query UsernameIndex)
  ↓
Hash password (bcrypt)
  ↓
Generate unique ID (uuid)
  ↓
DynamoDB PutItem
  ↓
Generate JWT token
  ↓
Response: { token, user }
```

### Read User (Get Profile)
```
GET /api/users/:username
Headers: { x-auth-token: jwt }
  ↓
[Lambda Handler]
  ↓
JWT Middleware: Verify token
  ↓
DynamoDB Query UsernameIndex
  ↓
Filter sensitive data (remove password hash)
  ↓
Response: { user }
```

### Update User (Edit Profile)
```
PUT /api/users/:id
Headers: { x-auth-token: jwt }
Body: { updated fields }
  ↓
[Lambda Handler]
  ↓
JWT Middleware: Verify token
  ↓
Verify user owns resource (token.userId === params.id)
  ↓
Validate updated fields
  ↓
DynamoDB UpdateItem
  ↓
Response: { updated user }
```

### Delete User (Optional - not implemented)
```
DELETE /api/users/:id
Headers: { x-auth-token: jwt }
  ↓
[Lambda Handler]
  ↓
JWT Middleware: Verify token
  ↓
Verify ownership
  ↓
DynamoDB DeleteItem
  ↓
Response: { success: true }
```

## 📁 File Structure

```
tappy/
├── client/                           # Frontend React
│   ├── public/
│   │   ├── index.html
│   │   └── manifest.json
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.js
│   │   │   ├── Cart.js
│   │   │   └── ...
│   │   ├── pages/
│   │   │   ├── Home.js
│   │   │   ├── Login.js
│   │   │   ├── Register.js
│   │   │   ├── Cuenta.js
│   │   │   ├── UserProfile.js
│   │   │   ├── EditProfile.js
│   │   │   └── ...
│   │   ├── context/
│   │   │   └── AuthContext.js
│   │   ├── apiConfig.js            # ⭐ Central API config
│   │   ├── App.js
│   │   └── index.js
│   ├── build/                       # Production build
│   ├── cloudfront-template.yaml    # Infrastructure as Code
│   ├── create-cloudfront-stack.sh  # Setup script
│   ├── deploy-frontend.sh          # Deploy script
│   ├── check-deployment.sh         # Verification script
│   ├── DEPLOY.md                   # Full docs
│   ├── DEPLOY-CHECKLIST.md        # Step-by-step guide
│   └── package.json
│
├── server/                          # Backend Express → Lambda
│   ├── controllers/
│   │   └── dynamoUserController.js  # Business logic
│   ├── middleware/
│   │   └── dynamoAuth.js           # JWT verification
│   ├── models/
│   │   └── DynamoUser.js           # Data access layer
│   ├── routes/
│   │   └── dynamoUserRoutes.js     # API routes
│   ├── lambda.js                   # ⭐ Lambda handler
│   ├── server.js                   # ⭐ Express app
│   ├── template.yaml               # ⭐ SAM/CloudFormation
│   └── package.json
│
├── .github/
│   └── workflows/
│       ├── deploy-backend.yml      # Backend CI/CD
│       └── deploy-frontend.yml     # Frontend CI/CD
│
├── DEPLOYMENT-GUIDE.md             # This file!
└── README.md                       # Project overview
```

## 🎯 URLs y Endpoints

### Producción
- **Frontend**: https://profile.tappy.cl
- **API**: https://u1yadifvmj.execute-api.us-east-1.amazonaws.com/Prod
- **E-commerce**: https://tappy.cl (Shopify)

### Desarrollo
- **Frontend Local**: http://localhost:3000
- **Backend Local**: http://localhost:3001 (opcional)

### AWS Console Links
- **CloudFront**: https://console.aws.amazon.com/cloudfront/v3/home
- **S3**: https://s3.console.aws.amazon.com/s3/buckets/profile.tappy.cl-frontend
- **Lambda**: https://console.aws.amazon.com/lambda/home#/functions/TappyApiFunction
- **DynamoDB**: https://console.aws.amazon.com/dynamodb/home#tables:selected=Tappy_Users
- **API Gateway**: https://console.aws.amazon.com/apigateway/
- **CloudWatch Logs**: https://console.aws.amazon.com/cloudwatch/home#logsV2:log-groups

## 📈 Monitoring y Métricas

### CloudWatch Metrics to Monitor

**Lambda:**
- Invocations
- Duration
- Errors
- Throttles
- Concurrent Executions

**API Gateway:**
- 4XXError
- 5XXError
- Count (requests)
- Latency

**CloudFront:**
- Requests
- Bytes Downloaded
- Error Rate (4xx, 5xx)
- Cache Hit Ratio

**DynamoDB:**
- Consumed Read/Write Capacity
- User Errors
- System Errors
- Latency

### Alertas Recomendadas (CloudWatch Alarms)

```
┌─────────────────────────────────────────┐
│  Critical Alarms:                       │
├─────────────────────────────────────────┤
│  ⚠️  Lambda Error Rate > 5%            │
│  ⚠️  API 5XX Errors > 10/min           │
│  ⚠️  DynamoDB Throttled Requests       │
│  ⚠️  Lambda Duration > 10s (timeout)   │
└─────────────────────────────────────────┘
```

## 🔍 Debugging Tips

### Frontend Issues
1. Check browser console for errors
2. Verify Network tab shows correct API URL
3. Check JWT token in Application/Storage
4. Verify CORS headers in responses
5. Test CloudFront cache: `curl -I https://profile.tappy.cl`

### Backend Issues
1. Check CloudWatch Logs: `/aws/lambda/TappyApiFunction`
2. Test Lambda directly (AWS Console → Test)
3. Verify DynamoDB table exists and has data
4. Check IAM permissions (Lambda execution role)
5. Verify environment variables (JWT_SECRET, etc.)

### Infrastructure Issues
1. Verify CloudFormation stack status
2. Check Route 53 DNS records
3. Verify ACM certificate status (must be "Issued")
4. Test CloudFront distribution status
5. Check S3 bucket has files

---

**Última actualización**: Noviembre 2025
**Mantenido por**: Andrew Guerra
**Contacto**: andresdavidguerra29@gmail.com
