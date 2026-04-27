 Apex IA — CLAUDE.md
# Documento maestro para Claude Code.
# LEÉ ESTE ARCHIVO COMPLETO ANTES DE ESCRIBIR UNA SOLA LÍNEA DE CÓDIGO.

Lee estos archivos antes de codear:
- Reglas críticas y stack: docs/stack.md
- Base de datos: docs/database.md  
- Arquitectura dual-database: docs/ARCHITECTURE-CHANGES.md  ← LEER SIEMPRE
- Convenciones de nombres: docs/conventions.md
- Testing: docs/testing.md
- Fase actual: docs/fases/fase-1.md  ← cambiás esto al avanzar

---

## ⚠️ REGLAS CRÍTICAS — CLAUDE CODE DEBE SEGUIRLAS SIN EXCEPCIÓN

1. **Implementá UNA sola fase a la vez.** Al terminar cada fase, DETENTE y escribí exactamente:
   > "✅ Fase [N] completada. Implementé: [lista de lo que hiciste]. ¿Confirmas que avanzo a la Fase [N+1]?"
2. **No mezcles fases.** Si estás en Fase 2, no toques archivos de Fase 3.
3. **Cada tarea lleva su test.** No cerrás una tarea sin escribir el test correspondiente.
4. **Ante cualquier ambigüedad, preguntá antes de asumir.** Una pregunta es mejor que rehacer trabajo.
5. **Seguí los nombres de funciones y clases definidos en este doc.** No inventes nombres alternativos, a no ser que no estén especificados.
6. **Todos los secrets van en `.env` y `.env.example`.** Nunca hardcodeados en el código.
7. **TypeScript strict: sin `any`, sin `@ts-ignore`, sin `as unknown as X`.**
8. **Un archivo, una responsabilidad.** No agrupes servicios no relacionados en el mismo archivo.

---

## Visión del Producto

**Apex IA** es un SaaS CRM omnicanal para PyMEs y emprendedores latinoamericanos. Centraliza mensajes de WhatsApp (oficial y QR), Instagram, Facebook Messenger, Email, Telegram, WebChat, TikTok y Voice en un único inbox. Incluye automatización visual sin código (Flow Builder), pipeline de ventas Kanban, analytics en tiempo real, y AI integrada (Claude, GPT, Gemini).

Referencia visual: capturas en `/Megacom/` (46 imágenes de app.lacentralpyme.com)

---

### Canales de Mensajería
| Canal | Librería/API | Fase |
|---|---|---|
| WhatsApp Oficial | Meta Cloud API + Webhooks | 2 |
| WhatsApp QR (no oficial) | Baileys (multi-device) | 2 |
| Instagram DM | Meta Graph API | 2 |
| Facebook Messenger | Meta Graph API | 2 |
| Telegram | Telegraf | 2 |
| WebChat | Widget iframe propio (vanilla JS) | 2 |
| Email (envío y recepción) | Nodemailer SMTP + Resend SDK | 5 |
| TikTok | TikTok Business Messaging API | 5 |
| Voice AI | VAPI.ai o Twilio + Whisper TTS | 6 |

> X (Twitter) y LinkedIn tienen APIs extremadamente restrictivas para mensajería. Se dejan como "canales beta" post-MVP si la demanda lo justifica.

### AI Stack
| Proveedor | Uso |
|---|---|
| Anthropic Claude Haiku/Sonnet | Respuestas AI en Flow Builder (proveedor principal) |
| OpenAI GPT-4o | Proveedor alternativo |
| Google Gemini | Proveedor alternativo |
| OpenRouter | Fallback y routing multi-modelo |
| OpenAI Whisper | Transcripción de audio en inbox |

### Infraestructura
| Servicio | Uso |
|---|---|
| Turborepo + pnpm workspaces | Monorepo |
| Supabase | DB + Auth + Storage (managed) |
| Upstash Redis | Redis managed |
| Vercel | Deploy frontend |
| Railway o Render | Deploy backend Hono |
| Stripe | Billing y suscripciones |
| Resend | Emails transaccionales |
| Sentry | Error tracking |
| Docker Compose | Solo para desarrollo local (Redis worker) |

