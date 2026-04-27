# DECISIONES FINALES - Confirmadas por Cliente
## Multi-Database Architecture (Dual-DB)

---

## ✅ Todas las Decisiones Respondidas

### 1️⃣ Setup Flow
**Opción elegida:** Todo en 1 página con tabs
- Paso 1: Conectar DB (URL + Key)
- Paso 2: Validar conexión
- Paso 3: Inicializar schema
- Paso 4: Conectar canales
- Paso 5: Confirmar

**Implementación:** Un único page `/setup` con 4 tabs navegables

---

### 2️⃣ Validación de Cliente Supabase
**Opción elegida:** Automático al escribir/pegar (valida en tiempo real)

**Cómo:**
- Mientras el usuario escribe URL o pega Key
- Debounce: esperar 500ms después de que deja de escribir
- `POST /setup/validate-database` con URL + Key
- Mostrar ✅ verde si ok, ❌ rojo si falla
- NO guarda nada, solo valida

---

### 3️⃣ Cliente con Datos Existentes
**Opción elegida:** Darle la estructura de nombres necesaria, que el cliente se encargue de renombrar

**Cómo:**
- Al conectar: "Si tienes tablas existentes, necesitas renombrarlas así:"
- Mostrar tabla de conversión:
  ```
  TUS TABLAS → NUESTRAS TABLAS
  messages → messages
  chats → conversations
  usuarios → contacts
  etc.
  ```
- Documentación con SQL de rename (si quiere hacerlo automático)
- Si tiene conflictos: error claro "Ya existen tablas con ese nombre"

---

### 4️⃣ Schema Management
**Opción elegida:** Opción A - Tú mantienes schema en `packages/database/`, migrás automáticamente

**Cómo:**
- Schema vive en `packages/database/schema/tenant/`
- Migraciones Drizzle se generan con `pnpm db:generate`
- Durante setup, ejecutamos migraciones en cliente DB
- Si falla: error con detalle, cliente puede reintentar

---

### 5️⃣ Borrado de Organization
**Opción elegida:** Opción C - Marcar como 'inactive' sin borrar

**Cómo:**
```sql
UPDATE client_databases SET is_active = false WHERE organization_id = ?
```

**Resultado:**
- Datos del cliente siguen en su Supabase (no se pierden)
- Mi `client_databases` marca la fila como inactiva
- Si cliente quiere recuperar: cambiar a `is_active = true`
- Soft delete, no hard delete

---

### 6️⃣ Encriptación
**Opción elegida:** Una única key para TODOS los clientes (más simple)

**Cómo:**
```
CLIENT_DB_ENCRYPTION_KEY = [32 bytes hex, generar con: openssl rand -hex 32]
```

**Por qué:**
- Una key única es suficiente (AES-256-GCM es seguro)
- Complejidad innecesaria si haces una key por cliente
- Backup/restore más simple
- Trade-off: TIENES acceso a todas las credenciales (con la key)

---

### 7️⃣ Rate Limiting
**Opción elegida:** 5 intentos en 15 minutos, luego esperar 1 hora

**Implementación:**
```typescript
// En Redis
KEY: "setup:connect-database:{userId}"
LIMIT: 5 intentos
WINDOW: 15 minutos
LOCKOUT: 1 hora

// Si supera límite:
HTTP 429 Too Many Requests
Mensaje: "Demasiados intentos. Intenta de nuevo en 1 hora."
```

---

### 8️⃣ Auditoría
**Opción elegida:** No, solo errores de conexión

**Qué se registra en `audit_logs`:**
```typescript
{
  action: "setup.database_validation_failed",
  resourceType: "organization",
  resourceId: organizationId,
  oldValuesJson: null,
  newValuesJson: { error: "Invalid URL format" },
  ipAddress: clientIp,
  createdAt: now()
}
```

**Qué NO se registra:**
- Intentos exitosos (demasiado noise)
- Cambios de estado (minuciosos)

**Por qué:**
- Solo errores es lo relevante
- Menos spam en audit_logs
- Más rápido

---

### 9️⃣ Documentación en-app
**Opción elegida:** Sí, modal con instrucciones (pasos para obtener URL + Key)

**Contenido del modal:**
```
"¿Cómo obtener tu URL y API Key?"

1. Ve a https://app.supabase.com
2. Crea un nuevo proyecto (el plan FREE está ok)
3. Ve a Settings → API
4. Copia la "Project URL"
5. Copia la "anon public" key (NO service_role)
6. Pégalas en los campos de abajo
7. Verifica la conexión

⚠️ Importante: 
- Nunca compartas tu key públicamente
- La key anon es segura para usar en cliente
```

