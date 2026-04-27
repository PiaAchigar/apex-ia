# CAMBIOS-FINALES-ARCHITECTURE.md
## Parches a Aplicar en ARCHITECTURE-CHANGES.md

---

## 1️⃣ AGREGAR: Campos de Setup en organizations

**Dónde:** En la sección "Schema PÚBLICO — en MI Supabase"

**Agregar después de la tabla organizations:**

```typescript
// organizations: una fila por empresa cliente (cliente mío)
export const organizations = pgTable("organizations", {
  id:                   uuid("id").primaryKey().defaultRandom(),
  slug:                 varchar("slug", { length: 50 }).unique().notNull(),
  name:                 varchar("name", { length: 100 }).notNull(),
  plan:                 text("plan").default("starter"),  // starter | growth | business
  stripeCustomerId:     varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  
  // ⭐ NUEVO: Billing + Setup Timeline
  paidAt:               timestamp("paid_at"),              // Cuándo confirmó pago
  setupCompletedAt:     timestamp("setup_completed_at"),  // Cuándo completó setup
  setupDeadline:        timestamp("setup_deadline"),      // paidAt + 24 horas
  
  createdAt:            timestamp("created_at").defaultNow(),
});
```

---

## 2️⃣ AGREGAR: Sección de Timeout de 24h

Andá a `6-SETUP-TIMEOUT.md`


## 3️⃣ CAMBIO: n8n Logging

**Dónde:** En la sección "🔗 Impacto en Cada Servicio"

**Cambiar:**
```
n8n Integration: SIGUE apuntando a MI DB (billing info) | 🟢 Sin cambio
```

**Por:**
```
n8n Integration: Conecta DIRECTO a cliente Supabase. 
                 En Fase 1: tabla n8n_workflows en cliente DB para logging.
                 Tú NO necesitas hacer nada en setup.
```

---

## 4️⃣ AGREGAR: Tabla n8n_workflows (en cliente DB)

**Dónde:** En "Schema CLIENTE — en SU Supabase"

**Agregar:**
```typescript
// n8n_workflows: logging de workflows ejecutados en cliente DB
export const n8mWorkflows = pgTable("n8m_workflows", {
  id:                 uuid("id").primaryKey().defaultRandom(),
  workflow_id:        varchar("workflow_id", { length: 100 }).notNull(),  // ID de n8n
  workflow_name:      varchar("workflow_name", { length: 200 }),
  trigger_type:       varchar("trigger_type", { length: 50 }),  // "incoming_message", "scheduled", etc.
  last_executed_at:   timestamp("last_executed_at"),
  execution_count:    integer("execution_count").default(0),
  is_active:          boolean("is_active").default(true),
  metadata_json:      jsonb("metadata_json"),  // Cualquier dato custom
  createdAt:          timestamp("created_at").defaultNow(),
});

// Índice para búsquedas rápidas
createIndex("idx_n8m_workflows_id")
  .on(n8mWorkflows.workflow_id);
```

---

## 5️⃣ CAMBIO: Setup Flow (de 5 páginas a 1 con tabs)

**Dónde:** En "Flujo: Onboarding del Cliente (Fase 1 modificada)"

**La actualización ya está hecha en ARCHITECTURE-CHANGES.md** ✅

Solo confirmar que dice:
- TAB 1: Conectar Base de Datos (validación en tiempo real, debounce 500ms)
- TAB 2: Inicializar Schema (ejecutar migraciones)
- TAB 3: Conectar Canales (≥1 requerido)
- TAB 4: Confirmación + Redirect a /inbox

---

## 6️⃣ CAMBIO: Validación de Cliente DB

**Dónde:** En "Validaciones de Seguridad"

**Agregar validación para NO aceptar service_role:**

```typescript
// 4. Validar que NO es service_role key (demasiado peligroso)
if (key.includes("service_role")) {
  showError("⚠️ Usa la key 'anon', no 'service_role'");
  return false;
}
```

---

## 7️⃣ AGREGAR: Error Handling en Tiempo Real

**Dónde:** En "Validaciones de Seguridad"

**Agregar después de la función de validación:**

```markdown
### Error Handling: Mensajes Genéricos

**Al cliente mostramos:**
```
"No se pudo conectar. Verifica URL y Key"
```

**En logs (servidor, NO al usuario):**
```typescript
console.error(`DB validation failed for org ${orgId}: ${error.message}`);
// Ejemplo: "DB validation failed: ECONNREFUSED 127.0.0.1:5432"
```

**Por qué genéricos:**
- Evitar exponer información sensible
- Seguridad
- El cliente sabe qué revisar (URL y Key son lo único que puede fallar)
```

---

## 8️⃣ CAMBIO: Rate Limiting

**Dónde:** En "Validaciones de Seguridad"

**Actualizar a:**

```markdown
### Rate Limiting: 5 intentos en 15 minutos

**En Redis:**
```typescript
KEY: `setup:validate-database:{userId}`
LIMIT: 5 intentos
WINDOW: 15 minutos
LOCKOUT: 1 hora (si supera límite)

// Response:
HTTP 429 Too Many Requests
{
  "error": "Demasiados intentos. Intenta de nuevo en 1 hora."
}
```

---

## 9️⃣ AGREGAR: Documentación en-app (Modal)

**Dónde:** En "Flujo: Setup - Conectar Base de Datos"

**Agregar:**

```markdown
### Modal: Ayuda para Obtener Credenciales

**Trigger:** Click en botón "?" al lado de los inputs

**Contenido:**

```
"¿Cómo obtener tu URL y API Key?"

1. Ve a https://app.supabase.com
2. Inicia sesión con tu cuenta
3. Crea un nuevo proyecto (el plan FREE está ok)
4. Ve a Settings → API
5. Copia el "Project URL"
6. Copia la "anon public" key (⚠️ NO "service_role")
7. Pégalas en los campos de abajo
8. Haz click en "Verificar Conexión"

⚠️ Importante:
- Nunca compartas tu API key públicamente
- La key "anon" es segura para cliente (lectura/escritura limitada)
- La key "service_role" es admin-only (NO uses)

[Button] Ver documentación oficial de Supabase →
```

**Implementación:**
- Modal component `HelpDatabaseSetupModal`
- Click en ? → open modal
- Close button o click outside
- Opción "No mostrar de nuevo" (guardar en localStorage)
```
## 🔟 AGREGAR: Tests de Setup (Fase 1)
Andá a `10-CAMBIOS-FINALES-TESTS-3.md`