---

## Estructura de Carpetas del Monorepo

```
apex-ia/
├── apps/
│   ├── web/                                  → Next.js 15 frontend
│   │   ├── app/
│   │   │   ├── (marketing)/                  → Landing, pricing, blog (sin auth)
│   │   │   │   ├── page.tsx                  → Homepage
│   │   │   │   ├── pricing/page.tsx
│   │   │   │   └── blog/[slug]/page.tsx
│   │   │   ├── (auth)/                       → Login, register, forgot-password
│   │   │   │   ├── login/page.tsx
│   │   │   │   ├── register/page.tsx
│   │   │   │   └── forgot-password/page.tsx
│   │   │   └── (app)/
│   │   │       ├── setup/                        → solo si setup NO completado
│   │   │       │   └── page.tsx                  → 1 página con 4 tabs (DB → Schema → Canales → Confirmar)
│   │   │       │
│   │   │       └── [slug]/                    → Dashboard protegido (slug = empresa)
│   │   │           ├── layout.tsx                → Sidebar + Topbar wrapper
│   │   │       ├── page.tsx                  → Redirect a /inbox
│   │   │       ├── inbox/
│   │   │       │   ├── page.tsx
│   │   │       │   └── [conversationId]/page.tsx
│   │   │       ├── pipeline/page.tsx
│   │   │       ├── contacts/
│   │   │       │   ├── page.tsx
│   │   │       │   └── [contactId]/page.tsx
│   │   │       ├── tasks/page.tsx
│   │   │       ├── calendar/page.tsx
│   │   │       ├── campaigns/
│   │   │       │   ├── page.tsx
│   │   │       │   └── [campaignId]/page.tsx
│   │   │       ├── call-logs/page.tsx
│   │   │       ├── templates/page.tsx
│   │   │       ├── analytics/page.tsx
│   │   │       ├── reports/page.tsx
│   │   │       ├── flow-builder/
│   │   │       │   ├── page.tsx              → Lista de flows
│   │   │       │   └── [flowId]/page.tsx     → Editor visual
│   │   │       └── settings/
│   │   │           ├── channels/page.tsx
│   │   │           ├── inbox-settings/page.tsx
│   │   │           ├── whatsapp-behavior/page.tsx
│   │   │           ├── general/page.tsx
│   │   │           ├── email/page.tsx
│   │   │           ├── custom-fields/page.tsx
│   │   │           ├── billing/page.tsx
│   │   │           ├── team/page.tsx
│   │   │           ├── api-access/page.tsx
│   │   │           ├── ai-credentials/page.tsx
│   │   │           ├── ai-usage/page.tsx
│   │   │           ├── custom-js/page.tsx
│   │   │           └── custom-css/page.tsx
│   │   ├── components/
│   │   │   ├── setup/
│   │   │   │   └── HelpDatabaseSetupModal.tsx    → Modal ayuda credenciales Supabase
│   │   │   ├── inbox/
│   │   │   │   ├── InboxConversationList.tsx
│   │   │   │   ├── InboxMessageBubble.tsx
│   │   │   │   ├── InboxConversationDetailPanel.tsx
│   │   │   │   ├── InboxFilterTabs.tsx        → All / Unassigned / My Chats / Assigned
│   │   │   │   └── InboxChannelBadge.tsx
│   │   │   ├── pipeline/
│   │   │   │   ├── PipelineBoardKanban.tsx
│   │   │   │   ├── PipelineDealCard.tsx
│   │   │   │   └── PipelineStageColumn.tsx
│   │   │   ├── contacts/
│   │   │   │   ├── ContactDataTable.tsx
│   │   │   │   ├── ContactDetailSidebar.tsx
│   │   │   │   └── ContactImportCsvModal.tsx
│   │   │   ├── flow-builder/
│   │   │   │   ├── FlowBuilderCanvas.tsx
│   │   │   │   ├── FlowBuilderNodePanel.tsx
│   │   │   │   └── nodes/
│   │   │   │       ├── TriggerNode.tsx
│   │   │   │       ├── ConditionNode.tsx
│   │   │   │       ├── SendMessageNode.tsx
│   │   │   │       ├── DelayNode.tsx
│   │   │   │       ├── AiResponseNode.tsx
│   │   │   │       └── SubFlowNode.tsx
│   │   │   ├── campaigns/
│   │   │   │   ├── CampaignList.tsx
│   │   │   │   └── CampaignMetricsDashboard.tsx
│   │   │   ├── settings/
│   │   │   │   ├── SettingsChannelConnectionModal.tsx
│   │   │   │   └── SettingsTeamMemberTable.tsx
│   │   │   ├── shared/
│   │   │   │   ├── AnalyticsKpiCard.tsx
│   │   │   │   ├── AppSidebar.tsx
│   │   │   │   ├── AppTopbar.tsx
│   │   │   │   └── PlanLimitBanner.tsx
│   │   │   └── ui/                           → Componentes shadcn base (no modificar)
│   │   ├── hooks/
│   │   │   ├── useInboxConversations.ts
│   │   │   ├── useConversationMessages.ts
│   │   │   ├── useContactDetails.ts
│   │   │   ├── usePipelineDealsGroupedByStage.ts
│   │   │   ├── useFlowBuilderState.ts
│   │   │   ├── useCurrentUserPermissions.ts
│   │   │   └── useOrganizationPlanLimits.ts
│   │   ├── stores/
│   │   │   ├── inboxStore.ts                 → Zustand: conversaciones activas, filtros
│   │   │   ├── authStore.ts                  → Zustand: user, org, JWT, roleId, roleName, permissions
│   │   │   └── uiStore.ts                    → Zustand: sidebar, modales, toasts
│   │   └── lib/
│   │       ├── supabase-browser.ts           → Supabase client (browser, anon key)
│   │       ├── api-client.ts                 → Fetch wrapper hacia Hono API
│   │       ├── socket-client.ts              → Socket.io singleton
│   │       └── permissions.ts                → tipos PermissionsJson, PermissionModule, PermissionAction
│   │
│   └── api/                                  → Hono backend
│       ├── src/
│       │   ├── index.ts                      → Entry point, registra todas las rutas
│       │   ├── middleware/
│       │   │   ├── authMiddleware.ts              → Verifica JWT de Supabase Auth; JOIN users+roles+organizations → setea auth context con userId, organizationId, roleId, roleName, permissions
│       │   │   ├── tenantMiddleware.ts            → Detecta slug, resuelve cliente Supabase en contexto
│       │   │   │                                    → Seteá organizationId en c.get("organizationId")
│       │   │   ├── checkSetupStatusMiddleware.ts  → Verifica setupCompletedAt; pasa setupCompleted como contexto al frontend (sin bloqueo de acceso)
│       │   │   ├── rateLimitMiddleware.ts         → Rate limiting con Upstash Redis
│       │   │   ├── requestLoggerMiddleware.ts     → Logging estructurado con pino
│       │   │   └── errorHandlerMiddleware.ts      → Manejo centralizado de errores + códigos
│       │   ├── routes/
│       │   │   ├── auth.routes.ts
│       │   │   ├── setup.routes.ts              → POST /validate-database · POST /initialize-schema · POST /complete · GET /status → { isComplete, paidAt, plan }
│       │   │   ├── inbox.routes.ts
│       │   │   ├── conversations.routes.ts
│       │   │   ├── contacts.routes.ts
│       │   │   ├── pipeline.routes.ts
│       │   │   ├── tasks.routes.ts
│       │   │   ├── calendar.routes.ts
│       │   │   ├── flow-builder.routes.ts
│       │   │   ├── campaigns.routes.ts
│       │   │   ├── templates.routes.ts
│       │   │   ├── analytics.routes.ts
│       │   │   ├── reports.routes.ts
│       │   │   ├── settings.routes.ts
│       │   │   ├── billing.routes.ts
│       │   │   └── webhooks/
│       │   │       ├── whatsapp-cloud-webhook.routes.ts
│       │   │       ├── instagram-webhook.routes.ts
│       │   │       ├── facebook-messenger-webhook.routes.ts
│       │   │       ├── telegram-webhook.routes.ts
│       │   │       └── stripe-webhook.routes.ts
│       │   ├── services/
│       │   │   ├── AuthService.ts                → register (org + user en MI Supabase), login (JWT + roleId + permissions), refresh, logout
│       │   │   ├── ClientDatabaseService.ts      → encripta/desencripta credenciales cliente (AES-256-GCM)
│       │   │   ├── InboxService.ts               ⚠️ Recibe organizationId, resuelve cliente Supabase
│       │   │   ├── ConversationService.ts        ⚠️ Recibe organizationId, resuelve cliente Supabase
│       │   │   ├── ContactsService.ts            ⚠️ Recibe organizationId, resuelve cliente Supabase
│       │   │   ├── PipelineService.ts            ⚠️ Recibe organizationId, resuelve cliente Supabase
│       │   │   ├── TasksService.ts               ⚠️ Recibe organizationId, resuelve cliente Supabase
│       │   │   ├── FlowBuilderService.ts         ⚠️ Recibe organizationId, resuelve cliente Supabase
│       │   │   ├── CampaignService.ts            ⚠️ Recibe organizationId, resuelve cliente Supabase
│       │   │   ├── AiResponseService.ts
│       │   │   ├── AnalyticsService.ts           ⚠️ Recibe organizationId, resuelve cliente Supabase
│       │   │   ├── BillingService.ts             ✅ Sigue en MI Supabase (Stripe, planes)
│       │   │   ├── TeamService.ts                ✅ Sigue en MI Supabase (users, roles)
│       │   │   ├── ApiKeyService.ts
│       │   │   └── channels/
│       │   │       ├── WhatsAppCloudApiService.ts   → Meta Cloud API
│       │   │       ├── BaileysWhatsAppService.ts    → QR / no oficial
│       │   │       ├── InstagramService.ts
│       │   │       ├── FacebookMessengerService.ts
│       │   │       ├── TelegramService.ts
│       │   │       ├── EmailService.ts
│       │   │       ├── WebChatService.ts
│       │   │       └── TikTokService.ts
│       │   ├── queues/
│       │   │   ├── campaignQueue.ts           → BullMQ: envíos masivos
│       │   │   ├── notificationQueue.ts       → BullMQ: notificaciones push/email
│       │   │   ├── aiResponseQueue.ts         → BullMQ: respuestas AI async
│       │   │   └── setup-reminder.job.ts      → Recordatorios de setup pendiente (días 1, 3 y 7 desde creación; const REMINDER_DAYS = [1, 3, 7])
│       │   ├── db/
│       │   │   ├── supabase-admin.ts          → Supabase client server (service role key, MI instancia)
│       │   │   ├── drizzle.ts                 → Instancia Drizzle con DATABASE_URL (MI Supabase)
│       │   │   └── database-provider.ts       → resuelve dinámicamente cliente Drizzle por organizationId (cache 15 min)
│       │   │       (schemas importados desde packages/database — ver sección packages abajo)
│       │   └── utils/
│       │       ├── logger.ts                  → pino logger configurado
│       │       ├── encryption.ts              → AES-256-GCM para credentials de canales
│       │       ├── validators.ts              → Zod schemas reutilizables
│       │       └── planLimits.ts              → Lógica de enforcement de planes
│       └── tests/
│           ├── unit/                          → Vitest, lógica aislada
│           ├── integration/                   → Supertest, endpoints reales con DB test
│           └── e2e/                           → Playwright, flujos completos
│
└── packages/
    ├── database/                              → Schemas Drizzle + tipos compartidos
    │   ├── src/
    │   │   ├── schema/
    │   │   │   ├── public/                    → MI Supabase (centralizado)
    │   │   │   │   ├── organizations.ts       → id, slug, name, plan, paid_at, setup_completed_at, created_at
    │   │   │   │   ├── roles.ts               → id, name, display_name, permissions_json, is_system
    │   │   │   │   ├── users.ts               → id, organization_id, email, full_name, role_id FK
    │   │   │   │   ├── audit-logs.ts
    │   │   │   │   ├── organizations-db.ts     → credenciales encriptadas de la DB del cliente (organizations_db)
    │   │   │   │   ├── subscriptions.ts       → plan, status, billing_period, amount, mp_subscription_id, mp_customer_id
    │   │   │   │   ├── payment-methods.ts     → card_brand (visa|mastercard|maestro|amex|cabal|naranja|mp|other), mp_card_id
    │   │   │   │   └── payment-history.ts     → paid | failed | refunded | pending | chargeback
    │   │   │   └── tenant/                    → CLIENTE Supabase (datos operacionales)
    │   │   │       ├── conversations.ts
    │   │   │       ├── messages.ts
    │   │   │       ├── contacts.ts
    │   │   │       ├── deals.ts
    │   │   │       ├── pipelines.ts
    │   │   │       ├── tasks.ts
    │   │   │       ├── flows.ts
    │   │   │       ├── campaigns.ts
    │   │   │       ├── templates.ts
    │   │   │       ├── channel-credentials.ts
    │   │   │       ├── call-logs.ts
    │   │   │       ├── analytics-events.ts
    │   │   │       └── n8n-workflows.ts       → logging de workflows n8n
    │   │   └── index.ts
    │   └── migrations/                        → Archivos SQL generados por Drizzle
    ├── ui/                                    → Componentes shadcn compartidos
    ├── types/                                 → Tipos TypeScript del dominio
    └── utils/                                 → Helpers: formatters, date utils, etc.
```

