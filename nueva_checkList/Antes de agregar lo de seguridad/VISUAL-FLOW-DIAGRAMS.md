# VISUAL-FLOW-DIAGRAMS.md
## Diagramas del Cambio Arquitectónico

---

## 1. ANTES vs AHORA: Dónde viven los datos

### ANTES (Centralizado)
```
┌─────────────────────────────────────────────┐
│        MI SUPABASE (Centralizado)           │
├─────────────────────────────────────────────┤
│ PUBLIC schema                               │
│ ├── organizations                           │
│ ├── users                                   │
│ ├── audit_logs                              │
│ └── billing_info                            │
├─────────────────────────────────────────────┤
│ TENANT SCHEMA: company_acme                 │
│ ├── conversations    ⬅️ DATOS DEL CLIENTE   │
│ ├── messages         ⬅️ EN MI DB            │
│ ├── contacts         ⬅️ AQUÍ (❌ PROBLEMA)  │
│ ├── deals                                   │
│ ├── pipelines                               │
│ └── tasks                                   │
├─────────────────────────────────────────────┤
│ TENANT SCHEMA: company_другой_cliente       │
│ ├── conversations                           │
│ ├── messages                                │
│ ├── contacts                                │
│ ├── deals                                   │
│ └── ... (repite para cada cliente)          │
└─────────────────────────────────────────────┘

❌ PROBLEMA:
- Yo controlo los datos del cliente
- Mi DB crece sin límite
- Facturo por conversaciones, pero el cliente no ve su datos como "suyo"
- Miedo sobre dónde están los datos
- n8n necesitaría acceso a mi DB (security nightmare)
```

---

### AHORA (Dual-Database)
```
┌─────────────────────────────────────┐
│      MI SUPABASE (Centralizado)     │
├─────────────────────────────────────┤
│ PUBLIC schema:                      │
│ ├── organizations                   │
│ │   └── id, slug, name, plan        │
│ │       (datos del cliente = empresa)│
│ ├── users                           │
│ │   └── (admin del cliente)         │
│ ├── audit_logs                      │
│ │   └── (quien hizo qué en mi API)  │
│ ├── billing_info / stripe_events    │
│ └── client_databases ⭐ NUEVO       │
│     ├── organizationId              │
│     ├── encryptedSupabaseUrl        │
│     ├── encryptedSupabaseKey        │
│     ├── isActive                    │
│     └── lastConnectionTest          │
└─────────────────────────────────────┘
         ⬇️ guarda credenciales
         ⬇️ ENCRIPTADAS
         ⬇️ apunta a...


┌─────────────────────────────────────┐
│   CLIENTE SUPABASE (Su Instancia)   │
├─────────────────────────────────────┤
│ PUBLIC schema:                      │
│ ├── conversations    ⬅️ DATOS SUYOS │
│ ├── messages         ⬅️ EN SU DB    │
│ ├── contacts         ⬅️ RESPONSAB. │
│ ├── deals            ⬅️ SUYA      │
│ ├── pipelines                       │
│ ├── tasks                           │
│ ├── flows                           │
│ ├── campaigns                       │
│ ├── channel_credentials             │
│ └── call_logs                       │
└─────────────────────────────────────┘

✅ VENTAJAS:
+ El cliente controla sus datos
+ Mi DB es pequeña y simple
+ n8n se conecta directamente a cliente DB (no pasa por mi API)
+ Escalabilidad: no me importa cuántos datos tenga
+ Seguridad: credenciales encriptadas
+ Backup/restore lo maneja el cliente
```

---

## 2. FLUJO DE SETUP (Fase 1): Cliente da sus credenciales

