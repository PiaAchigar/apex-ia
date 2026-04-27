# ARCHITECTURE-CHANGES.md
## Multi-Database + Multi-Tenant (Cliente = Proveedor de su propia DB)

---

## 🔄 Cambio Conceptual

**ANTES:**
```
Mi Supabase (centralizado)
├── schema: public
│   ├── organizations
│   ├── users
│   └── audit_logs
└── schema: company_{slug}
    ├── conversations
    ├── messages
    ├── contacts
    ├── deals
    └── ... (TODO lo del cliente)
```

**AHORA:**
```
Mi Supabase (centralizado)
├── schema: public
│   ├── organizations       ✅ (datos del cliente = empresa)
│   ├── users               ✅ (administradores, usuarios del cliente)
│   ├── audit_logs          ✅ (quien hizo qué en MI plataforma)
│   ├── billing_info        ✅ (planes, Stripe, suscripciones)
│   └── client_databases    ⭐ NUEVO: credenciales encriptadas del cliente
│
Cliente Supabase (su propia instancia)
└── schema: public
    ├── conversations       (SUS datos, responsabilidad suya)
    ├── messages
    ├── contacts
    ├── deals
    ├── pipelines
    ├── tasks
    ├── flows
    ├── campaigns
    └── ... (TODO lo operacional)
```

---

## 📊 Nueva Tabla: `client_databases`

**En MI `public` schema (Supabase centralizado):**

```typescript
// packages/database/schema/public/client_databases.ts
export const clientDatabases = pgTable("client_databases", {
  id:                     uuid("id").primaryKey().defaultRandom(),
  organizationId:         uuid("organization_id")
                            .notNull()
                            .references(() => organizations.id, { onDelete: "cascade" }),

  // Credenciales ENCRIPTADAS
  encryptedSupabaseUrl:   text("encrypted_supabase_url").notNull(),      // AES-256-GCM
  encryptedSupabaseKey:   text("encrypted_supabase_key").notNull(),      // AES-256-GCM (anon key)

  // Metadata
  databaseName:           varchar("database_name", { length: 100 }),     // "MyCompany DB", para logs
  isActive:               boolean("is_active").default(true),
  lastConnectionTest:     timestamp("last_connection_test"),
  lastConnectionSuccess:  boolean("last_connection_success"),

  createdAt:              timestamp("created_at").defaultNow(),
  updatedAt:              timestamp("updated_at").defaultNow(),
});

createIndex("idx_client_databases_org_id")
  .on(clientDatabases.organizationId)
  .using("btree");
```

---

## 📊 Schema organizations (con campos de Setup Timeline)

```typescript
// packages/database/schema/public/organizations.ts
export const organizations = pgTable("organizations", {
  id:                   uuid("id").primaryKey().defaultRandom(),
  slug:                 varchar("slug", { length: 50 }).unique().notNull(),
  name:                 varchar("name", { length: 100 }).notNull(),
  plan:                 text("plan").default("starter"),  // starter | growth | business

  // Mercado Pago
  mpCustomerId:         varchar("mp_customer_id"),
  mpSubscriptionId:     varchar("mp_subscription_id"),
  mpStatus:             text("mp_status").default("active"),  // active | paused | cancelled

  // Setup Timeline ⭐ NUEVO
  paidAt:               timestamp("paid_at"),              // Cuándo confirmó pago
  setupCompletedAt:     timestamp("setup_completed_at"),  // Cuándo completó setup
  setupDeadline:        timestamp("setup_deadline"),      // paidAt + 24 horas
  isSetupBlocked:       boolean("is_setup_blocked").default(false),

  createdAt:            timestamp("created_at").defaultNow(),
});
```

---

## 🔐 Estrategia de Encriptación

**AES-256-GCM (opción recomendada para SaaS):**