---

## Módulos del Dashboard

| Módulo | Descripción |
|---|---|
| **Inbox** | Bandeja unificada. Tabs: All / Unassigned / My Chats / Assigned. Real-time con WebSockets. |
| **Flow Builder** | Automatización visual. Nodos: Trigger, Condición, Mensaje, Delay, AI Response, Sub-flow. |
| **Contacts** | CRUD, import/export CSV, filtros avanzados, archivado, campos custom, historial. |
| **Pipeline** | Kanban de deals. Múltiples pipelines, stages personalizables, arrastrar cards. |
| **Tasks** | Gestión de tareas. Vista lista y grid. Filtros por status, prioridad, agente. |
| **Calendar** | Agenda. Sync con Google Calendar. Agendar citas desde conversaciones. |
| **Campaigns** | Mensajería masiva. Draft → Scheduled → Running → Paused → Completed. Métricas live. |
| **Call Logs** | Llamadas AI: duración, transcript, success rate, tokens usados. |
| **Templates** | WhatsApp Business API templates. Sync desde Meta. Estados: pending / approved / rejected. |
| **Analytics** | KPIs: conversaciones, contactos nuevos, mensajes, tasa de respuesta. Por canal y fecha. |
| **Reports** | Agent Performance, Response Time, Channel SLA, Volume Heatmap, CSAT. Export CSV. |
| **Pages** | CMS: Terms of Service, Privacy Policy, páginas custom. |