```
┌─────────────────────────────────────────────────────────────────┐
│                   CLIENTE = USUARIO FINAL                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ PASO 1: Register                                                │
│ Email: admin@empresa.com                                        │
│ Password: xxxxx                                                 │
│ Org Name: "Mi Empresa SAS"                                     │
└─────────────────────────────────────────────────────────────────┘
           │
           ▼
    ✅ POST /auth/register
           │
           ├─ Crear user en MI Supabase Auth
           ├─ Crear row en organizations (MI DB)
           └─ Redirect a /billing/select-plan
           
           ▼
┌─────────────────────────────────────────────────────────────────┐
│ PASO 2: Eligir Plan                                             │
│ [ STARTER FREE ] [ GROWTH $49 ] [ BUSINESS $149 ]              │
└─────────────────────────────────────────────────────────────────┘
           │
           ├─ Cliente elige → POST /billing/select-plan
           │
           ▼
    💳 Redirigir a MercadoPago Checkout
           │
           ▼ (Cliente paga)
           │
    ✅ Webhook: POST /webhooks/mercadoPago
           │
           ├─ Crear MercadoPago customer
           ├─ Update organizations.plan
           ├─ Generar JWT temporal para setup
           └─ Redirect a /setup/connect-database
           
           ▼
┌─────────────────────────────────────────────────────────────────┐
│ PASO 3: Conectar Base de Datos ⭐ NUEVO                        │
│                                                                 │
│ "Ingresa las credenciales de tu Supabase"                      │
│                                                                 │
│ [Input] URL: https://xxx.supabase.co                           │
│ [Input] API Key: eyJxxx...                                     │
│ [Button] Verificar Conexión                                    │
│                                                                 │
│ (cliente va a Supabase, copia valores, pega aquí)             │
└─────────────────────────────────────────────────────────────────┘
           │
    ✅ POST /setup/connect-database
           │
           ├─ Validar formato URL (*.supabase.co)
           ├─ Intentar conectar (¿puedo hacer SELECT?)
           ├─ Si falla → mostrar error claro
           └─ Si ok:
               ├─ Encriptar URL + Key con AES-256-GCM
               ├─ Guardar en MI clientDatabases table
               ├─ Seteá isActive = true
               └─ Redirect a /setup/initialize-schema
               
           ▼
┌─────────────────────────────────────────────────────────────────┐
│ PASO 4: Inicializar Schema en Cliente DB ⭐ NUEVO              │
│                                                                 │
│ "Inicializando tu base de datos..."                            │
│ [Spinner]                                                       │
│                                                                 │
│ (ejecutando migraciones Drizzle en su DB)                      │
└─────────────────────────────────────────────────────────────────┘
           │
    ✅ POST /setup/initialize-schema
           │
           ├─ Resolver cliente DB (desde clientDatabases)
           ├─ Ejecutar Drizzle migrations:
           │  ├─ conversations
           │  ├─ messages
           │  ├─ contacts
           │  ├─ deals
           │  ├─ ... (todas las tablas)
           │  └─ Audit: log en MI audit_logs
           └─ Redirect a /setup/channels
           
           ▼
┌─────────────────────────────────────────────────────────────────┐
│ PASO 5: Conectar Canales                                        │
│                                                                 │
│ [ WhatsApp ] [ Instagram ] [ Telegram ] [ Email ] [ WebChat ] │
│                                                                 │
│ (click en un canal → popup para agregar API keys)              │
└─────────────────────────────────────────────────────────────────┘
           │
    ✅ POST /setup/channels (para cada canal)
           │
           ├─ Encriptar credenciales de canal
           ├─ Guardar en clientDatabases (relación 1:N)
           │  O en tabla separada channel_credentials (cliente DB)
           └─ Verificar conectividad (ej: WhatsApp test message)
           
           ▼
┌─────────────────────────────────────────────────────────────────┐
│ ✅ SETUP COMPLETADO                                             │
│                                                                 │
│ Redirect a /[slug]/inbox                                        │
│                                                                 │
│ Cliente ahora VE:                                               │
│ - Su workspace (logo, nombre, plan)                            │
│ - Inbox (mensajes de contactos)                                │
│ - Analytics, etc.                                               │
│                                                                 │
│ Los datos viven en SU Supabase ✅                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. ENCRIPTACIÓN: ¿Cómo guardamos las credenciales?

```
┌────────────────────────────────────────────────────────────────────┐
│ PASO 1: Cliente da sus credenciales (PLAIN TEXT en HTTP)          │
├────────────────────────────────────────────────────────────────────┤
│ POST /setup/connect-database                                       │
│ {                                                                  │
│   "supabaseUrl": "https://abcd1234.supabase.co",     ⬅️ PLAIN   │
│   "supabaseKey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."       │
│ }                                                                  │
│                                                                    │
│ ⚠️ HTTPS protege en tránsito                                      │
└────────────────────────────────────────────────────────────────────┘
                              ▼
                    (en MI servidor)
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ PASO 2: Encriptar con AES-256-GCM                                 │
├────────────────────────────────────────────────────────────────────┤
│ plaintext = "https://abcd1234.supabase.co"                         │
│                                                                    │
│ KEY = Buffer.from(process.env.CLIENT_DB_ENCRYPTION_KEY, "hex")   │
│       ⬅️ 32 bytes, guardado seguro en ENV                         │
│                                                                    │
│ IV (Initialization Vector) = crypto.randomBytes(16)              │
│    ⬅️ Aleatorio cada vez, diferente por cada credencial          │
│                                                                    │
│ cipher = crypto.createCipheriv("aes-256-gcm", KEY, IV)           │
│ encrypted = cipher.update(plaintext, "utf8", "hex")              │
│ authTag = cipher.getAuthTag()  ⬅️ Verificación de integridad    │
│                                                                    │
│ RESULTADO:                                                         │
│ "a1b2c3d4e5f6....:7f8g9h0i1j2k....:x1y2z3w4..."                 │
│  ⬆️                  ⬆️               ⬆️                          │
│  IV                 AuthTag          Ciphertext                   │
└────────────────────────────────────────────────────────────────────┘
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ PASO 3: Guardar en MI Supabase (ENCRYPTED)                        │
├────────────────────────────────────────────────────────────────────┤
│ INSERT INTO client_databases VALUES (                              │
│   id: '550e8400-e29b-41d4-a716-446655440000',                    │
│   organizationId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',        │
│   encryptedSupabaseUrl: 'a1b2c3d4e5f6....', ⬅️ ENCRIPTADO       │
│   encryptedSupabaseKey: '7f8g9h0i1j2k....',  ⬅️ ENCRIPTADO       │
│   isActive: true,                                                 │
│   createdAt: NOW(),                                               │
│   ...                                                             │
│ );                                                                 │
│                                                                    │
│ 🔒 En reposo: datos protegidos en MI DB                          │
│ 🗝️ Solo MI servidor (con CLIENT_DB_ENCRYPTION_KEY) puede leer   │
└────────────────────────────────────────────────────────────────────┘
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ PASO 4: Cuando necesitamos conectar a cliente DB                  │
├────────────────────────────────────────────────────────────────────┤
│ GET /conversations (cliente pide conversaciones)                   │
│                                                                    │
│ ✅ Verify JWT (es usuario válido)                                │
│ ✅ Get organizationId from token                                  │
│                                                                    │
│ SELECT * FROM client_databases WHERE organizationId = ?          │
│ ⬅️ Obtengo el registro encriptado                                │
│                                                                    │
│ decrypter = crypto.createDecipheriv("aes-256-gcm", KEY, IV)     │
│ plaintext = decrypter.update(ciphertext, "hex", "utf8")          │
│ ✅ Verificar authTag (garantiza que NO fue modificado)          │
│                                                                    │
│ Ahora tengo:                                                      │
│ - supabaseUrl = "https://abcd1234.supabase.co"                   │
│ - supabaseKey = "eyJxxx..."                                      │
│                                                                    │
│ Crear cliente:                                                    │
│ clientSupabase = createClient(supabaseUrl, supabaseKey)          │
│                                                                    │
│ Usar para:                                                        │
│ const conversations = await clientSupabase                        │
│   .from("conversations")                                          │
│   .select("*")                                                    │
│   .eq("assigned_agent_id", userId)                               │
│                                                                    │
│ ✅ Retorna datos de SU DB, no de la mía                          │
└────────────────────────────────────────────────────────────────────┘
```

---

## 4. REQUEST FLOW: Cómo fluye un request desde cliente hacia sus datos

```
┌─────────────────────┐
│   CLIENTE (UI)      │
│                     │
│ Usuario clickea:    │
│ "Ver Conversaciones"│
└──────────┬──────────┘
           │
           │ GET /[slug]/conversations
           │ Authorization: Bearer JWT_TOKEN
           ▼
