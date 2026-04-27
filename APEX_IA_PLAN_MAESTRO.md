# 🎯 APEX IA — Plan Maestro de Desarrollo
**SaaS CRM Omnicanal con Automatización Inteligente**

Versión: 3.0 | Última actualización: Abril 2026 | Ciclo: 16 semanas

---

## ÍNDICE

1. Visión y Posicionamiento
2. Stack Tecnológico y Decisiones de Arquitectura
3. Seguridad de Nivel Enterprise
4. Estrategia de Testing
5. Roadmap Detallado (16 semanas)
6. Checklist de Pre-Launch
7. Operaciones y Monitoreo

---

## 1 — Visión y Posicionamiento

### Propuesta de Valor

Apex IA centraliza toda la comunicación de una PyME en un solo lugar: WhatsApp (oficial y QR), Instagram, Facebook Messenger, Email, Telegram, WebChat, TikTok y Voice. Con automatización visual sin código, pipeline de ventas, y AI integrada.

**Mercado objetivo:**

| Segmento | Tamaño LATAM | Caso de uso |
|---|---|---|
| PyMEs (10-100 personas) | 450k empresas | Reemplazar Zendesk, HubSpot |
| Agencias Digitales | 120k agencias | Gestionar múltiples clientes |
| Emprendedores (0-10) | 2M personas | Primera herramienta CRM+Chat |

**Diferenciadores clave:**
- IA integrada con múltiples proveedores (Claude, GPT, Gemini) con fallback automático
- Omnicanal real: WhatsApp oficial + QR en el mismo inbox
- Flow Builder visual sin código
- Freemium agresivo ($0 forever → $49/mes Growth)
- Construido para LATAM: español por defecto, precios en USD accesibles

---

## 2 — Stack Tecnológico y Decisiones de Arquitectura

### Frontend
```
Next.js 15 (App Router)    SSR para landing, CSR para dashboard
TypeScript strict           Sin `any` en todo el proyecto
Tailwind CSS 4 + shadcn/ui  Design system dark theme
Zustand                     Estado global liviano
TanStack Query v5           Server state, caché, sincronización
Socket.io-client            Real-time inbox bidireccional
React Hook Form + Zod       Formularios y validación
Recharts                    Gráficos y analytics
@xyflow/react               Flow Builder visual drag-and-drop
```

### Backend
```
Hono.js                     API REST + WebSockets, TypeScript-first, ~40KB
Drizzle ORM                 Type-safe, migraciones, apunta a Supabase
Redis (Upstash)             Caché, sesiones, pub/sub, rate limiting
BullMQ                      Colas async: campaigns, notificaciones, AI tasks
Socket.io                   Real-time WebSocket + polling fallback
Zod                         Validación server-side
pino                        Logging estructurado
```

### Base de Datos: Supabase

**Decisión de arquitectura:** Se usa Supabase (PostgreSQL gestionado) en lugar de PostgreSQL self-hosted. Esto simplifica significativamente la infraestructura:

- **Supabase Auth** → manejo de usuarios y JWT (no hay que implementar auth desde cero)
- **Supabase Storage** → archivos y media (reemplaza MinIO)
- **Supabase Realtime** → complementa Socket.io para notificaciones
- **Drizzle ORM** → sigue siendo la capa de acceso a datos (type-safe)

**Multi-tenancy: Schema per Tenant**
Cada empresa tiene su propio PostgreSQL schema: `company_{slug}`. Aislamiento total de datos entre tenants.

```
postgres (Supabase)
├── public schema
│   ├── organizations    → empresas registradas
│   ├── users            → sincronizado con Supabase Auth
│   └── audit_logs       → registro de acciones críticas
│
├── company_acme schema  → datos de la empresa "acme"
│   ├── conversations
│   ├── messages
│   ├── contacts
│   ├── deals / pipelines / pipeline_stages
│   ├── tasks
│   ├── flows
│   ├── campaigns / campaign_recipients
│   ├── templates
│   ├── channel_credentials  → encriptadas AES-256-GCM
│   ├── call_logs
│   └── analytics_events
│
└── company_beta schema  → datos de la empresa "beta" (completamente aislados)
```

### Canales de Mensajería

