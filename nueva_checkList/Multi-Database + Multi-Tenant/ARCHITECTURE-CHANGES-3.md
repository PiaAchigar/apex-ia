

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

    // 2. Intentar conexión real
    const supabase = createClient(url, key);
    const { data, error } = await supabase.auth.getSession();
    
    if (error) throw error;

    // 3. Validar que la DB está accesible
    const { error: dbError } = await supabase
      .from("information_schema.tables")
      .select("*")
      .limit(1);

    if (dbError) throw dbError;

    return true;
  } catch (error) {
    console.error("Database validation failed:", error);
    return false;
  }
}
```



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
| Webhook handlers (WhatsApp, IG, etc) | Reciben `organizationId` en payload | 🟡 Moderada |

---

## 🧪 Tests Requeridos (Fase 1 modificada)

```typescript
// tests/unit/ClientDatabaseService.test.ts
describe("ClientDatabaseService", () => {
  it("debería encriptar y desencriptar credenciales correctamente")
  it("debería lanzar error si la URL no es válida")
  it("debería lanzar error si la API key no funciona")
})

// tests/integration/setup.routes.test.ts
describe("POST /setup/connect-database", () => {
  it("debería guardar credenciales encriptadas")
  it("debería validar que la DB es accesible")
  it("debería ejecutar migraciones en cliente DB")
})

// tests/integration/inbox.routes.test.ts (MODIFICADO)
describe("GET /[slug]/conversations", () => {
  it("debería traer conversaciones de LA SUPABASE DEL CLIENTE, no de la mía")
})
```

---

## ⚠️ Consideraciones de Performance

1. **Encriptación:** AES-256-GCM es ~1ms por operación. Acpetable.
2. **Pool de conexiones:** Crear un `Map` en memoria para cachear Drizzle instances:
   ```typescript
   const clientDbCache = new Map<UUID, Drizzle>();
   // Reutilizar conexión por orgId durante la sesión
   ```
3. **TTL del cache:** 15 minutos sin uso → liberar conexión.

---

## 📌 Resumen de Archivos a Crear/Modificar

### CREAR:
- `packages/database/schema/public/client_databases.ts` → Nueva tabla
- `apps/api/src/services/ClientDatabaseService.ts` → Encriptación
- `apps/api/src/db/database-provider.ts` → Resolución dinámico de DB
- `apps/api/src/routes/setup.routes.ts` → Onboarding flow
- `apps/api/src/utils/database-validation.ts` → Validaciones
- `apps/web/app/(app)/setup/` → Páginas de setup (4 pasos)

### MODIFICAR:
- `apps/api/src/middleware/tenantMiddleware.ts` → Agregar `organizationId` al contexto
- Todos los servicios (`InboxService`, `ContactsService`, etc.) → Recibir `organizationId`
- Todas las rutas → Pasar `organizationId` a servicios
- `.env.example` → Nuevas variables
- `CLAUDE.md` → Sección "Multi-Database Architecture"

---

## 🚀 Próximos Pasos

1. **Fase 1 (modificada):** Implementar setup flow + tabla `client_databases`
2. **Fase 2 onwards:** Todos los servicios ya reciben `organizationId` y usan cliente DB
3. **n8n:** Tus workflows conectarán directamente a cliente Supabase (sin pasar por tu API)

---

## 🔒 Checklist de Seguridad

- [ ] `CLIENT_DB_ENCRYPTION_KEY` está bien generada (32 bytes hex)
- [ ] Setup endpoints requieren JWT válido
- [ ] Credenciales se validan antes de guardar
- [ ] Rate limiting en `/setup/connect-database`
- [ ] Audit logs registran cada conexión exitosa de cliente DB
- [ ] CORS restringido: solo tu dominio + cliente API (si tienen)
- [ ] Validar que la API key del cliente es `anon`, no `service_role` (para seguridad)
