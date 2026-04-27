# HOW-TO-UPDATE-CLAUDE.md
## Modificaciones Específicas a CLAUDE.md (SIN reescribir todo)

---

## ✂️ SECCIÓN 1: Database (líneas ~60-71)

**ANTES:**
```markdown
### Base de Datos: Supabase (OBLIGATORIO)
- **PostgreSQL 16** gestionado por Supabase
- **Supabase Auth** para autenticación (email/password + magic link)
- **Supabase Storage** para archivos y media (reemplaza MinIO)
- **Multi-tenancy** mediante schema-per-tenant: `company_{slug}`
```

**DESPUÉS:** (reemplaza eso con)
```markdown
### Base de Datos: Arquitectura Dual

#### Mi Supabase (centralizado)
- **PostgreSQL 16** para: organizations, users, billing, audit logs
- **Supabase Auth** para autenticación (email/password + magic link)
- **Tabla `client_databases`** con credenciales encriptadas (AES-256-GCM) de cliente Supabase
- **Supabase Storage** para archivos de la plataforma (logos, etc.)

#### Cliente Supabase (su propia instancia)
- **PostgreSQL 16** gestionado por el cliente
- **Datos operacionales:** conversations, messages, contacts, deals, pipelines, tasks, flows, campaigns
- **Responsabilidad del cliente:** backups, performance, crecimiento de datos
- **Conexión:** a través de credenciales (URL + Anon Key) almacenadas encriptadas en MI tabla `client_databases`

**Ver:** `ARCHITECTURE-CHANGES.md` para detalles técnicos.
```

---
## ✂️ SECCIÓN 2: Schema de Base de Datos
Anda a `3-HOW-TO.UPDATE-SECCION.md`

## ✂️ SECCIÓN 3: Middleware (líneas ~184-188)

**ANTES:**
```typescript
├── middleware/
│   ├── authMiddleware.ts          → Verifica JWT de Supabase Auth
│   ├── tenantMiddleware.ts        → Detecta slug, establece schema activo
```

**DESPUÉS:**
```typescript
├── middleware/
│   ├── authMiddleware.ts          → Verifica JWT de Supabase Auth (MI instancia)
│   ├── tenantMiddleware.ts        → Detecta slug, resuelve cliente Supabase en contexto
                                     → Seteá organizationId en c.get("organizationId")
```

---
## ✂️ SECCIÓN 4: Servicios (líneas ~228-260)

**ANTES:**
```typescript
├── services/
│   ├── InboxService.ts
│   ├── ConversationService.ts
│   ├── ContactsService.ts
│   ├── PipelineService.ts
│   ├── ... (todos usan this.db = MI Supabase)
```

**DESPUÉS:** (agregar esta nota)
```typescript
├── services/
│   ├── ClientDatabaseService.ts           ⭐ NUEVO
│   │   └── Encriptación / desencriptación credenciales cliente
│   ├── InboxService.ts
│   │   └── ⚠️ Recibe organizationId, resuelve cliente Supabase
│   ├── ConversationService.ts
│   │   └── ⚠️ Recibe organizationId, resuelve cliente Supabase
│   ├── ContactsService.ts
│   │   └── ⚠️ Recibe organizationId, resuelve cliente Supabase
│   ├── PipelineService.ts
│   │   └── ⚠️ Recibe organizationId, resuelve cliente Supabase
│   ├── TasksService.ts
│   │   └── ⚠️ Recibe organizationId, resuelve cliente Supabase
│   ├── FlowBuilderService.ts
│   │   └── ⚠️ Recibe organizationId, resuelve cliente Supabase
│   ├── CampaignService.ts
│   │   └── ⚠️ Recibe organizationId, resuelve cliente Supabase
│   ├── AnalyticsService.ts
│   │   └── ⚠️ Recibe organizationId, resuelve cliente Supabase
│   ├── BillingService.ts
│   │   └── ✅ Sigue en MI Supabase (Stripe, planes)
│   ├── AuthService.ts
│   │   └── ✅ Sigue en MI Supabase (Supabase Auth)
```

