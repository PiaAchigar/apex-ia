### FASE 1 — Fundación
**Objetivo:** Monorepo funcional, Supabase conectado, auth operativa, setup dual-database, landing deployable.

**⚠️ IMPORTANTE — Arquitectura Dual-Database:**
> Leer `docs/ARCHITECTURE-CHANGES.md` antes de comenzar esta fase.
> MI Supabase: auth, billing, metadata. CLIENTE Supabase: datos operacionales.

**Tareas (ejecutar en este orden):**

1. Inicializar monorepo con Turborepo + pnpm workspaces
   - Crear `apps/web` (Next.js 15), `apps/api` (Hono), `packages/database`, `packages/types`, `packages/utils`, `packages/ui`
   - Configurar `turbo.json` con pipelines: `build`, `dev`, `test`, `lint`

2. Configurar Supabase en el backend (MI instancia)
   - `apps/api/src/db/supabase-admin.ts` → cliente con `SUPABASE_SERVICE_ROLE_KEY`
   - `apps/api/src/db/drizzle.ts` → instancia Drizzle apuntando a `DATABASE_URL` (MI Supabase)

3. Configurar Supabase en el frontend
   - `apps/web/lib/supabase-browser.ts` → cliente con `SUPABASE_ANON_KEY`

4. Crear schema público en Drizzle (`packages/database/schema/public/`)
   - `organizations.ts` → incluye campos: `paidAt`, `setupCompletedAt`, `setupDeadline`, `isSetupBlocked`, `mpCustomerId`, `mpSubscriptionId`, `mpStatus`
   - `users.ts`, `audit-logs.ts`
   - `client-databases.ts` ⭐ NUEVO → credenciales encriptadas (URL + Anon Key) de cliente Supabase (AES-256-GCM)
   - Ejecutar migración con `pnpm db:migrate`

5. Implementar Auth con Supabase Auth
   - Register: crear usuario en MI Supabase Auth → insertar en tabla `users` → seleccionar plan
   - Post-pago: redirigir a `/setup` (página única con 4 tabs)
   - Setup: cliente proporciona URL + API Key de SU Supabase
   - Validar: conectar y ejecutar migraciones Drizzle en cliente DB
   - Login: Supabase Auth → devuelve JWT (MI instancia)
   - `apps/api/src/middleware/authMiddleware.ts` → verifica JWT de MI Supabase
   - `apps/api/src/middleware/tenantMiddleware.ts` → detecta slug en URL, resuelve cliente DB, seteá `organizationId` en `c.get("organizationId")`

6. Implementar Setup Flow (Onboarding dual-database)
   - `apps/api/src/services/ClientDatabaseService.ts` → encripta/desencripta credenciales (AES-256-GCM con `CLIENT_DB_ENCRYPTION_KEY`)
   - `apps/api/src/db/database-provider.ts` → resuelve dinámicamente cliente Drizzle por `organizationId` (cache 15 min)
   - `apps/api/src/utils/database-validation.ts` → valida URL Supabase, rechaza `service_role` key, prueba conexión real
   - `apps/api/src/routes/setup.routes.ts`:
     - `POST /setup/validate-database` → valida URL + Key (rate limit: 5 intentos / 15 min / 1h lockout)
     - `POST /setup/initialize-schema` → encripta, guarda en `client_databases`, ejecuta Drizzle migrations en cliente DB
     - `POST /setup/complete` → seteá `setupCompletedAt = NOW()`
   - `apps/api/src/middleware/checkSetupStatusMiddleware.ts` → si `setupDeadline` pasó y setup no completado: HTTP 403
   - `apps/api/src/jobs/setup-reminder.job.ts` → BullMQ cron (cada hora): email recordatorio a las 18h, 12h, 6h antes del deadline
   - Frontend `apps/web/app/(app)/setup/page.tsx` → 1 página con 4 tabs:
     - Tab 1: Conectar Base de Datos (validación real-time, debounce 500ms)
     - Tab 2: Inicializar Schema (muestra progreso tabla a tabla)
     - Tab 3: Conectar Canales (≥1 requerido para avanzar)
     - Tab 4: Confirmación + redirect a `/[slug]/inbox`
   - `apps/web/components/setup/HelpDatabaseSetupModal.tsx` → modal con instrucciones para obtener credenciales Supabase

7. Webhook Mercado Pago
   - `apps/api/src/routes/webhooks/mercadopago.routes.ts`
   - Al confirmar pago: setear `paidAt = NOW()`, `setupDeadline = NOW() + 24h`, `plan = 'growth'|'business'`
   - Enviar email de bienvenida: "Tienes 24h para completar setup"

8. Landing page básica (`apps/web/app/(marketing)/page.tsx`)
   - Hero con headline, CTA, grid de canales, pricing (3 columnas), FAQ

9. `docker-compose.yml` para desarrollo local (solo Redis + BullMQ worker)

**Tests requeridos para esta fase:**
```
tests/unit/ClientDatabaseService.test.ts    → encriptar/desencriptar, errores de validación
tests/unit/auth.service.test.ts             → register, login, token refresh
tests/unit/tenantMiddleware.test.ts         → slug → organizationId resolution
tests/integration/auth.routes.test.ts       → POST /auth/register, POST /auth/login, POST /auth/logout
tests/integration/setup.routes.test.ts      → validate-database (debounce, service_role reject, rate limiting)
                                              → initialize-schema, complete
tests/integration/setup-timeout.test.ts     → bloqueo 24h, email recordatorio, desbloqueo al completar
```

**STOP ✋ — Al terminar:**
> "✅ Fase 1 completada. Implementé: monorepo Turborepo, Supabase Auth (MI instancia), schema público con client_databases, ClientDatabaseService (AES-256-GCM), database-provider, setup flow (4 tabs), checkSetupStatusMiddleware, tenantMiddleware dual-database, webhook Mercado Pago, landing page. ¿Confirmas que avanzo a la Fase 2 (Core Inbox)?"
