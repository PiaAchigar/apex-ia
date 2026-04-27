## ✂️ SECCIÓN 2: Schema de Base de Datos

**ANTES:** Había 3 subsecciones:
1. Schema público
2. Schema por tenant (`company_{slug}`)

**DESPUÉS:** Cambiar a:

```markdown
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
  createdAt:            timestamp("created_at").defaultNow(),
});

// users: solo administradores y usuarios del cliente (en MI instancia)
export const users = pgTable("users", {
  id:             uuid("id").primaryKey(),               // mismo id que Supabase Auth
  organizationId: uuid("organization_id").references(() => organizations.id),
  email:          varchar("email", { length: 255 }).notNull(),
  fullName:       varchar("full_name", { length: 100 }),
  role:           text("role").default("admin"),         // admin | user
  permissionsJson: jsonb("permissions_json"),
  createdAt:      timestamp("created_at").defaultNow(),
});

// audit_logs: registro de acciones en MI plataforma (facturación, setup, etc.)
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
  id:                   uuid("id").primaryKey().defaultRandom(),
  organizationId:       uuid("organization_id")
                          .notNull()
                          .references(() => organizations.id, { onDelete: "cascade" }),
  encryptedSupabaseUrl: text("encrypted_supabase_url").notNull(),  // AES-256-GCM
  encryptedSupabaseKey: text("encrypted_supabase_key").notNull(),  // AES-256-GCM
  databaseName:         varchar("database_name", { length: 100 }),
  isActive:             boolean("is_active").default(true),
  lastConnectionTest:   timestamp("last_connection_test"),
  lastConnectionSuccess: boolean("last_connection_success"),
  createdAt:            timestamp("created_at").defaultNow(),
  updatedAt:            timestamp("updated_at").defaultNow(),
});
```

### 2️⃣ Schema CLIENTE — en SU Supabase (su instancia)

Todas las tablas operacionales (conversations, messages, contacts, deals, pipelines, tasks, flows, campaigns, templates, channel_credentials, call_logs) se crean en la Supabase DEL CLIENTE.

Ver: ARCHITECTURE-CHANGES.md → "Cambio Conceptual" para diagrama.

**Nota importante:** Las migraciones Drizzle se ejecutan contra cliente Supabase durante el setup (Fase 1, paso 5).
```