```typescript
// apps/api/src/services/ClientDatabaseService.ts

import crypto from "crypto";

class ClientDatabaseService {
  private encryptionKey = Buffer.from(process.env.CLIENT_DB_ENCRYPTION_KEY!, "hex");

  async storeDatabaseCredentials(
    organizationId: UUID,
    supabaseUrl: string,
    supabaseKey: string
  ): Promise<void> {
    const encryptedUrl = this.encryptValue(supabaseUrl);
    const encryptedKey = this.encryptValue(supabaseKey);

    await db.insert(clientDatabases).values({
      organizationId,
      encryptedSupabaseUrl: encryptedUrl,
      encryptedSupabaseKey: encryptedKey,
      databaseName: new URL(supabaseUrl).hostname,
    });
  }

  async getClientDatabaseConnection(organizationId: UUID) {
    const record = await db
      .select()
      .from(clientDatabases)
      .where(eq(clientDatabases.organizationId, organizationId))
      .limit(1);

    if (!record.length || !record[0].isActive) {
      throw new Error("No active database configured");
    }

    return {
      url: this.decryptValue(record[0].encryptedSupabaseUrl),
      key: this.decryptValue(record[0].encryptedSupabaseKey),
    };
  }

  private encryptValue(plaintext: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-gcm", this.encryptionKey, iv);

    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
  }

  private decryptValue(ciphertext: string): string {
    const [iv, authTag, encrypted] = ciphertext.split(":");

    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      this.encryptionKey,
      Buffer.from(iv, "hex")
    );
    decipher.setAuthTag(Buffer.from(authTag, "hex"));

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }
}
```

---

## 🔌 Patrón: DatabaseProvider

**Resuelve dinámicamente la DB del cliente con cache de conexiones:**

```typescript
// apps/api/src/db/database-provider.ts

const clientDbCache = new Map<string, { drizzle: Drizzle; lastUsed: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutos

class DatabaseProvider {
  async getClientDatabase(organizationId: UUID) {
    const creds = await new ClientDatabaseService().getClientDatabaseConnection(
      organizationId
    );

    return createClient(creds.url, creds.key, {
      auth: { persistSession: false },
    });
  }

  async getClientDrizzle(organizationId: UUID) {
    const cached = clientDbCache.get(organizationId);
    if (cached && Date.now() - cached.lastUsed < CACHE_TTL_MS) {
      cached.lastUsed = Date.now();
      return cached.drizzle;
    }

    const supabaseClient = await this.getClientDatabase(organizationId);
    const drizzleInstance = drizzle(supabaseClient, {
      schema: { /* schema del cliente */ },
    });

    clientDbCache.set(organizationId, {
      drizzle: drizzleInstance,
      lastUsed: Date.now(),
    });

    return drizzleInstance;
  }
}
```

**En cada servicio:**

```typescript
// apps/api/src/services/InboxService.ts

class InboxService {
  async getConversationsForAgent(
    organizationId: UUID,  // ← NUEVO: necesitamos el org ID
    agentId: UUID,
    filters: InboxFiltersType
  ) {
    const clientDb = await this.databaseProvider.getClientDrizzle(organizationId);

    return clientDb
      .select()
      .from(conversations)
      .where(and(eq(conversations.assignedAgentId, agentId)));
  }
}
```

---

## 📝 Cambios en Rutas

**Antes:**
```typescript
router.get("/conversations", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const conversations = await inboxService.getConversationsForAgent(userId);
  return c.json(conversations);
});
```

**Ahora:**
```typescript
router.get("/conversations", authMiddleware, tenantMiddleware, async (c) => {
  const userId = c.get("userId");
  const organizationId = c.get("organizationId");  // ← del tenantMiddleware

  const conversations = await inboxService.getConversationsForAgent(
    organizationId,
    userId
  );
  return c.json(conversations);
});
```

---

## 🔄 Flujo: Onboarding del Cliente (Fase 1 modificada)

### Paso 1: Register
```
POST /auth/register
{ "email": "admin@empresa.com", "password": "xxx", "organizationName": "Mi Empresa SAS" }
→ Crear usuario en Supabase Auth (mi instancia)
→ Crear fila en MI organizations table
→ Redirect a /billing/select-plan
```

### Paso 2: Select Plan
```
GET /billing/select-plan
→ Al elegir plan: crear sesión de Mercado Pago → redirect a checkout
```

### Paso 3: Confirmar Pago + Setup Deadline
```
POST /webhooks/mercadoPago (webhook)
→ Actualizar organization.plan = "growth"
→ Setear paidAt = NOW(), setupDeadline = NOW() + 24 HOURS
→ Enviar email: "Tienes 24h para completar setup"
→ Redirect a /setup
```