**Implementación:**
- Botón "?" o "Ayuda" al lado del input
- Click → Modal con instrucciones
- Opción para "No mostrar de nuevo"

---

### 🔟 API Endpoints
**Opción elegida:** Private - solo admin

**Rutas:**
```typescript
POST /setup/validate-database
  - Requiere: JWT válido
  - Requiere: role = "admin"
  - Parámetros: { supabaseUrl, supabaseKey }
  - Responde: { valid: true/false, error?: string }

POST /setup/initialize-schema
  - Requiere: JWT válido + admin
  - Ejecuta migraciones en cliente DB
  - Responde: { success: true, tablesCreated: [...] }

POST /setup/connect-channels
  - Requiere: JWT válido + admin
  - Conecta canales (WhatsApp, IG, etc.)
```

**Middleware:**
```typescript
authMiddleware → tenantMiddleware → adminMiddleware → handler
```

---

### 1️⃣1️⃣ n8n Integration
**Opción elegida:** Sí, pero solo para logging/analítica

**Qué significa:**
- n8n se conecta DIRECTAMENTE a cliente Supabase (sin pasar por tu API)
- En Fase 1, solo logging: tabla `n8n_workflows` en cliente DB que trackea workflows
  ```typescript
  {
    id: UUID,
    workflow_id: string,           // ID de n8n
    workflow_name: string,
    trigger_type: string,          // "incoming_message", "scheduled", etc.
    last_executed_at: timestamp,
    execution_count: int,
    is_active: boolean,
    metadata_json: jsonb,          // cualquier dato custom
  }
  ```
- Tu API NO necesita "conocer" de n8n en Fase 1
- Después (Fase 2+): si necesitas tracking, lo agregas

**Por qué:**
- n8n tiene acceso directo a cliente Supabase
- No necesita pasar por tu API
- Para logging, inserta en su propia tabla

---

### 1️⃣2️⃣ Errores de Conexión
**Opción elegida:** Genérico

**Mensaje única:**
```
"No se pudo conectar. Verifica URL y Key"
```

**Por qué:**
- Evitas exponer información sensible
- No das pistas sobre qué falló exactamente
- Más seguro

**En logs (servidor, NO al usuario):**
```typescript
console.error(`DB validation failed: ${error.message}`);
// Ejemplo: "DB validation failed: ECONNREFUSED 127.0.0.1:5432"
```

---

### 1️⃣3️⃣ Redirect Post-Setup
**Opción elegida:** `/[slug]/inbox` (para empezar a usar)

**Flujo:**
```
Setup completado ✅
  ↓
Redirect a /[slug]/inbox
  ↓
Usuario ve: Inbox vacío (porque no tiene mensajes aún)
  ↓
Usuario conecta canales (WhatsApp, IG, etc.)
  ↓
Mensajes llegan → aparecen en inbox
```

**Por qué:**
- Inbox es el módulo principal
- Cliente quiere empezar a usar inmediatamente
- Conexión de canales puede hacerla después (desde settings)

---

### 1️⃣4️⃣ Billing: Timeout si no completa Setup
**Opción elegida:** El cliente NO paga si no completa setup en 24h (auto-cancel)

**Implementación:**
```typescript
// Cuando cliente completa registro + paga:
{
  organizationId: "xxx",
  stripeSubscriptionId: "sub_xxx",
  plan: "growth",
  setupCompletedAt: null,
  paidAt: NOW(),
  setupDeadline: NOW() + 24h
}

// Cron job cada 1h:
SELECT * FROM organizations WHERE setupCompletedAt IS NULL AND setupDeadline < NOW()
FOR EACH:
  stripe.subscriptions.cancel(stripeSubscriptionId)
  UPDATE organizations SET plan = "starter", stripeSubscriptionId = NULL
  Enviar email: "Tu período de prueba expiró. Complete setup para activar."
```

**Usuario experience:**
```
Paga → Recibe email: "¡Bienvenido! Tienes 24h para completar setup"
       ↓
    18h después → Email recordatorio
       ↓
    24h → Suscripción auto-cancelada (vuelve a STARTER)
       ↓
    Puede reconectar y pagar de nuevo cuando esté listo
```

---