## Settings

| Setting | Descripción |
|---|---|
| Channel Connections | Conectar/desconectar WhatsApp Oficial, WhatsApp QR, IG, FB, Telegram, TikTok, Email, WebChat, Voice |
| Inbox Settings | Notificaciones browser, firma de agente, transcripción de audio, embed iframe, backup/restore |
| WhatsApp Behavior | Typing indicators, divisor de mensajes largos, link preview |
| General Settings | Timezone, idioma, auto-agregar contactos al pipeline |
| Email Settings | SMTP configurable + Resend/SES |
| Custom Fields | Campos extra para Contacts y Deals |
| Billing | Plan actual, próxima factura, upgrade/downgrade |
| Team Members | Invitar miembros, asignar roles, permisos granulares por módulo |
| API Access | Generar/revocar API keys, estadísticas de uso, documentación |
| AI Credentials | Proveedor (Anthropic/OpenAI/Gemini/OpenRouter), fallback, alertas de consumo |
| AI Usage | Analytics de tokens, requests, costos estimados |
| Custom JS | Inyectar JavaScript en páginas de la empresa |
| Custom CSS | Personalizar estilos visuales |

---

## Design System

```
Background: #111827  → gray-900
Surface:    #1F2937  → gray-800
Border:     #374151  → gray-700
Text:       #F9FAFB  → gray-50
Accent:     #10B981  → emerald-500 (primario)
Danger:     #EF4444  → red-500
Warning:    #F59E0B  → amber-500
```