### Paso 4: Setup — UNA PÁGINA CON 4 TABS

**GET /setup** → Mostrar página única:

```
┌─────────────────────────────────────────────────┐
│  TAB 1: CONECTAR BASE DE DATOS                  │
│                                                 │
│  URL:     https://xxx.supabase.co              │
│           Real-time validation: ❌ / ✅         │
│                                                 │
│  API Key: eyJxxx...                            │
│           Real-time validation: ❌ / ✅         │
│                                                 │
│  [Button ?] Ayuda → Modal con instrucciones    │
│  [Button] Siguiente (habilitado solo si ✅)    │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  TAB 2: INICIALIZAR SCHEMA (disabled hasta ✅)  │
│                                                 │
│  Creando tablas (~10s):                        │
│  ✅ conversations  ✅ messages  ✅ contacts ... │
│                                                 │
│  [Button] Siguiente (habilitado cuando ✅ todo)│
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  TAB 3: CONECTAR CANALES (disabled hasta ✅)    │
│                                                 │
│  [ WhatsApp ] [ Instagram ] [ Telegram ]       │
│  [ Email ]    [ WebChat ]                      │
│                                                 │
│  [Button] Siguiente (habilitado si ≥1 canal)  │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  TAB 4: CONFIRMACIÓN (disabled hasta ✅)        │
│                                                 │
│  ✅ Base de datos: {databaseName}              │
│  ✅ Schema: 15 tablas inicializadas            │
│  ✅ Canales: {conectados} conectados           │
│                                                 │
│  [Button] Ir a Inbox → /[slug]/inbox           │
└─────────────────────────────────────────────────┘
```

**Validación en Tiempo Real (Debounce 500ms):**

```typescript
async function validateClientDatabaseWithDebounce(url: string, key: string) {
  clearTimeout(debounceTimer);

  debounceTimer = setTimeout(async () => {
    try {
      // 1. Validar formato URL
      const urlObj = new URL(url);
      if (!urlObj.hostname.includes("supabase.co")) {
        showError("❌ URL debe ser de Supabase");
        return;
      }

      // 2. Validar que NO es service_role key
      if (key.includes("service_role")) {
        showError("⚠️ Usa key 'anon', no 'service_role'");
        return;
      }

      // 3. Intentar conexión real
      const supabase = createClient(url, key);
      const { error } = await supabase.auth.getSession();
      if (error) throw error;

      // 4. Validar acceso a DB
      const { error: dbError } = await supabase
        .from("information_schema.tables")
        .select("*")
        .limit(1);
      if (dbError) throw dbError;

      showSuccess("✅ Conexión válida");
      enableNextButton();
    } catch {
      showError("No se pudo conectar. Verifica URL y Key");
      disableNextButton();
    }
  }, 500);
}
```

---

## ⏰ Auto-bloqueo: 24h sin completar Setup

**Flujo:**
```
Cliente paga → setupDeadline = NOW() + 24h → Email bienvenida
    │
    ├─ Setup completado en 24h → acceso total
    │
    └─ NO completado → acceso bloqueado (suscripción ACTIVA, no cancelada)
                    → puede completar setup en cualquier momento
```

**Diagrama de estados:**

```
┌─────────────────┐
│ Cliente Paga    │
└────────┬────────┘
         │
         ▼
┌────────────────────────────────────┐
│ Webhook: POST /webhooks/mercadopago│
│ 1. plan = 'growth'                 │
│ 2. paidAt = NOW()                  │
│ 3. setupDeadline = NOW() + 24h     │
│ 4. isSetupBlocked = false          │
│ 5. Email: "Tienes 24h para setup"  │
└────────┬───────────────────────────┘
         │
         ▼ (cada request al dashboard)
┌────────────────────────────────────┐
│ checkSetupStatusMiddleware         │
│ IF setupCompletedAt IS NULL        │
│    AND setupDeadline < NOW()       │
│    THEN: isSetupBlocked = true     │
│          return 403                │
│ ELSE: continuar                    │
└────────────────────────────────────┘
```

**Estados de Organization:**

| Estado | setupCompletedAt | setupDeadline | isSetupBlocked | Acceso |
|--------|-----------------|---------------|----------------|--------|
| Recién paga | NULL | NOW+24h | false | Setup page |
| En plazo | NULL | futuro | false | Setup page |
| **Timeout** | NULL | pasado | **true** | **❌ Bloqueado** |
| Completado | timestamp | cualquiera | false | ✅ Dashboard |