| Canal | Tecnología | Fase |
|---|---|---|
| WhatsApp Oficial | Meta Cloud API + Webhooks | 2 |
| WhatsApp QR (no oficial) | Baileys (multi-device) | 2 |
| Instagram DM | Meta Graph API | 2 |
| Facebook Messenger | Meta Graph API | 2 |
| Telegram | Telegraf | 2 |
| WebChat | Widget iframe propio | 2 |
| Email | Nodemailer SMTP + Resend | 5 |
| TikTok | TikTok Business Messaging API | 5 |
| Voice AI | VAPI.ai + Whisper TTS | 6 |
| X (Twitter DMs) | Twitter API v2 | Post-MVP |
| LinkedIn | LinkedIn Messaging API | Post-MVP |

> X y LinkedIn tienen APIs extremadamente restrictivas para mensajería entrante. Se implementan como "canales beta" después del lanzamiento si existe demanda real.

### AI Stack

| Proveedor | Uso |
|---|---|
| Anthropic Claude Haiku/Sonnet | Principal — respuestas en Flow Builder |
| OpenAI GPT-4o | Proveedor alternativo |
| Google Gemini | Proveedor alternativo |
| OpenRouter | Routing multi-modelo y fallback |
| OpenAI Whisper | Transcripción de audio en inbox |

El `AiResponseService` implementa fallback automático: si falla el proveedor principal, intenta el siguiente en el orden configurado por el usuario.

### Infraestructura

| Servicio | Uso |
|---|---|
| Turborepo + pnpm | Monorepo |
| Supabase | DB + Auth + Storage (managed) |
| Upstash Redis | Redis managed (sin server propio) |
| Vercel | Frontend deploy |
| Railway o Render | Backend Hono deploy |
| Stripe | Billing y suscripciones |
| Resend | Emails transaccionales |
| Sentry | Error tracking |
| Docker Compose | Solo desarrollo local (Redis worker) |

**Beneficio de este stack:** No hay servidores de base de datos que gestionar. Supabase + Upstash + Vercel + Railway son todos servicios managed. El equipo se enfoca en código, no en infraestructura.

### Request Flow (Backend)

```
Cliente → Hono Route
        → authMiddleware       (verifica JWT Supabase)
        → tenantMiddleware      (detecta slug, setea schema Drizzle)
        → rateLimitMiddleware   (Upstash Redis, por IP + por org)
        → Route Handler
        → Service Layer         (lógica de negocio)
        → Drizzle ORM           (query en schema del tenant)
        → Supabase PostgreSQL
        → Response JSON
```

---

## 3 — Seguridad de Nivel Enterprise

### Autenticación
- **Supabase Auth** gestiona el ciclo completo: registro, login, JWT (15min), refresh token (7 días)
- JWT se almacena en memoria (no localStorage), cookie HttpOnly para refresh
- 2FA con TOTP disponible en plan Business (Semana 14)

### Autorización
- Roles: `administrator` (acceso total) y `agent` (sin pipeline, canales, settings, analytics)
- Permisos granulares por módulo guardados en `users.permissions_json`
- `authMiddleware` verifica rol Y permisos antes de cada ruta protegida

### Datos Sensibles
- Credenciales de canales (tokens API de WhatsApp, IG, etc.) encriptadas con **AES-256-GCM** antes de guardar en DB
- Clave de encriptación en variable de entorno `ENCRYPTION_KEY`, nunca en código
- API Keys hasheadas con bcrypt (no se almacena el valor plano)

### Rate Limiting
- Por IP: 100 requests/minuto en rutas públicas
- Por organización: 1000 requests/minuto en rutas autenticadas
- Por endpoint sensible (login, register): 10 intentos/15 minutos
- Implementado con Upstash Redis

