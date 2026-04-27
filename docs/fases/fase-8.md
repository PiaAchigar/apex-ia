### FASE 8 — Billing + Go-Live (Semanas 15-16)
**Objetivo:** Stripe, enforcement de planes, deploy a producción.

**Tareas:**
> **⚠️ Arquitectura Dual-Database:** Los servicios de esta fase que tocan datos operacionales
> reciben `organizationId` y usan `DatabaseProvider.getClientDrizzle(organizationId)`.
> `BillingService`, `TeamService` y `ApiKeyService` siguen en MI Supabase.
> Ver `docs/ARCHITECTURE-CHANGES.md` → "Impacto en Cada Servicio".


1. `BillingService.ts`
   - `createStripeCheckoutSession(orgId, plan)` → redirige a Stripe
   - `handleStripeWebhookEvent(event)` → actualizar plan en DB al confirmar pago
   - `cancelSubscription(orgId)`
   - `getSubscriptionStatus(orgId)`

2. `planLimits.ts` — enforcement por plan:
   ```typescript
   async function checkPlanLimitBeforeAction(
     orgId: UUID,
     resource: "flows" | "channels" | "conversations" | "team_members"
   ): Promise<{ allowed: boolean; limit: number; current: number }>
   ```
   Llamar a esta función ANTES de crear flows, conectar canales, enviar mensajes, agregar miembros.

3. `PlanLimitBanner.tsx` → banner en el dashboard cuando el usuario está cerca o en el límite

4. Sentry: setup en frontend y backend, captura de errores + source maps

5. Deploy:
   - Frontend → Vercel (configurar env vars, dominio custom)
   - Backend → Railway o Render (configurar env vars, health check en `/health`)
   - Variables de entorno en producción: revisar `.env.example` completo

6. Documentación API: OpenAPI/Swagger auto-generado desde Hono routes

7. Go-live checklist: SSL, CORS sin wildcards, rate limiting activo, todos los tests pasando, Sentry recibiendo eventos

**Tests requeridos:**
```
tests/unit/BillingService.test.ts
tests/unit/planLimits.test.ts
tests/integration/billing.routes.test.ts
tests/integration/stripe-webhook.routes.test.ts
tests/e2e/complete-onboarding-flow.spec.ts       → register → connect WA → send message (Playwright)
```

**STOP ✋ — Al terminar:**
> "✅ Fase 8 completada. Apex IA está lista para producción. Deploy completo en Vercel + Railway, Sentry activo, todos los tests en verde. 🚀"