**Middleware:**

```typescript
// apps/api/src/middleware/checkSetupStatusMiddleware.ts
export const checkSetupStatusMiddleware = async (c: Context, next: Next) => {
  const organizationId = c.get("organizationId");
  if (!organizationId) return next();

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (!org) return next();

  if (org.setupCompletedAt) return next();

  if (org.setupDeadline && org.setupDeadline < new Date()) {
    if (!org.isSetupBlocked) {
      await db.update(organizations)
        .set({ isSetupBlocked: true })
        .where(eq(organizations.id, organizationId));

      await sendTransactionalEmail({
        to: userEmail,
        subject: "Setup requerido para usar Apex IA",
        template: "setup_timeout_notification",
        data: { setupUrl: `${process.env.NEXT_PUBLIC_APP_URL}/setup` }
      });

      await db.insert(auditLogs).values({
        action: "organization.setup_blocked_timeout",
        resourceType: "organization",
        resourceId: organizationId,
      });
    }

    return c.json(
      { error: "Setup requerido. Completa la configuración inicial para continuar." },
      403
    );
  }

  return next();
};
```

**En `apps/api/src/index.ts`:**
```typescript
app.use(authMiddleware)
app.use(tenantMiddleware)
app.use(checkSetupStatusMiddleware)  // ← Después de auth/tenant, antes de rutas
app.use(rateLimitMiddleware)
```

**Cron Job: Recordatorios por Email (cada hora, BullMQ):**

```typescript
// apps/api/src/jobs/setup-reminder.job.ts
export async function sendSetupReminders() {
  const remindOrgs = await db
    .select()
    .from(organizations)
    .where(and(
      isNull(organizations.setupCompletedAt),
      gt(organizations.setupDeadline, new Date()),
      eq(organizations.isSetupBlocked, false)
    ));

  for (const org of remindOrgs) {
    const hoursLeft = Math.ceil(
      (org.setupDeadline!.getTime() - Date.now()) / (1000 * 60 * 60)
    );

    if (hoursLeft === 18 || hoursLeft === 12 || hoursLeft === 6) {
      await sendTransactionalEmail({
        to: org.adminEmail,
        subject: `⏰ ${hoursLeft}h para completar setup en Apex IA`,
        template: "setup_reminder",
        data: { organizationName: org.name, hoursLeft,
                setupUrl: `${process.env.NEXT_PUBLIC_APP_URL}/setup` }
      });
    }
  }
}
```

---

## 🔗 n8n Integration

n8n conecta **DIRECTO** a cliente Supabase (no pasa por la API de Apex IA).

En Fase 1 se crea tabla de logging en cliente DB:

```typescript
// Tabla en CLIENTE Supabase
export const n8mWorkflows = pgTable("n8m_workflows", {
  id:               uuid("id").primaryKey().defaultRandom(),
  workflowId:       varchar("workflow_id", { length: 100 }).notNull(),
  workflowName:     varchar("workflow_name", { length: 200 }),
  triggerType:      varchar("trigger_type", { length: 50 }),  // "incoming_message", "scheduled"
  lastExecutedAt:   timestamp("last_executed_at"),
  executionCount:   integer("execution_count").default(0),
  isActive:         boolean("is_active").default(true),
  metadataJson:     jsonb("metadata_json"),
  createdAt:        timestamp("created_at").defaultNow(),
});
```

---

## 🛡️ Validaciones de Seguridad

```typescript
// apps/api/src/utils/database-validation.ts
async function validateClientDatabase(url: string, key: string): Promise<boolean> {
  try {
    // 1. Validar formato URL
    const urlObj = new URL(url);
    if (!urlObj.hostname.includes("supabase.co")) {
      throw new Error("Invalid Supabase URL");
    }

    // 2. Validar que NO es service_role key
    if (key.includes("service_role")) {
      throw new Error("Use 'anon' key, not 'service_role'");
    }

    // 3. Intentar conexión real
    const supabase = createClient(url, key);
    const { error } = await supabase.auth.getSession();
    if (error) throw error;

    // 4. Validar acceso a DB
    const { error: dbError } = await supabase
      .from("information_schema.tables")
      .select("*")
      .limit(1);
    if (dbError) throw dbError;

    return true;
  } catch (error) {
    // Logs internos (NO exponer al cliente)
    console.error(`DB validation failed for org: ${(error as Error).message}`);
    return false;
  }
}
```