**Agregar después:**
```typescript
├── db/
│   ├── supabase-admin.ts
│   ├── drizzle.ts
│   └── database-provider.ts        ⭐ NUEVO
│       └── Resuelve dinámicamente cliente Supabase por organizationId
```

---
## ✂️ SECCIÓN 5: Rutas (líneas ~189-203)

**AGREGAR** nueva ruta en la lista:
```typescript
├── routes/
│   ├── auth.routes.ts
│   ├── setup.routes.ts              ⭐ NUEVO (POST /setup/connect-database, etc.)
│   ├── inbox.routes.ts
│   ├── conversations.routes.ts
│   ├── ... (resto)
```

---
## ✂️ SECCIÓN 6: Frontend Pages (líneas ~86-125)

**AGREGAR** después de `(auth)` y antes de `(app)`:
```typescript
│   │   ├── (app)/
│   │   │   ├── setup/                       ⭐ NUEVO (solo si NO setup completado)
│   │   │   │   ├── connect-database/page.tsx
│   │   │   │   ├── verify-connection/page.tsx
│   │   │   │   ├── initialize-schema/page.tsx
│   │   │   │   └── channels/page.tsx
│   │   │   │
│   │   │   └── [slug]/
│   │   │       ├── dashboard y resto (como está)
```

---
## ✂️ SECCIÓN 7: Variables de Entorno (líneas ~395-456)
**AGREGAR** estas líneas (después de la sección "Encriptación de credenciales de canales"):
```env
# Cliente Database (Dual-Database Architecture)
CLIENT_DB_ENCRYPTION_KEY=    # 32 bytes hex para AES-256-GCM
                             # Generar: openssl rand -hex 32
```

---
## ✂️ SECCIÓN 8: Fases de Desarrollo (líneas ~346-351)

**MODIFICAR Fase 1** (antes de entrar en detalle):
```markdown
### ⚠️ IMPORTANTE — Cambio en Fase 1

La Fase 1 ahora incluye **Setup Flow (Onboarding):**
- Paso 4: "Conectar Base de Datos del Cliente"
- Paso 5: "Inicializar Schema en Cliente DB"

Leer: `ARCHITECTURE-CHANGES.md` → "Flujo: Onboarding del Cliente (Fase 1 modificada)"

El resto de las fases (2-8) NO cambian, solo que los servicios ahora reciben
`organizationId` y resuelven la cliente Supabase dinámicamente.
```

---
## ✂️ SECCIÓN 9: Comandos de Desarrollo (líneas ~354-391)

**AGREGAR** antes de `# Tests`:
```bash
# Encriptación
openssl rand -hex 32  # Generar CLIENT_DB_ENCRYPTION_KEY
```

---
## ✂️ NUEVA SECCIÓN: Multi-Database Architecture

**AGREGAR** al final del archivo, antes de "Notas del Proyecto":

```markdown
---

## 🔐 Multi-Database Architecture

**Resumen rápido:**
- MI Supabase: auth, billing, metadata de cliente
- CLIENTE Supabase: datos operacionales (conversaciones, contactos, etc.)
- Credenciales encriptadas en MI tabla `client_databases`
- Cada servicio resuelve dinámicamente la DB del cliente

**Documentación completa:** Ver `ARCHITECTURE-CHANGES.md`
**Impacto en desarrollo:**
1. Todos los servicios reciben `organizationId`
2. Usan `DatabaseProvider.getClientDrizzle(organizationId)` en lugar de `this.db`
3. Webhooks (WhatsApp, IG, etc.) requieren `organizationId` en payload

**Seguridad:**
- AES-256-GCM para encriptación en reposo
- Setup validado contra Supabase real
- Rate limiting en endpoints de setup
- Audit logs de cada conexión de cliente DB
```
---
## 🎯 Cambios en fase-1.md
Anda a `4-REEMPLAZOS.md`