Patrones UI: sidebar colapsable izquierdo fijo, topbar con búsqueda global, KPI cards en grid (2-5 columnas), empty states con ícono + descripción + CTA, toggles on/off, modales para setup de canales (Easy Setup), tabs horizontales en Settings, toasts bottom-right, badges de estado (verde = active, rojo = error).

---

## Planes de Pricing

### STARTER — $0/mes (Forever Free)
1 team member · 3 flows · 2 canales · 500 conversaciones/mes · Inbox + Pipeline básico · 5 templates · Branding "Powered by Apex IA"

### GROWTH — $49/mes
5 team members · Flows ilimitados · 10 canales · Conversaciones ilimitadas · Analytics + Reports · Campaigns (5.000/mes) · Whisper audio · Sin branding · API Access · Calendar integrations

### BUSINESS — $149/mes
Todo Growth + team members ilimitados · Múltiples pipelines · AI Credentials propias · Custom CSS/JS · Inbox Embedding · Backup & Restore · Roles avanzados · Volume Heatmap + CSAT · SLA reports · Soporte prioritario · White-label disponible

--- 

## Fases de Desarrollo — Instrucciones para Claude Code

> ⚠️ AL TERMINAR CADA FASE: escribí exactamente:
> **"✅ Fase [N] completada. Implementé: [lista]. ¿Confirmas que avanzo a la Fase [N+1]?"**
> No avancés sin confirmación explícita.