┌─────────────────────────────────────────────────────────────────┐
│         MI API (Hono)                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 1️⃣  authMiddleware                                             │
│     ├─ Verifica JWT (firma con MI Supabase Auth)               │
│     ├─ Extrae userId                                           │
│     └─ c.set("userId", userId)                                │
│                                                                 │
│ 2️⃣  tenantMiddleware                                           │
│     ├─ Lee slug de URL (/acme/conversations)                  │
│     ├─ Busca organization por slug (en MI DB)                 │
│     ├─ ✅ Encontrado → organizationId = "xxx"                  │
│     ├─ c.set("organizationId", organizationId)                │
│     └─ c.set("slug", "acme")                                  │
│                                                                 │
│ 3️⃣  Route handler                                              │
│     │                                                          │
│     └─ router.get("/conversations", async (c) => {            │
│        │                                                       │
│        │ const userId = c.get("userId")                       │
│        │ const orgId = c.get("organizationId")               │
│        │                                                       │
│        │ // Esto es lo nuevo:                                 │
│        │ const conversations =                                │
│        │   await inboxService.getConversationsForAgent(      │
│        │     orgId,    ⬅️ Ahora pasamos orgId                │
│        │     userId                                           │
│        │   )                                                  │
│        │                                                       │
│        │ return c.json(conversations)                        │
│        │})                                                    │
│                                                                 │
└──────────┬──────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│      InboxService.getConversationsForAgent()                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ async getConversationsForAgent(                                │
│   organizationId,    ⬅️ Recibe orgId                           │
│   agentId                                                      │
│ ) {                                                             │
│                                                                 │
│   // ⭐ Aquí está el CAMBIO:                                   │
│   const clientDb = await this.databaseProvider                │
│     .getClientDrizzle(organizationId)                         │
│     ⬅️ Resuelve dinámicamente la DB del cliente               │
│                                                                 │
│   // Consultar en SU DB, no en la mía                          │
│   return clientDb                                              │
│     .select()                                                  │
│     .from(conversations)                                       │
│     .where(                                                    │
│       eq(conversations.assigned_agent_id, agentId)            │
│     )                                                          │
│ }                                                               │
│                                                                 │
└──────────┬──────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│      DatabaseProvider.getClientDrizzle()                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ async getClientDrizzle(organizationId) {                       │
│                                                                 │
│   // 1. Buscar en MI DB                                        │
│   const creds = await clientDatabasesQuery                    │
│     .where(eq(client_databases.organization_id, organizationId))
│                                                                 │
│   if (!creds.isActive) throw Error(...)                       │
│                                                                 │
│   // 2. Desencriptar credenciales                              │
│   const supabaseUrl = this.decryptValue(                       │
│     creds.encryptedSupabaseUrl                                │
│   )                                                             │
│   const supabaseKey = this.decryptValue(                       │
│     creds.encryptedSupabaseKey                                │
│   )                                                             │
│                                                                 │
│   // 3. Crear cliente de CLIENTE Supabase                      │
│   const clientSupabase = createClient(                         │
│     supabaseUrl,   ⬅️ URL de CLIENTE                           │
│     supabaseKey    ⬅️ KEY de CLIENTE                           │
│   )                                                             │
│                                                                 │
│   // 4. Crear Drizzle instance apuntando a su DB              │
│   return drizzle(clientSupabase, { schema })                  │
│ }                                                               │
│                                                                 │
└──────────┬──────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│   CLIENTE SUPABASE (la instancia del cliente)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ SELECT * FROM conversations                                    │
│ WHERE assigned_agent_id = 'user-123'                           │
│                                                                 │
│ ✅ Devuelve datos de SU DB, no de la mía                      │
│ ✅ Client nunca toca MI base de datos                          │
│                                                                 │
└──────────┬──────────────────────────────────────────────────────┘
           │
           ▼ (datos)