### Headers de Seguridad
```
Content-Security-Policy
Strict-Transport-Security (HSTS)
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

### Multi-tenancy
- Schema-per-tenant: aislamiento total a nivel de base de datos
- `tenantMiddleware` setea el schema Drizzle en cada request — no hay riesgo de cross-tenant data leak
- Los webhooks de canales verifican firma (HMAC-SHA256) antes de procesar

### Audit Trail
Todas las acciones críticas se registran en `public.audit_logs`:
- Crear/eliminar contacto, deal, campaign
- Cambiar rol de usuario
- Conectar/desconectar canal
- Cambiar plan de suscripción
- Generar/revocar API key

---

## 4 — Estrategia de Testing

### Filosofía
Cada feature se entrega con sus tests. No se cierra una fase sin que los tests estén en verde.

### Herramientas

| Herramienta | Uso |
|---|---|
| Vitest | Unit tests e integration tests (backend) |
| React Testing Library | Componentes React |
| Playwright | E2E (flujos críticos únicamente) |
| Supertest | Tests de endpoints HTTP |
| K6 | Load testing (Fase 8) |

### Cobertura mínima
- Servicios (lógica de negocio): 80%
- Rutas (endpoints): 60%
- Componentes React críticos: 70%

### Entornos de test
- **Unit tests**: todo en memoria, sin DB real
- **Integration tests**: Supabase local (`supabase start`) o proyecto Supabase staging dedicado
- **E2E**: ambiente staging completo

### Tests por fase (resumen)

| Fase | Tests principales |
|---|---|
| 1 | AuthService, tenantMiddleware, endpoints auth |
| 2 | InboxService, WhatsAppCloudApiService, BaileysWhatsAppService, webhooks |
| 3 | ContactsService (incluye import CSV), PipelineService, TasksService |
| 4 | FlowBuilderService (ejecución de cada nodo), CampaignService + BullMQ worker |
| 5 | CalendarService, EmailService, TikTokService |
| 6 | AiResponseService (fallback entre proveedores), AnalyticsService |
| 7 | TeamService, ApiKeyService, settings endpoints |
| 8 | BillingService, planLimits, E2E onboarding completo, load test K6 |

---

## 5 — Roadmap Detallado (16 semanas)

### FASE 1 — Fundación (Semanas 1-2)

**Entregables:**
- Monorepo Turborepo con pnpm workspaces (`apps/web`, `apps/api`, `packages/`)
- Supabase Auth integrado (register, login, JWT, refresh)
- Schema público Drizzle: `organizations`, `users`, `audit_logs`
- `tenantMiddleware`: slug en URL → schema Drizzle del tenant
- Landing page con hero, pricing (3 planes), FAQ
- Docker Compose local (Redis)
- `.env.example` completo

**Tests:**
```
tests/unit/auth.service.test.ts
tests/unit/tenantMiddleware.test.ts
tests/integration/auth.routes.test.ts
```

---

### FASE 2 — Core Inbox (Semanas 3-5)

**Entregables:**
- Schema tenant: `conversations`, `messages`, `contacts`, `channel_credentials`
- `InboxService`: crear conversación, filtrar por tabs (All/Unassigned/Mine/Assigned), asignar, resolver
- `ConversationService`: enviar mensaje, obtener historial, marcar como leído
- WebSocket (Socket.io sobre Hono): rooms por conversación, eventos en tiempo real
- Canales integrados:
  - **WhatsAppCloudApiService** — Meta Cloud API (webhook verification + send + receive)
  - **BaileysWhatsAppService** — QR multi-session (init, connect, send, receive)
  - **InstagramService** — DMs via Meta Graph API
  - **FacebookMessengerService** — Messenger via Meta Graph API
  - **TelegramService** — bot con Telegraf
  - **WebChatService** — widget embebible (script tag)
- Frontend inbox: lista de conversaciones, burbujas de mensajes, panel de detalle, filtros

**Tests:**
```
tests/unit/InboxService.test.ts
tests/unit/ConversationService.test.ts
tests/unit/WhatsAppCloudApiService.test.ts
tests/unit/BaileysWhatsAppService.test.ts
tests/integration/inbox.routes.test.ts
tests/integration/whatsapp-cloud-webhook.routes.test.ts
tests/integration/instagram-webhook.routes.test.ts
```

---

### FASE 3 — CRM Core (Semanas 6-7)

**Entregables:**
- Schema: `contacts`, `deals`, `pipelines`, `pipeline_stages`, `tasks`, `custom_field_definitions`
- `ContactsService`: CRUD completo, búsqueda, import/export CSV, historial de conversaciones
- `PipelineService`: múltiples pipelines, stages personalizables, mover deals entre stages
- `TasksService`: CRUD, asignación a agentes, filtros
- Frontend: tabla de contactos, sidebar de detalle, modal de import CSV, tablero Kanban, cards de deals, lista de tareas

**Tests:**
```
tests/unit/ContactsService.test.ts
tests/unit/PipelineService.test.ts
tests/unit/TasksService.test.ts
tests/integration/contacts.routes.test.ts
tests/integration/pipeline.routes.test.ts
```

---

### FASE 4 — Automatización (Semanas 8-9)

**Entregables:**
- Schema: `flows`, `campaigns`, `campaign_recipients`, `templates`
- `FlowBuilderService`: crear/editar flows, activar/desactivar, motor de ejecución nodo-por-nodo
  - Nodos: Trigger, Condición, SendMessage, Delay, AiResponse, SubFlow
- `CampaignService`: CRUD, scheduling, procesamiento en lotes con BullMQ, métricas live
- Frontend: canvas React Flow drag-and-drop, panel de nodos, lista de campañas, dashboard de métricas

**Tests:**
```
tests/unit/FlowBuilderService.test.ts
tests/unit/CampaignService.test.ts
tests/integration/flow-builder.routes.test.ts
tests/integration/campaigns.routes.test.ts
```

---

### FASE 5 — Productividad (Semanas 10-11)

**Entregables:**
- Schema: `calendar_events`, `call_logs`
- `CalendarService`: CRUD de eventos, sync OAuth con Google Calendar
- `EmailService`: Nodemailer SMTP configurable + Resend SDK, recepción de emails → conversación inbox
- `TikTokService`: webhook handler + send
- Transcripción de audio: Whisper integrado en `ConversationService` para mensajes de audio entrantes
- Frontend: vista de calendario, tabla de call logs, settings de Email SMTP, toggles de WhatsApp Behavior

**Tests:**
```
tests/unit/CalendarService.test.ts
tests/unit/EmailService.test.ts
tests/integration/calendar.routes.test.ts
```

---

### FASE 6 — Inteligencia AI (Semanas 12-13)

**Entregables:**
- Schema: `ai_credentials` (encriptadas), `ai_usage_logs`
- `AiResponseService`: routing multi-proveedor (Anthropic/OpenAI/Gemini/OpenRouter), fallback automático, logging de uso
- Settings de AI Credentials: UI para configurar proveedor + API key por tenant
- `AnalyticsService`: métricas de conversaciones, performance de agentes, SLA por canal, heatmap de volumen, CSAT
- Frontend: dashboard de analytics con KPIs y gráficos, chart de uso AI, reportes con export CSV

**Tests:**
```
tests/unit/AiResponseService.test.ts
tests/unit/AnalyticsService.test.ts
tests/integration/analytics.routes.test.ts
```

---

### FASE 7 — Settings Avanzados (Semana 14)

**Entregables:**
- `TeamService`: invitar miembros por email, roles, permisos granulares por módulo
- `ApiKeyService`: generar/revocar API keys, rate limiting por key
- Pages CMS: CRUD para páginas públicas (Terms, Privacy, custom)
- Custom CSS / Custom JS: guardar y servir por tenant
- Backup & Restore: pg_dump del schema tenant → Supabase Storage → descarga/restauración
- Audit trail: registrar acciones críticas en `audit_logs`
- 2FA con TOTP (plan Business)

**Tests:**
```
tests/unit/TeamService.test.ts
tests/unit/ApiKeyService.test.ts
tests/integration/settings.routes.test.ts
```

---

### FASE 8 — Billing + Go-Live (Semanas 15-16)

**Entregables:**
- `BillingService`: checkout Stripe, webhook de confirmación, upgrade/downgrade/cancel
- `planLimits.ts`: enforcement de límites por plan antes de cada acción limitada
- `PlanLimitBanner` en el dashboard: banner cuando el usuario se acerca al límite
- Sentry: frontend + backend, source maps en producción
- Deploy: Vercel (frontend) + Railway (backend), env vars configuradas, dominio custom
- Documentación API: OpenAPI/Swagger auto-generado
- Programa de afiliados: tracking con Stripe referrals (30% comisión)
- Load test K6: 100 VUs concurrentes en endpoint de inbox

**Tests:**
```
tests/unit/BillingService.test.ts
tests/unit/planLimits.test.ts
tests/integration/billing.routes.test.ts
tests/integration/stripe-webhook.routes.test.ts
tests/e2e/complete-onboarding-flow.spec.ts
```

---

## 6 — Checklist de Pre-Launch

### Seguridad
- [ ] SSL/TLS en todos los dominios (Vercel + Railway)
- [ ] CORS configurado sin wildcards (solo dominios propios)
- [ ] Rate limiting activo (Upstash Redis)
- [ ] Headers de seguridad configurados (HSTS, CSP, X-Frame-Options)
- [ ] Credenciales de canales encriptadas con AES-256-GCM
- [ ] Verificación de firma HMAC-SHA256 en todos los webhooks
- [ ] Sin secrets hardcodeados (verificar con `git grep` o similar)
- [ ] Supabase RLS habilitado como capa extra de aislamiento
- [ ] 2FA disponible para plan Business
- [ ] Audit logs implementados para acciones críticas
- [ ] OWASP Top 10 revisado

### Performance
- [ ] Lighthouse score > 85 en mobile
- [ ] P95 latency < 500ms en endpoints críticos (inbox, send message)
- [ ] Load test: 100 VUs sin degradación (K6)
- [ ] Índices de DB revisados (conversaciones por contacto, mensajes por conversación)
- [ ] TanStack Query con caché configurado
- [ ] Bundle size < 200KB gzipped (Next.js)
- [ ] Lazy loading en módulos pesados (Flow Builder, Analytics)

### Calidad
- [ ] Unit test coverage > 80% en servicios
- [ ] Integration tests en todos los endpoints críticos
- [ ] E2E: onboarding completo, envío de mensaje, resolución de conversación
- [ ] TypeScript sin errores (strict mode)
- [ ] Sin console.log en código de producción

### Producto
- [ ] Privacy Policy y Terms of Service publicados
- [ ] Onboarding flow completo (register → connect canal → primer mensaje)
- [ ] Plan Free con branding "Powered by Apex IA"
- [ ] Enforcement de límites de plan funcionando
- [ ] Emails transaccionales: bienvenida, invitación de equipo, factura

### Operaciones
- [ ] Sentry recibiendo errores de frontend y backend
- [ ] Health check en `/health` (verifica DB + Redis)
- [ ] Logs estructurados con pino (sin console.log)
- [ ] Backups automáticos de Supabase configurados
- [ ] Runbook para incidentes comunes documentado

---

## 7 — Operaciones y Monitoreo

### Health Check endpoint
```typescript
// GET /health
{
  status: "ok" | "degraded",
  checks: {
    database: "ok" | "error",
    redis: "ok" | "error",
    supabase_storage: "ok" | "error"
  },
  timestamp: "2026-04-20T10:00:00Z",
  version: "1.0.0"
}
```

### Logging estructurado (pino)
```typescript
// Formato de cada log
{
  "timestamp": "2026-04-20T10:30:45Z",
  "level": "error",
  "action": "whatsapp_webhook_failed",
  "orgSlug": "acme",
  "error": "Invalid HMAC signature",
  "traceId": "abc123"
}
```

### Alertas clave a configurar en Sentry
- Error rate > 1% en endpoints críticos (inbox, webhooks)
- Tiempo de respuesta P95 > 500ms durante más de 5 minutos
- BullMQ queue con más de 1000 jobs pendientes
- Fallos de autenticación con Supabase Auth > 50/minuto

---

## Resumen Ejecutivo

| Aspecto | Objetivo |
|---|---|
| Duración | 16 semanas |
| Stack | Next.js 15 + Hono + Supabase + Redis |
| Canales MVP | WhatsApp (x2) + Instagram + Messenger + Telegram + WebChat |
| Canales Fase 2 | + Email + TikTok + Voice AI |
| Seguridad | Supabase Auth + AES-256 + rate limiting + HMAC webhooks |
| Testing | >80% cobertura en servicios, E2E en flujos críticos |
| Performance | P95 < 500ms, 100 VUs sin degradación |
| Deploy | Vercel + Railway + Supabase (todo managed) |
| Go-Live | Semana 16 |
