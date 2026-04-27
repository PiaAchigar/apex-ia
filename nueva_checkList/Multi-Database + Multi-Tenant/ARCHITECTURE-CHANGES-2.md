## 📝 Cambios en Rutas (routes)

**Antes:**
```typescript
// apps/api/src/routes/inbox.routes.ts
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
{
  "email": "admin@empresa.com",
  "password": "xxx",
  "organizationName": "Mi Empresa SAS"
}
→ Crear:
  - Usuario en Supabase Auth (mi instancia)
  - Fila en MI organizations table
  - Redirect a /billing/select-plan
```

### Paso 2: Select Plan
```
GET /billing/select-plan
[STARTER] [GROWTH] [BUSINESS]
→ Al elegir plan:
  - Crear Mercado Pago session
  - Redirect a Mercado Pago checkout
```

### Paso 3: Confirmar Pago + Setup Deadline
```
POST /webhooks/mercadoPago (webhook)
→ Actualizar organization.plan = "growth"
→ Setear setupDeadline = NOW() + 24 HOURS
→ Enviar email: "Tienes 24h para completar setup"
→ Redirect a /setup (página única con tabs)
```

### Paso 4: Setup - UNA PÁGINA CON 4 TABS (⭐ NUEVO)

**GET /setup**
→ Mostrar página única:

```
┌─────────────────────────────────────────────────┐
│  SETUP - Bienvenido a Apex IA                  │
│                                                 │
│  [TAB 1: Base de Datos] [TAB 2: Schema] ...   │
├─────────────────────────────────────────────────┤
│                                                 │
│  TAB 1: CONECTAR BASE DE DATOS                 │
│  ─────────────────────────────────────────     │
│                                                 │
│  Ingresa las credenciales de tu Supabase:     │
│                                                 │
│  [Input] URL:                                   │
│  https://xxx.supabase.co                       │
│  Real-time validation: ❌ / ✅                 │
│                                                 │
│  [Input] API Key:                              │
│  eyJxxx...                                     │
│  Real-time validation: ❌ / ✅                 │
│                                                 │
│  [Button ?] Ayuda → Modal con instrucciones   │
│                                                 │
│  [Button] Siguiente                            │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Validación en Tiempo Real (Debounce 500ms):**

```typescript
// Mientras escribe/pega, valida:
async function validateClientDatabaseWithDebounce(url, key) {
  clearTimeout(debounceTimer);
  
  debounceTimer = setTimeout(async () => {
    try {
      // 1. Validar formato URL (*.supabase.co)
      const urlObj = new URL(url);
      if (!urlObj.hostname.includes("supabase.co")) {
        showError("❌ URL debe ser de Supabase");
        return;
      }
      
      // 2. Intentar conexión real
      const supabase = createClient(url, key);
      const { error } = await supabase.auth.getSession();
      if (error) throw error;
      
      // 3. Validar acceso a DB
      const { error: dbError } = await supabase
        .from("information_schema.tables")
        .select("*")
        .limit(1);
      if (dbError) throw dbError;
      
      // 4. Validar que NO es service_role key
      if (key.includes("service_role")) {
        showError("⚠️ Usa key 'anon', no 'service_role'");
        return;
      }
      
      // ✅ Ok
      showSuccess("✅ Conexión válida");
      enableNextButton();
    } catch (error) {
      showError("No se pudo conectar. Verifica URL y Key");
      disableNextButton();
    }
  }, 500); // debounce
}
```

```
┌─────────────────────────────────────────────────┐
│  TAB 2: INICIALIZAR SCHEMA (DISABLED hasta ✅)  │
│  ──────────────────────────────────────────── │
│                                                 │
│  [Spinner] "Inicializando tu base de datos..."│
│                                                 │
│  Creando tablas (esto tarda ~10s):            │
│  ✅ conversations                              │
│  ✅ messages                                   │
│  ✅ contacts                                   │
│  ✅ deals                                      │
│  ✅ pipelines                                  │
│  ✅ tasks                                      │
│  ✅ flows                                      │
│  ✅ campaigns                                  │
│  ... (15 tablas total)                        │
│                                                 │
│  [Button] Siguiente (enabled cuando ✅ todo)  │
│                                                 │
└─────────────────────────────────────────────────┘
```

**POST /setup/initialize-schema**
```typescript
{
  "organizationId": "xxx",
  "supabaseUrl": "https://xxx.supabase.co",
  "supabaseKey": "eyJxxx..."
}
→ Validaciones:
  1. JWT válido + admin only
  2. setupDeadline aún no vencido
  3. URL + Key válidos (validar de nuevo)
  4. Encriptar y guardar en clientDatabases
  5. Ejecutar Drizzle migrations en cliente DB
  6. Si falla: error claro con detalles
  → Retorna: { success: true, tablesCreated: [...] }
```

```
┌─────────────────────────────────────────────────┐
│  TAB 3: CONECTAR CANALES (DISABLED hasta ✅)   │
│  ──────────────────────────────────────────── │
│                                                 │
│  Conecta al menos 1 canal para empezar:       │
│                                                 │
│  [ WhatsApp ] [ Instagram ] [ Telegram ]      │
│  [ Email ]    [ WebChat ]                     │
│                                                 │
│  (Click en cada uno → Modal de setup)         │
│                                                 │
│  Conectados: 0/8                              │
│  [Button] Siguiente (enabled si ≥1 conectado)│
│                                                 │
└─────────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────────┐
│  TAB 4: CONFIRMACIÓN (DISABLED hasta ✅)       │
│  ──────────────────────────────────────────── │
│                                                 │
│  ✅ Base de datos: {databaseName}             │
│  ✅ Schema: 15 tablas inicializadas           │
│  ✅ Canales: {conectados} conectados          │
│                                                 │
│  ¡Todo listo para empezar!                    │
│                                                 │
│  [Button] Ir a Inbox                          │
│  → Redirect a /[slug]/inbox                   │
│                                                 │
└─────────────────────────────────────────────────┘
```

Andá a "ARCHITECTURE-CHANGES-3.md"