┌─────────────────────────────────────────────────────────────────┐
│        MI API (empaqueta respuesta)                             │
│                                                                 │
│ {                                                               │
│   "conversations": [                                           │
│     { id: "123", contactId: "456", channel: "whatsapp", ... },│
│     { id: "789", contactId: "321", channel: "instagram", ...},│
│   ]                                                             │
│ }                                                               │
│                                                                 │
└──────────┬──────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│   CLIENTE (UI)                                                  │
│                                                                 │
│ Muestra conversaciones en el inbox ✅                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. n8n Integration: Cómo se conecta n8n al cliente

```
┌──────────────────────────────────────────────────────────────────┐
│              n8n (Automaciones del Cliente)                      │
│                                                                  │
│  Workflow: "Enviar WhatsApp cuando llega email"                │
│                                                                  │
│  [Trigger: Email] → [Action: Send WhatsApp]                    │
└──────────────────┬───────────────────────────────────────────────┘
                   │
                   │ El cliente configura n8n con:
                   │ - CLIENTE Supabase URL
                   │ - CLIENTE Supabase Key
                   │ (NO necesita pasar por tu API)
                   │
                   ▼
┌──────────────────────────────────────────────────────────────────┐
│          CLIENTE SUPABASE (conexión directa)                     │
│                                                                  │
│  n8n.nodes.Supabase:                                            │
│  {                                                               │
│    "url": "https://acme.supabase.co",     ⬅️ Directo del cliente
│    "key": "eyJ...",                        ⬅️ Directo del cliente
│  }                                                               │
│                                                                  │
│  INSERT INTO messages (conversation_id, content, senderType)   │
│  VALUES (...) ⬅️ Envía mensaje a SU DB                         │
│                                                                  │
└──────────────────┬───────────────────────────────────────────────┘
                   │
                   ▼
             ✅ Message aparece en inbox
             (n8n + cliente DB, sin pasar por tu API)

┌──────────────────────────────────────────────────────────────────┐
│  MI API (solo si el mensaje necesita procesamiento especial)    │
│                                                                  │
│  Ejemplo: si n8n necesita validar con tu AI antes de enviar    │
│  → POST /ai/validate-message (llama a tu API)                  │
│  ← Retorna validación                                           │
│  → n8n continúa con el envío                                   │
│                                                                  │
│  O: si n8n quiere notificarte (webhook para analítica)         │
│  → POST /analytics/track (tu API guarda en MI DB)              │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

✅ FLUJO: n8n → CLIENTE DB (directo)
         Ocasionalmente → TU API (para procesamiento especial)

⚠️ Nota: Credenciales de cliente NO pasan por tu API
         El cliente las guarda EN n8n
         Seguridad: cada cliente es independiente
```

