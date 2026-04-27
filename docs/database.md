
### Base de Datos: Arquitectura Dual

#### MI Supabase (centralizado)
- **PostgreSQL 16** para: organizations, users, billing, audit logs
- **Supabase Auth** para autenticación (email/password + magic link)
- **Tabla `client_databases`** con credenciales encriptadas (AES-256-GCM) de cliente Supabase
- **Supabase Storage** para archivos de la plataforma (logos, etc.)
- **Drizzle ORM** apunta a `DATABASE_URL` de MI Supabase
- **Supabase Realtime** como complemento de Socket.io para notificaciones

#### CLIENTE Supabase (su propia instancia)
- **PostgreSQL 16** gestionado por el cliente
- **Datos operacionales:** conversations, messages, contacts, deals, pipelines, tasks, flows, campaigns
- **Responsabilidad del cliente:** backups, performance, crecimiento de datos
- **Conexión:** a través de credenciales (URL + Anon Key) almacenadas encriptadas en MI tabla `client_databases`

**Ver:** `docs/ARCHITECTURE-CHANGES.md` para detalles técnicos.

Variables de entorno requeridas para Supabase:
```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=                 # connection string para Drizzle (MI Supabase)
CLIENT_DB_ENCRYPTION_KEY=     # 32 bytes hex para AES-256-GCM (credenciales cliente)
```

## Schema de Base de Datos

### 1️⃣ Schema PÚBLICO — en MI Supabase (centralizado)

```typescript
// organizations: una fila por empresa cliente (cliente mío)
export const organizations = pgTable("organizations", {
  id:                   uuid("id").primaryKey().defaultRandom(),
  slug:                 varchar("slug", { length: 50 }).unique().notNull(),
  name:                 varchar("name", { length: 100 }).notNull(),
  plan:                 text("plan").default("starter"),  // starter | growth | business
  stripeCustomerId:     varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),

  // Mercado Pago
  mpCustomerId:         varchar("mp_customer_id"),
  mpSubscriptionId:     varchar("mp_subscription_id"),
  mpStatus:             text("mp_status").default("active"),  // active | paused | cancelled

  // Setup Timeline
  paidAt:               timestamp("paid_at"),              // Cuándo confirmó pago
  setupCompletedAt:     timestamp("setup_completed_at"),  // Cuándo completó setup
  setupDeadline:        timestamp("setup_deadline"),      // paidAt + 24 horas
  isSetupBlocked:       boolean("is_setup_blocked").default(false),

  createdAt:            timestamp("created_at").defaultNow(),
});

// users: solo administradores y usuarios del cliente (en MI instancia)
export const users = pgTable("users", {
  id:             uuid("id").primaryKey(),               // mismo id que Supabase Auth
  organizationId: uuid("organization_id").references(() => organizations.id),
  email:          varchar("email", { length: 255 }).notNull(),
  fullName:       varchar("full_name", { length: 100 }),
  role:           text("role").default("admin"),         // admin | agent
  permissionsJson: jsonb("permissions_json"),
  createdAt:      timestamp("created_at").defaultNow(),
});

// audit_logs: registro de acciones en MI plataforma
export const auditLogs = pgTable("audit_logs", {
  id:           uuid("id").primaryKey().defaultRandom(),
  userId:       uuid("user_id"),
  action:       varchar("action", { length: 100 }).notNull(),  // "setup_database", "upgrade_plan", etc.
  resourceType: varchar("resource_type", { length: 50 }),
  resourceId:   uuid("resource_id"),
  oldValuesJson: jsonb("old_values_json"),
  newValuesJson: jsonb("new_values_json"),
  ipAddress:    varchar("ip_address", { length: 45 }),
  createdAt:    timestamp("created_at").defaultNow(),
});

// client_databases: credenciales encriptadas de cliente Supabase ⭐ NUEVO
export const clientDatabases = pgTable("client_databases", {
  id:                    uuid("id").primaryKey().defaultRandom(),
  organizationId:        uuid("organization_id")
                           .notNull()
                           .references(() => organizations.id, { onDelete: "cascade" }),
  encryptedSupabaseUrl:  text("encrypted_supabase_url").notNull(),  // AES-256-GCM
  encryptedSupabaseKey:  text("encrypted_supabase_key").notNull(),  // AES-256-GCM (anon key)
  databaseName:          varchar("database_name", { length: 100 }),
  isActive:              boolean("is_active").default(true),
  lastConnectionTest:    timestamp("last_connection_test"),
  lastConnectionSuccess: boolean("last_connection_success"),
  createdAt:             timestamp("created_at").defaultNow(),
  updatedAt:             timestamp("updated_at").defaultNow(),
});
```

### 2️⃣ Schema CLIENTE — en SU Supabase (su propia instancia)

Todas las tablas operacionales se crean en la Supabase DEL CLIENTE durante el setup (Fase 1, Paso 5).

```typescript
// conversations, messages, contacts, deals, pipelines, tasks,
// flows, campaigns, templates, channel_credentials, call_logs, analytics_events

// n8m_workflows: logging de workflows n8n ejecutados en cliente DB ⭐ NUEVO
export const n8mWorkflows = pgTable("n8m_workflows", {
  id:               uuid("id").primaryKey().defaultRandom(),
  workflowId:       varchar("workflow_id", { length: 100 }).notNull(),  // ID de n8n
  workflowName:     varchar("workflow_name", { length: 200 }),
  triggerType:      varchar("trigger_type", { length: 50 }),  // "incoming_message", "scheduled", etc.
  lastExecutedAt:   timestamp("last_executed_at"),
  executionCount:   integer("execution_count").default(0),
  isActive:         boolean("is_active").default(true),
  metadataJson:     jsonb("metadata_json"),
  createdAt:        timestamp("created_at").defaultNow(),
});
```

**Nota importante:** Las migraciones Drizzle se ejecutan contra cliente Supabase durante el setup.
n8n Integration conecta DIRECTO a cliente Supabase (no pasa por la API de Apex IA).