### Error Handling: Mensajes Genéricos

**Al cliente mostramos:**
```
"No se pudo conectar. Verifica URL y Key"
```

**En logs (servidor, NO al usuario):**
```typescript
console.error(`DB validation failed for org ${orgId}: ${error.message}`);
```

### Rate Limiting: 5 intentos en 15 minutos

```typescript
// Redis key: setup:validate-database:{userId}
// LIMIT: 5 intentos
// WINDOW: 15 minutos
// LOCKOUT: 1 hora si supera límite

// Response:
// HTTP 429: { "error": "Demasiados intentos. Intenta de nuevo en 1 hora." }
```

### Modal: Ayuda para Obtener Credenciales

**Componente:** `HelpDatabaseSetupModal`  
**Trigger:** Click en botón "?" al lado de los inputs

```
"¿Cómo obtener tu URL y API Key?"

1. Ve a https://app.supabase.com
2. Inicia sesión con tu cuenta
3. Crea un nuevo proyecto (plan FREE está ok)
4. Ve a Settings → API
5. Copia el "Project URL"
6. Copia la "anon public" key (⚠️ NO "service_role")
7. Pégalas en los campos de abajo

⚠️ Importante:
- Nunca compartas tu API key públicamente
- La key "anon" es segura para cliente
- La key "service_role" es admin-only (NO uses)
```

**Opción "No mostrar de nuevo":** guardar en `localStorage`.

---

## 🔗 Impacto en Cada Servicio

| Servicio | Cambio | Urgencia |
|---|---|---|
| `InboxService` | Recibe `organizationId`, resuelve DB del cliente | 🔴 Crítica |
| `ContactsService` | Lo mismo | 🔴 Crítica |
| `ConversationService` | Lo mismo | 🔴 Crítica |
| `PipelineService` | Lo mismo | 🔴 Crítica |
| `FlowBuilderService` | Lo mismo | 🔴 Crítica |
| `CampaignService` | Lo mismo | 🔴 Crítica |
| `TasksService` | Lo mismo | 🔴 Crítica |
| `AnalyticsService` | Lo mismo | 🔴 Crítica |
| `BillingService` | SIGUE apuntando a MI DB (billing info) | 🟢 Sin cambio |
| `AuthService` | SIGUE en MI DB (Supabase Auth) | 🟢 Sin cambio |
| Webhook handlers | Reciben `organizationId` en payload | 🟡 Moderada |
| n8n Integration | Conecta DIRECTO a cliente Supabase | 🟢 Sin cambio en API |

---

## 🧪 Tests Requeridos (Fase 1 modificada)