---

## 6. Matriz: Quién Accede a Qué

```
┌─────────────────────┬────────────────┬──────────────┬──────────────┐
│    Componente       │   MI DB        │  Cliente DB  │   Notas      │
├─────────────────────┼────────────────┼──────────────┼──────────────┤
│ Frontend (SPA)      │ ✅ Auth (JWT)  │ ❌ Indirecto │ Via mi API   │
│                     │ ✅ Org info    │              │              │
├─────────────────────┼────────────────┼──────────────┼──────────────┤
│ Mi API (Hono)       │ ✅ Billing     │ ✅ Direct    │ Operacional  │
│                     │ ✅ Users       │              │ (conversations│
│                     │ ✅ Audit logs  │              │  etc)        │
├─────────────────────┼────────────────┼──────────────┼──────────────┤
│ n8n Workflows       │ ❌ NO          │ ✅ Direct    │ Directo      │
│ (cliente)           │                │              │ a su BD      │
├─────────────────────┼────────────────┼──────────────┼──────────────┤
│ Cliente (direct)    │ ❌ NO          │ ✅ Direct    │ Si quiere    │
│                     │                │              │ conectarse   │
├─────────────────────┼────────────────┼──────────────┼──────────────┤
│ Webhooks            │ ✅ Audit       │ ✅ Create    │ WhatsApp,    │
│ (WhatsApp, etc)     │                │  conversations│ IG, etc      │
└─────────────────────┴────────────────┴──────────────┴──────────────┘
```

---

## 7. Timeline: Cuándo se encriptan, desencriptan, acceden datos