### ⚠️ IMPORTANTE — Cambio en Fase 1

La Fase 1 ahora incluye **Setup Flow (Onboarding):**
- Paso 4: "Conectar Base de Datos del Cliente" (Supabase URL + Anon Key)
- Paso 5: "Inicializar Schema en Cliente DB" (Drizzle migrations contra cliente Supabase)

El Setup se implementa como **1 página con 4 tabs** (`/setup`):
1. Conectar Base de Datos (validación real-time, debounce 500ms)
2. Inicializar Schema (ejecutar migraciones en cliente DB)
3. Conectar Canales (≥1 canal requerido)
4. Confirmación + Redirect a /[slug]/inbox

Leer: `docs/ARCHITECTURE-CHANGES.md` → "Flujo: Onboarding del Cliente"

El resto de las fases (2-8) NO cambian, solo que los servicios ahora reciben
`organizationId` y resuelven la cliente Supabase dinámicamente.

---

## Comandos de Desarrollo

```bash
# Instalar
pnpm install

# Desarrollo local (levanta web + api)
pnpm dev

# Solo frontend
pnpm dev --filter web

# Solo backend
pnpm dev --filter api

# Build producción
pnpm build

# Base de datos
pnpm db:generate    # Generar SQL de cambios (Drizzle)
pnpm db:migrate     # Aplicar migraciones a Supabase
pnpm db:studio      # Abrir Drizzle Studio (UI visual de DB)

# Supabase local (para tests)
supabase start
supabase stop
supabase db reset

# Tests
pnpm test              # Todos los tests
pnpm test:unit         # Solo unit (Vitest)
pnpm test:integration  # Solo integration (Supertest)
pnpm test:e2e          # Solo E2E (Playwright)
pnpm test:coverage     # Con reporte de cobertura

# Encriptación (generar keys)
openssl rand -hex 32  # Genera ENCRYPTION_KEY o CLIENT_DB_ENCRYPTION_KEY

# Docker (solo Redis local para BullMQ)
docker compose up -d
```