```typescript
// tests/unit/ClientDatabaseService.test.ts
describe("ClientDatabaseService", () => {
  it("debería encriptar y desencriptar credenciales correctamente");
  it("debería lanzar error si la URL no es válida");
  it("debería lanzar error si la API key no funciona");
});

// tests/integration/setup.routes.test.ts
describe("Setup Flow - Validación en Tiempo Real", () => {
  it("debería validar DB después de 500ms (debounce)", async () => {
    // Escribe URL → espera 500ms → valida; no debería validar antes
  });

  it("debería rechazar URL que no es Supabase", async () => {
    const result = await validateDatabase("https://google.com", "key");
    expect(result.valid).toBe(false);
  });

  it("debería rechazar service_role key", async () => {
    const result = await validateDatabase(url, "service_role_key");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("anon");
  });

  it("debería aceptar anon key válida", async () => {
    const result = await validateDatabase(validUrl, validAnonKey);
    expect(result.valid).toBe(true);
  });
});

describe("Setup Flow - Timeout de 24h", () => {
  it("debería bloquear acceso después de 24h sin setup", async () => {
    const org = await createOrganization({
      paidAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
      setupDeadline: new Date(Date.now() - 1 * 60 * 60 * 1000),
      setupCompletedAt: null
    });

    const res = await app.request(new Request("/inbox", {
      headers: { "Authorization": `Bearer ${jwt}` }
    }));

    expect(res.status).toBe(403);
  });

  it("debería permitir acceso si completó setup en 24h", async () => {
    const org = await createOrganization({
      paidAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
      setupDeadline: new Date(Date.now() + 14 * 60 * 60 * 1000),
      setupCompletedAt: new Date()
    });

    const res = await app.request(new Request("/inbox", {
      headers: { "Authorization": `Bearer ${jwt}` }
    }));

    expect(res.status).toBe(200);
  });

  it("debería enviar email de timeout", async () => {
    // Auto-bloqueo → verificar email enviado
  });
});

describe("Setup Flow - Tabs UI", () => {
  it("debería mostrar TAB 1 por defecto");
  it("debería habilitar TAB 2 solo después de validar DB");
  it("debería habilitar TAB 3 solo después de inicializar schema");
  it("debería habilitar TAB 4 solo si ≥1 canal conectado");
  it("debería redirigir a /inbox después de completar setup");
});

describe("Rate Limiting en Setup", () => {
  it("debería permitir 5 intentos en 15 minutos", async () => {
    for (let i = 0; i < 5; i++) {
      const res = await validateDatabase(invalidUrl, invalidKey);
      expect(res.status).not.toBe(429);
    }
  });

  it("debería retornar 429 después de 5 intentos", async () => {
    for (let i = 0; i < 5; i++) {
      await validateDatabase(invalidUrl, invalidKey);
    }
    const res6 = await validateDatabase(validUrl, validKey);
    expect(res6.status).toBe(429);
  });
});

// tests/integration/inbox.routes.test.ts (MODIFICADO)
describe("GET /[slug]/conversations", () => {
  it("debería traer conversaciones de LA SUPABASE DEL CLIENTE, no de la mía");
});
```

---

## ⚠️ Consideraciones de Performance

1. **Encriptación:** AES-256-GCM es ~1ms por operación. Aceptable.
2. **Cache de conexiones:** `Map<organizationId, DrizzleInstance>` en memoria.
3. **TTL del cache:** 15 minutos sin uso → liberar conexión.

---

## 📌 Resumen de Archivos a Crear/Modificar

### CREAR:
- `packages/database/schema/public/client-databases.ts` → Nueva tabla
- `apps/api/src/services/ClientDatabaseService.ts` → Encriptación
- `apps/api/src/db/database-provider.ts` → Resolución dinámica de DB
- `apps/api/src/routes/setup.routes.ts` → Onboarding flow
- `apps/api/src/utils/database-validation.ts` → Validaciones
- `apps/api/src/middleware/checkSetupStatusMiddleware.ts` → Bloqueo 24h
- `apps/api/src/jobs/setup-reminder.job.ts` → Cron recordatorios
- `apps/web/app/(app)/setup/page.tsx` → Setup page (1 página, 4 tabs)
- `apps/web/components/setup/HelpDatabaseSetupModal.tsx` → Modal ayuda

### MODIFICAR:
- `packages/database/schema/public/organizations.ts` → Agregar paidAt, setupDeadline, isSetupBlocked
- `apps/api/src/middleware/tenantMiddleware.ts` → Agregar `organizationId` al contexto
- `apps/api/src/index.ts` → Agregar `checkSetupStatusMiddleware`
- Todos los servicios (`InboxService`, `ContactsService`, etc.) → Recibir `organizationId`
- Todas las rutas → Pasar `organizationId` a servicios
- `.env.example` → Agregar `CLIENT_DB_ENCRYPTION_KEY`

---

## 🔒 Checklist de Seguridad

- [ ] `CLIENT_DB_ENCRYPTION_KEY` está bien generada (`openssl rand -hex 32`)
- [ ] Setup endpoints requieren JWT válido
- [ ] Credenciales validadas ANTES de guardar en DB
- [ ] Rate limiting en `/setup/connect-database` (5 intentos / 15 min)
- [ ] Validar que la API key del cliente es `anon`, NO `service_role`
- [ ] Error handling genérico al cliente (no exponer detalles internos)
- [ ] Audit logs registran cada conexión exitosa de cliente DB
- [ ] CORS restringido: solo tu dominio
- [ ] `checkSetupStatusMiddleware` aplicado después de `authMiddleware`