### 1️⃣5️⃣ Fallback si Cliente DB Falla
**Opción elegida:** A) Error limpio - "No se puede conectar a tu DB"

**Cómo:**
```typescript
async function getConversations(orgId) {
  try {
    const clientDb = await databaseProvider.getClientDrizzle(orgId);
    return clientDb.select().from(conversations);
  } catch (error) {
    // NO retry, NO cache
    // Error limpio al usuario
    throw new Error("No se puede conectar a tu base de datos. Verifica que está activa.");
  }
}
```

**Por qué:**
- Simple y honesto
- Cliente sabe que hay un problema
- No hay confusión con datos stale (cache)
- No hay timeout largo (sin retry)

**Usuario experience:**
```
Usuario hace click en Inbox
  ↓
Tu API intenta conectar a cliente DB
  ↓
Cliente DB no responde (down, token expirado, etc.)
  ↓
Error: "No se puede conectar a tu base de datos. Verifica que está activa."
  ↓
Usuario revisa su Supabase dashboard → ve que está down
  ↓
Espera, intenta de nuevo → ok
```

---

## 📋 Resumen de Cambios en ARCHITECTURE-CHANGES.md

Con estas decisiones, ARCHITECTURE-CHANGES.md necesita estos ajustes:

1. **Setup Flow:** Cambiar de 5 páginas a 1 página con tabs
2. **Validación:** Agregar debounce, validación en tiempo real
3. **n8n:** Agregar tabla `n8n_workflows` en cliente DB
4. **Rate Limiting:** Detallar redis key y lockout
5. **Audit:** Solo registrar errores, no todos los eventos
6. **Timeout:** Agregar cron job para auto-cancel después de 24h
7. **Error Handling:** Documentar mensajes genéricos

---

## 🚀 Próximo Paso

Con estas 15 decisiones confirmadas, ahora:

1. ✅ Actualizo ARCHITECTURE-CHANGES.md (5 min)
2. ✅ Actualiza CLAUDE.md con HOW-TO-UPDATE-CLAUDE.md (20 min)
3. ✅ Copias ARCHITECTURE-CHANGES.md a tu repo
4. ✅ Pasas todo a Claude Code

**Total:** ~25 minutos antes de empezar a codear

---

## ✨ Cambios Específicos a Hacer en ARCHITECTURE-CHANGES.md

### Sección: "Flujo: Onboarding del Cliente (Fase 1 modificada)"

**AGREGAR:**
```markdown
### Setup: 1 Página con Tabs (NO 5 páginas)

GET /setup
→ Mostrar página única con 4 tabs:

TAB 1: Conectar Base de Datos
├─ [Input] URL: https://xxx.supabase.co
├─ [Input] API Key: eyJxxx...
├─ [Button ?] Ayuda (abre modal con instrucciones)
├─ Real-time validation: ✅ / ❌
└─ [Button] Siguiente

TAB 2: Inicializar Schema (DISABLED hasta validar)
├─ [Spinner] "Inicializando tu base de datos..."
├─ Drizzle migrations en cliente DB
└─ [Button] Siguiente

TAB 3: Conectar Canales (DISABLED hasta schema ok)
├─ Grid de canales: [ WhatsApp ] [ IG ] [ Telegram ] [ Email ] [ WebChat ]
├─ Click en canal → Modal de setup
└─ [Button] Completar Setup

TAB 4: Confirmación (DISABLED hasta >1 canal)
├─ ✅ Base de datos: {databaseName}
├─ ✅ Schema: inicializado con 15 tablas
├─ ✅ Canales conectados: {count}
├─ [Button] Ir a Inbox
└─ Redirect a /[slug]/inbox
```

### Sección: "Validaciones de Seguridad"

**AGREGAR:**
```markdown
### Validación en Tiempo Real

async function validateClientDatabaseWithDebounce(url, key) {
  // Debounce: esperar 500ms después de que el usuario deja de escribir
  clearTimeout(debounceTimer);
  
  debounceTimer = setTimeout(async () => {
    try {
      // 1. Validar formato URL
      const urlObj = new URL(url);
      if (!urlObj.hostname.includes("supabase.co")) {
        showError("❌ URL debe ser de Supabase");
        return;
      }
      
      // 2. Intentar conexión real
      const supabase = createClient(url, key);
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        showError("❌ API Key inválida o expirada");
        return;
      }
      
      // 3. Validar que la DB está accesible
      const { error: dbError } = await supabase
        .from("information_schema.tables")
        .select("*")
        .limit(1);
      
      if (dbError) {
        showError("❌ No se puede acceder a la base de datos");
        return;
      }
      
      // 4. Validar que NO es service_role key (demasiado peligroso)
      if (key.includes("service_role")) {
        showError("⚠️ Usa la key 'anon', no 'service_role'");
        return;
      }
      
      // ✅ Todo ok
      showSuccess("✅ Conexión válida");
      enableNextButton();
    } catch (error) {
      showError("No se pudo conectar. Verifica URL y Key");
    }
  }, 500); // debounce
}
```