```
TIEMPO          ACCIÓN                              DÓNDE              SEGURIDAD
─────           ─────                              ──────             ─────────

T=0:00          Cliente hace POST                  HTTPS              ✅ Encriptado
                /setup/connect-database            en tránsito
                con URL + Key PLAIN TEXT

T=0:05          Mi servidor recibe                 RAM en             ✅ Solo
                → validar → encriptar             mi servidor        breve momento

T=0:10          Guardar ENCRYPTED en               MI DB              ✅ AES-256-GCM
                MI Supabase                        (en reposo)

T=0:15          ~ 1 hora después ~                 (reposo)           ✅ Aún encriptado
                Cliente usa su workspace

T=0:20          Usuario hace click                 (reposo)           ✅ Aún encriptado
                "Ver conversaciones"

T=0:25          Mi API:                            MI RAM             ✅ Desencripto
                1. Obtener registro                (breve)            brevemente
                2. Desencriptar credenciales
                3. Crear cliente Supabase
                4. Consultar cliente DB
                5. Retornar datos

T=0:30          Response llega a cliente           HTTPS              ✅ Encriptado
                (conversaciones)

T=0:35          Cliente muestra datos              Cliente             ✅ En el browser
                                                   del usuario        del usuario
```

---

## 8. Seguridad: Checklist

```
┌─ ENCRIPTACIÓN ──────────────────────────────────┐
│ ✅ AES-256-GCM (industria estándar)            │
│ ✅ IV único por cada credencial                │
│ ✅ AuthTag para verificar integridad           │
│ ✅ KEY en variable de entorno (no en código)   │
└─────────────────────────────────────────────────┘

┌─ ACCESO ────────────────────────────────────────┐
│ ✅ JWT requerido para todas las rutas          │
│ ✅ Solo admin puede ver credenciales           │
│ ✅ Rate limiting en setup endpoints            │
│ ✅ CORS restringido a tu dominio               │
└─────────────────────────────────────────────────┘

┌─ DATOS EN TRÁNSITO ─────────────────────────────┐
│ ✅ HTTPS obligatorio                           │
│ ✅ Certificate pinning (opcional en producción)│
│ ✅ No se guardan keys en logs                  │
└─────────────────────────────────────────────────┘

┌─ DATOS EN REPOSO ───────────────────────────────┐
│ ✅ Credenciales encriptadas en MY DB           │
│ ✅ Datos operacionales en cliente DB (su     │
│   responsabilidad)                             │
│ ✅ Backups de MI DB también encriptados       │
└─────────────────────────────────────────────────┘

┌─ VALIDACIÓN ────────────────────────────────────┐
│ ✅ URL debe ser *.supabase.co                 │
│ ✅ Key debe ser "anon", no "service_role"    │
│ ✅ Test de conexión ANTES de guardar         │
│ ✅ Connection timeout: 30s máximo             │
└─────────────────────────────────────────────────┘
```

---

## 📌 Resumen Visual Rápido

**ANTES:** Un monstruo de DB gigante
```
┌──────────────────────────────────────┐
│  MI SUPABASE (CENTRALIZADO)          │
│  ├─ Organizations                    │
│  ├─ Users                            │
│  ├─ Conversations (Cliente A)        │ ← TOO MUCH DATA
│  ├─ Conversations (Cliente B)        │ ← TOO MUCH DATA
│  ├─ Conversations (Cliente C)        │ ← TOO MUCH DATA
│  └─ ... (multiplicado x 1000s)      │
└──────────────────────────────────────┘
```

**AHORA:** Arquitectura limpia y escalable
```
┌────────────────────────────────────────┐
│     MI SUPABASE (Centralizado)         │
│     ├─ Organizations                   │
│     ├─ Users                           │ ← Compacto
│     ├─ Billing                         │
│     └─ client_databases (encriptado)   │
│        ├─ apunta a Cliente A Supabase ─┐
│        ├─ apunta a Cliente B Supabase ─┼──┐
│        └─ apunta a Cliente C Supabase ─┼──┼──┐
└────────────────────────────────────────┘   │  │
                                             │  │
    ┌────────────────────────┐              │  │
    │ Cliente A Supabase     │◄─────────────┘  │
    │ (sus datos)            │                 │
    └────────────────────────┘                 │
                                              │  │
         ┌────────────────────────┐            │
         │ Cliente B Supabase     │◄───────────┘
         │ (sus datos)            │
         └────────────────────────┘
                                  │
             ┌────────────────────────┐
             │ Cliente C Supabase     │◄──────
             │ (sus datos)            │
             └────────────────────────┘

✅ Escalable
✅ Seguro
✅ Responsabilidad clara
```
