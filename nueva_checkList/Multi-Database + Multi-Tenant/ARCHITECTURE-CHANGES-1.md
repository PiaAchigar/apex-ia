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
│   └── client_databases    ✅✅✅ NUEVO: credenciales encriptadas del cliente
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

// También índice:
createIndex("idx_client_databases_org_id")
  .on(clientDatabases.organizationId)
  .using("btree");
```

**Campos eliminados de `organizations`:**
- Antes: `organizations` NO tenía `databaseUrl`
- Ahora: También NO la tendrá; vivirá encriptada en `client_databases`

---

## 🔐 Estrategia de Encriptación

**Opción seleccionada: A (recomendada para SaaS)**

```typescript
// apps/api/src/services/ClientDatabaseService.ts

import crypto from "crypto";

class ClientDatabaseService {
  // ENCRYPTION_KEY debe ser 32 bytes hex (nueva variable de entorno)
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

## 🔌 Patrón: Cliente Supabase en cada Servicio

**Problema:** `InboxService`, `ContactsService`, etc. actualmente apuntan a MI Supabase.

**Solución:** Crear un `DatabaseProvider` que resuelve dinámicamente la DB del cliente.

```typescript
// apps/api/src/db/database-provider.ts

class DatabaseProvider {
  async getClientDatabase(organizationId: UUID) {
    const creds = await new ClientDatabaseService().getClientDatabaseConnection(
      organizationId
    );
    
    // Crear cliente Supabase del cliente en tiempo de ejecución
    return createClient(creds.url, creds.key, {
      auth: { persistSession: false },
    });
  }

  async getClientDrizzle(organizationId: UUID) {
    const supabaseClient = await this.getClientDatabase(organizationId);
    return drizzle(supabaseClient, {
      schema: { /* schema del cliente */ },
    });
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
    // Resolver DB del cliente
    const clientDb = await this.databaseProvider.getClientDrizzle(organizationId);

    // Usar clientDb en lugar de este.db
    return clientDb
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.assignedAgentId, agentId),
          /* filtros */
        )
      );
  }
}
```

---

Andá a "ARCHITECTURE-CHANGES-2.md"