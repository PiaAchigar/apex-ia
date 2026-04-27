**Crear(si aun no existe):** `apps/api/src/validators/` (carpeta con múltiples archivos)

### 2.1 Auth Validators

`apps/api/src/validators/auth.validators.ts`

```typescript
import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string()
    .email('Email inválido')
    .toLowerCase()
    .trim(),
  password: z.string()
    .min(8, 'Mínimo 8 caracteres')
    .max(128, 'Máximo 128 caracteres')
    .regex(/[A-Z]/, 'Debe contener mayúscula')
    .regex(/[a-z]/, 'Debe contener minúscula')
    .regex(/[0-9]/, 'Debe contener número')
    .regex(/[!@#$%^&*]/, 'Debe contener símbolo especial'),
  organizationName: z.string()
    .min(1, 'Nombre requerido')
    .max(100, 'Máximo 100 caracteres')
    .trim(),
})

export const loginSchema = z.object({
  email: z.string()
    .email('Email inválido')
    .toLowerCase()
    .trim(),
  password: z.string()
    .min(1, 'Password requerido'),
})
```

### 2.2 Setup Validators

`apps/api/src/validators/setup.validators.ts`

```typescript
import { z } from 'zod'

export const connectDatabaseSchema = z.object({
  supabaseUrl: z.string()
    .url('URL inválida')
    .regex(/https:\/\/.*\.supabase\.co/, 'Debe ser URL de Supabase')
    .trim(),
  supabaseKey: z.string()
    .min(50, 'API Key inválida')
    .max(500, 'API Key inválida')
    .trim()
    .refine(
      (key) => !key.includes('service_role'),
      'Usa la key "anon", no "service_role"'
    ),
})

export const validateDatabaseSchema = z.object({
  supabaseUrl: connectDatabaseSchema.shape.supabaseUrl,
  supabaseKey: connectDatabaseSchema.shape.supabaseKey,
})
```

### 2.3 Contact Validators

`apps/api/src/validators/contact.validators.ts`

```typescript
import { z } from 'zod'

export const searchContactSchema = z.object({
  query: z.string()
    .min(1, 'Query requerido')
    .max(100, 'Máximo 100 caracteres')
    .trim(),
  limit: z.number()
    .int()
    .min(1)
    .max(100)
    .default(10),
  offset: z.number()
    .int()
    .min(0)
    .default(0),
})

export const createContactSchema = z.object({
  name: z.string()
    .min(1, 'Nombre requerido')
    .max(100, 'Máximo 100 caracteres')
    .trim(),
  email: z.string()
    .email('Email inválido')
    .toLowerCase()
    .trim()
    .optional(),
  phone: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Formato de teléfono inválido')
    .optional(),
  customFieldsJson: z.record(z.any())
    .optional()
    .refine(
      (obj) => !obj || Object.keys(obj).length <= 50,
      'Máximo 50 campos custom'
    ),
})
```

### 2.4 Flow Validators (CRÍTICO)

`apps/api/src/validators/flow.validators.ts`

```typescript
import { z } from 'zod'

// Validar que NO contiene código peligroso
const noDangerousCode = (value: string) => {
  const forbidden = [
    'eval',
    'Function',
    '__import__',
    'require',
    'exec',
    'spawn',
    'system',
    'process',
    'child_process',
    'fs.',
    'os.',
  ]
  
  return !forbidden.some(word => value.toLowerCase().includes(word.toLowerCase()))
}

const triggerNodeSchema = z.object({
  id: z.string().uuid('ID inválido'),
  type: z.literal('TriggerNode'),
  data: z.object({
    triggerType: z.enum(['incoming_message', 'keyword', 'scheduled']),
    keyword: z.string()
      .max(100)
      .optional(),
  }),
})

const conditionNodeSchema = z.object({
  id: z.string().uuid('ID inválido'),
  type: z.literal('ConditionNode'),
  data: z.object({
    condition: z.string()
      .min(1)
      .max(500)
      .refine(
        noDangerousCode,
        'Código no permitido en condición'
      ),
    operator: z.enum(['==', '!=', '>', '<', '&&', '||']),
    value: z.string().max(100),
  }),
})

const sendMessageNodeSchema = z.object({
  id: z.string().uuid('ID inválido'),
  type: z.literal('SendMessageNode'),
  data: z.object({
    content: z.string()
      .min(1)
      .max(5000)
      .refine(
        noDangerousCode,
        'Código no permitido en mensaje'
      ),
    includeMedia: z.boolean().optional(),
  }),
})

const delayNodeSchema = z.object({
  id: z.string().uuid('ID inválido'),
  type: z.literal('DelayNode'),
  data: z.object({
    delaySeconds: z.number()
      .int()
      .min(1)
      .max(86400), // máx 24h
  }),
})

const aiResponseNodeSchema = z.object({
  id: z.string().uuid('ID inválido'),
  type: z.literal('AiResponseNode'),
  data: z.object({
    prompt: z.string()
      .min(1)
      .max(5000)
      .refine(
        noDangerousCode,
        'Código no permitido en prompt'
      ),
    model: z.enum(['claude-3-haiku', 'gpt-4o', 'gemini-pro']),
  }),
})

const flowNodeSchema = z.union([
  triggerNodeSchema,
  conditionNodeSchema,
  sendMessageNodeSchema,
  delayNodeSchema,
  aiResponseNodeSchema,
])

export const createFlowSchema = z.object({
  name: z.string()
    .min(1, 'Nombre requerido')
    .max(100, 'Máximo 100 caracteres')
    .trim(),
  triggerType: z.enum(['incoming_message', 'keyword', 'scheduled']),
  nodes: z.array(flowNodeSchema)
    .min(1, 'Flow debe tener al menos 1 nodo')
    .max(100, 'Flow máximo 100 nodos'),
  edges: z.array(z.object({
    source: z.string().uuid(),
    target: z.string().uuid(),
  }))
    .max(100, 'Máximo 100 conexiones'),
})

export type CreateFlowInput = z.infer<typeof createFlowSchema>
```
### 2.5 Usar Validators en Rutas

**Patrón en todas las rutas:**

```typescript
// ✅ CORRECTO
router.post('/contacts', authMiddleware, tenantMiddleware, async (c) => {
  const body = await c.req.json()
  const { organizationId } = c.env
  
  // Validar input
  const validated = createContactSchema.parse(body)
  
  // Usar validated
  const contact = await contactsService.createContact(organizationId, validated)
  
  return c.json(contact)
})

// ❌ INCORRECTO: usar body directamente
router.post('/contacts', async (c) => {
  const body = await c.req.json() // ← SIN VALIDAR
  const contact = await contactsService.createContact(body) // ← PELIGROSO
  return c.json(contact)
})
```