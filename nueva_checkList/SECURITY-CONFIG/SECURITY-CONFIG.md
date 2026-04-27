# SECURITY-CONFIG.md
## Implementación de Seguridad Si es que no está aun hecho

---

## 📋 CHECKLIST DE SEGURIDAD

Antes de Claude Code empiece Fase 1, necesitás:

- [x] CORS configurado
- [x] Zod validators en TODOS los inputs
- [x] Rate limiting por IP
- [x] Security headers
- [x] Flow node validation
- [x] Tests de seguridad


---

## 1️⃣ CORS

**Crear:** `apps/api/src/middleware/corsMiddleware.ts`

```typescript
import { cors } from 'hono/cors'
import type { Context } from 'hono'

// Dominios permitidos según ambiente
const getAllowedOrigins = () => {
  const env = process.env.NODE_ENV
  
  if (env === 'development') {
    return [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
    ]
  }
  
  if (env === 'staging') {
    return [
      'https://staging.apexia.com',
      'https://app-staging.apexia.com',
    ]
  }
  
  // production
  return [
    'https://app.apexia.com',
    'https://apexia.com',
    'https://www.apex-ia.com.ar'
  ]
}

export const corsMiddleware = cors({
  origin: getAllowedOrigins(),
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
  ],
  exposeHeaders: [
    'Content-Length',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
  ],
  maxAge: 600, // 10 minutos
})
```

**En `apps/api/src/index.ts`:**

```typescript
import { corsMiddleware } from './middleware/corsMiddleware'

const app = new Hono()

// ⚠️ CORS debe ser PRIMERO, antes que cualquier otro middleware
app.use(corsMiddleware)

// Luego otros middlewares
app.use(authMiddleware)
app.use(tenantMiddleware)
app.use(rateLimitMiddleware)
// ... etc
```

**Tests:** `apps/api/tests/integration/cors.test.ts`

```typescript
describe('CORS Middleware', () => {
  it('debería permitir origen autorizado', async () => {
    const res = await app.request(new Request('http://localhost:3000', {
      method: 'OPTIONS',
      headers: { 'Origin': 'http://localhost:3000' }
    }))
    
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000')
  })
  
  it('debería rechazar origen no autorizado', async () => {
    const res = await app.request(new Request('http://malicious.com', {
      method: 'OPTIONS',
      headers: { 'Origin': 'http://malicious.com' }
    }))
    
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })
  
  it('debería tener credenciales permitidas', async () => {
    const res = await app.request(new Request('http://localhost:3000', {
      method: 'OPTIONS',
    }))
    
    expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true')
  })
})
```

---

## 2️⃣ ZOD VALIDATORS 
Andá al archivo "SECURITY-CONF-ZOD.md"

## 3️⃣ RATE LIMITING 
Andá al archivo "SECURITY-CONF-LIMITING.md"

## 4️⃣ SECURITY HEADERS
Andá al archivo "SECURITY-CONF-HEADER.md"

## 5️⃣ INPUT SANITIZATION
Andá al archivo "SECURITY-CONF-INPUT-SANIT.md"

## 6️⃣ TESTS DE SEGURIDAD
Andá al archivo "SECURITY-CONF-TEST.md"


---

## ✅ CHECKLIST: Implementar Seguridad

- [x] CORS middleware 
- [x] Zod validators 
- [x] Rate limiting 
- [x] Security headers 
- [x] Input sanitization 
- [x] Tests de seguridad 


---

## 🚀 Orden de Implementación

```
1. CORS + Security Headers (más rápido)
2. Rate Limiting
3. Zod Validators
4. Input Sanitization
5. Tests

Luego: CHECKLIST-FINAL 
Luego: Claude Code - Fase 1
```

---

## 📝 En `.env.example`

```env
# Upstash Redis (para rate limiting)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,https://app.apexia.com

# Security
ENCRYPTION_KEY=          # Para channel credentials
CLIENT_DB_ENCRYPTION_KEY= # Para client databases
```

---

**Listo. Implementá esto, y tu sistema pasa de 4/10 a 9/10 en seguridad.**