### Sección: "Timeout de Setup (Fase 1 modificada)"

**AGREGAR:**
```markdown
### Auto-cancel después de 24h sin completar setup

**Implementación:**

1. Cuando cliente paga:
```sql
INSERT INTO organizations VALUES (
  id: "xxx",
  plan: "growth",
  paidAt: NOW(),
  setupCompletedAt: NULL,
  setupDeadline: NOW() + INTERVAL '24 hours'
);
```

2. Cron job (cada 1 hora):
```typescript
// apps/api/src/jobs/setup-timeout.job.ts
async function checkSetupTimeouts() {
  const expiredOrgs = await db
    .select()
    .from(organizations)
    .where(and(
      isNull(organizations.setupCompletedAt),
      lt(organizations.setupDeadline, now())
    ));
  
  for (const org of expiredOrgs) {
    // Cancelar suscripción en Stripe
    await stripe.subscriptions.cancel(org.stripeSubscriptionId);
    
    // Downgrade a plan free
    await db.update(organizations)
      .set({
        plan: "starter",
        stripeSubscriptionId: null,
        stripeCustomerId: null
      })
      .where(eq(organizations.id, org.id));
    
    // Enviar email
    await sendEmail({
      to: org.adminEmail,
      subject: "Tu período de prueba expiró",
      template: "setup_timeout",
      data: { orgName: org.name }
    });
    
    // Audit log
    await auditLog({
      userId: null, // sistema
      action: "organization.setup_timeout",
      resourceType: "organization",
      resourceId: org.id,
      newValuesJson: { plan: "starter" }
    });
  }
}
```

3. Registrar en Drizzle:
```typescript
export const organizations = pgTable("organizations", {
  // ... campos existentes ...
  paidAt: timestamp("paid_at"),
  setupCompletedAt: timestamp("setup_completed_at"),
  setupDeadline: timestamp("setup_deadline"),
});
```
```

### Sección: "Tests Requeridos (Fase 1 modificada)"

**AGREGAR:**
```typescript
// tests/integration/setup.routes.test.ts
describe("Setup Flow", () => {
  it("debería validar DB en tiempo real (debounce 500ms)")
  it("debería rechazar URL que no es Supabase")
  it("debería rechazar service_role key")
  it("debería ejecutar migraciones en cliente DB")
  it("debería marcar setupCompletedAt después de conectar ≥1 canal")
})

describe("Setup Timeout", () => {
  it("debería auto-cancel suscripción después de 24h sin completar setup")
  it("debería enviar email de recordatorio a las 18h")
  it("debería permitir reconectar y pagar de nuevo")
})

describe("POST /setup/validate-database", () => {
  it("debería retornar 429 después de 5 intentos en 15min")
  it("debería retornar 403 si no es admin")
  it("debería retornar error genérico si falla validación")
})
```
```

---

## ✅ Listo para Claude Code

Una vez apliques estos cambios a ARCHITECTURE-CHANGES.md:

1. Copia el archivo a tu repo: `docs/ARCHITECTURE-CHANGES.md`
2. Ejecuta HOW-TO-UPDATE-CLAUDE.md en CLAUDE.md
3. Pasa esto a Claude Code:
   ```
   "Implementá Fase 1 según:
   - docs/CLAUDE.md (actualizado)
   - docs/ARCHITECTURE-CHANGES.md (dual-database)
   - DECISIONES-FINALES.md (15 decisiones confirmadas)
   
   Decisiones clave:
   - Setup: 1 página con 4 tabs
   - Validación: en tiempo real (debounce 500ms)
   - Auto-cancel: 24h sin completar setup
   - n8n: solo logging en Fase 1
   - Encriptación: AES-256-GCM, una key para todos
   
   ¿Empezás?"
   ```

---

**LISTO. Todas las decisiones documentadas. Ahora actualizá CLAUDE.md y pasá a Claude Code.** 🚀