---

## Variables de Entorno — `.env.example`

```env
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=

# Redis
REDIS_URL=
REDIS_TOKEN=

# Auth
JWT_SECRET=

# WhatsApp Oficial (Meta Cloud API)
WHATSAPP_CLOUD_API_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_VERIFY_TOKEN=
META_APP_SECRET=

# Telegram
TELEGRAM_BOT_TOKEN=

# TikTok
TIKTOK_APP_ID=
TIKTOK_APP_SECRET=

# AI
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GOOGLE_GEMINI_API_KEY=
OPENROUTER_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Email
RESEND_API_KEY=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=

# App
NEXT_PUBLIC_APP_URL=
API_URL=
NODE_ENV=development

# Encriptación de credenciales de canales
ENCRYPTION_KEY=          # 32 bytes hex para AES-256-GCM

# Cliente Database (Dual-Database Architecture)
CLIENT_DB_ENCRYPTION_KEY=    # 32 bytes hex para AES-256-GCM
                             # Generar: openssl rand -hex 32

# Monitoring
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=

# Tests
TEST_DATABASE_URL=       # Supabase staging o local
```

---

## 🔐 Multi-Database Architecture

**Resumen rápido:**
- MI Supabase: auth, billing, metadata de cliente
- CLIENTE Supabase: datos operacionales (conversaciones, contactos, etc.)
- Credenciales encriptadas en MI tabla `organizations_db` (AES-256-GCM)
- Cada servicio resuelve dinámicamente la DB del cliente vía `DatabaseProvider.getClientDrizzle(organizationId)`

**Documentación completa:** Ver `docs/ARCHITECTURE-CHANGES.md`

**Flujo de registro:**
- `AuthService.register` crea org + user en MI Supabase. NADA más.
- No se crea ningún schema ni tabla en ningún otro lado.
- Las tablas operacionales del cliente se crean durante el setup flow, sobre LA Supabase del cliente.

**Impacto en desarrollo:**
1. Todos los servicios reciben `organizationId`
2. Usan `DatabaseProvider.getClientDrizzle(organizationId)` en lugar de `this.db`
3. Webhooks (WhatsApp, IG, etc.) requieren `organizationId` en payload

**Seguridad:**
- AES-256-GCM para encriptación en reposo
- Setup validado contra Supabase real antes de guardar
- Validar que key es `anon`, NO `service_role`
- Rate limiting: 5 intentos / 15 min en endpoints de setup
- Audit logs de cada conexión de cliente DB

**Setup Reminders (sin bloqueo):**
- No hay deadline ni bloqueo de acceso por setup incompleto
- `checkSetupStatusMiddleware` solo pasa `setupCompleted` como contexto; el frontend muestra un banner informativo
- `setup-reminder.job.ts` envía recordatorios en días 1, 3 y 7 desde la creación de la cuenta mientras el setup esté pendiente
- Para cambiar los días: `const REMINDER_DAYS = [1, 3, 7]` en ese archivo

---

## Notas del Proyecto

- URL del dashboard: `app.apexia.com/{slug}/inbox` — el slug identifica a cada empresa
- El plan Free incluye branding "Powered by Apex IA" como estrategia de growth orgánico
- Roles del sistema (is_system=true, no se pueden borrar): admin (todo), prime (casi todo sin billing/team write), standard (inbox + contacts read + pipeline), ai_agent (inbox write + contacts read — para n8n/automatizaciones)
- Los permisos por módulo viven en roles.permissions_json; un UPDATE roles SET permissions_json=... actualiza todos los usuarios de ese rol a la vez
- ai_agent: se autentica con API key, no tiene password ni acceso al dashboard
- Las credenciales de canales (y de cliente DB) se encriptan con AES-256-GCM antes de guardar en DB
- i18n: español por defecto, inglés como segundo idioma desde Fase 1
- El programa de afiliados (30% comisión) se implementa en Fase 8 con Stripe referrals
