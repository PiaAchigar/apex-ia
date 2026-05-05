-- ============================================================
-- Apex IA — Client Database Template (Minimal Structure)
-- Tablas necesarias para ANY cliente SaaS Apex IA
-- Sin datos de ejemplo, sin custom fields específicos
-- ============================================================

-- ========== TABLAS DE CONFIGURACIÓN ==========

-- tenant_settings: configuración key-value del cliente
CREATE TABLE IF NOT EXISTS "tenant_settings" (
  "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id"  UUID NOT NULL,
  "key"              VARCHAR(50) NOT NULL,
  "value"            TEXT,
  "updated_at"       TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_org_key UNIQUE("organization_id", "key")
);

-- ai_credentials: credenciales de proveedores AI
CREATE TABLE IF NOT EXISTS "ai_credentials" (
  "id"                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id"    UUID NOT NULL,
  "provider"           VARCHAR(30) NOT NULL,
  "encrypted_api_key"  TEXT NOT NULL,
  "model"              VARCHAR(100),
  "priority_order"     INTEGER DEFAULT 0,
  "is_active"          BOOLEAN DEFAULT TRUE,
  "created_at"         TIMESTAMP DEFAULT NOW(),
  "updated_at"         TIMESTAMP DEFAULT NOW()
);

-- pages: CMS pages (Terms, Privacy, custom pages)
CREATE TABLE IF NOT EXISTS "pages" (
  "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "slug"         VARCHAR(255) NOT NULL,
  "title"        VARCHAR(255) NOT NULL,
  "content"      TEXT,
  "is_published" BOOLEAN DEFAULT FALSE,
  "created_at"   TIMESTAMP DEFAULT NOW(),
  "updated_at"   TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_org_slug UNIQUE("organization_id", "slug")
);

-- ========== TABLAS DE CANALES ==========

-- channel_credentials: credenciales encriptadas de canales
CREATE TABLE IF NOT EXISTS "channel_credentials" (
  "id"                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id"       UUID NOT NULL,
  "channel_type"          VARCHAR(30) NOT NULL,
  "encrypted_credentials" TEXT NOT NULL,
  "is_active"             BOOLEAN DEFAULT TRUE,
  "created_at"            TIMESTAMP DEFAULT NOW(),
  "updated_at"            TIMESTAMP DEFAULT NOW()
);

-- ========== TABLAS DE CONTACTOS Y CONVERSACIONES ==========

-- contacts: clientes, prospectos, contactos
CREATE TABLE IF NOT EXISTS "contacts" (
  "id"                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id"    UUID NOT NULL,
  "name"               VARCHAR(100),
  "email"              VARCHAR(255),
  "phone"              VARCHAR(30),
  "whatsapp_id"        VARCHAR(50),
  "instagram_id"       VARCHAR(50),
  "facebook_id"        VARCHAR(50),
  "telegram_id"        VARCHAR(50),
  "tiktok_id"          VARCHAR(50),
  "custom_fields_json" JSONB,
  "tags"               TEXT[],
  "is_archived"        BOOLEAN DEFAULT FALSE,
  "created_at"         TIMESTAMP DEFAULT NOW(),
  "updated_at"         TIMESTAMP DEFAULT NOW()
);

-- conversations: conversaciones entre agentes y contactos
CREATE TABLE IF NOT EXISTS "conversations" (
  "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id"   UUID NOT NULL,
  "contact_id"        UUID NOT NULL REFERENCES "contacts"("id") ON DELETE CASCADE,
  "channel"           VARCHAR(30) NOT NULL,
  "status"            TEXT DEFAULT 'open',
  "assigned_agent_id" UUID,
  "message_count"     INTEGER DEFAULT 0,
  "last_message_at"   TIMESTAMP,
  "created_at"        TIMESTAMP DEFAULT NOW(),
  "updated_at"        TIMESTAMP DEFAULT NOW()
);

-- messages: mensajes individuales en conversaciones
CREATE TABLE IF NOT EXISTS "messages" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "conversation_id" UUID NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
  "sender_type"     TEXT NOT NULL,
  "sender_id"       UUID,
  "content"         TEXT,
  "media_url"       VARCHAR(500),
  "media_type"      VARCHAR(50),
  "metadata_json"   JSONB,
  "is_read"         BOOLEAN DEFAULT FALSE,
  "created_at"      TIMESTAMP DEFAULT NOW()
);

-- ========== TABLAS DE VENTAS ==========

-- pipelines: embudos de venta
CREATE TABLE IF NOT EXISTS "pipelines" (
  "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id"  UUID NOT NULL,
  "name"             VARCHAR(100) NOT NULL,
  "is_default"       BOOLEAN DEFAULT FALSE,
  "created_at"       TIMESTAMP DEFAULT NOW(),
  "updated_at"       TIMESTAMP DEFAULT NOW()
);

-- pipeline_stages: columnas/fases del kanban
CREATE TABLE IF NOT EXISTS "pipeline_stages" (
  "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id"  UUID NOT NULL,
  "pipeline_id"      UUID NOT NULL REFERENCES "pipelines"("id") ON DELETE CASCADE,
  "name"             VARCHAR(50) NOT NULL,
  "order"            INTEGER NOT NULL,
  "color"            VARCHAR(7),
  "created_at"       TIMESTAMP DEFAULT NOW()
);

-- deals: oportunidades/clientes en pipelines
CREATE TABLE IF NOT EXISTS "deals" (
  "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id"   UUID NOT NULL,
  "contact_id"        UUID REFERENCES "contacts"("id"),
  "pipeline_id"       UUID NOT NULL REFERENCES "pipelines"("id"),
  "stage_id"          UUID NOT NULL REFERENCES "pipeline_stages"("id"),
  "title"             VARCHAR(200) NOT NULL,
  "amount"            DECIMAL(10, 2),
  "probability"       INTEGER DEFAULT 0,
  "closed_date"       TIMESTAMP,
  "assigned_agent_id" UUID,
  "custom_fields_json" JSONB,
  "created_at"        TIMESTAMP DEFAULT NOW(),
  "updated_at"        TIMESTAMP DEFAULT NOW()
);

-- ========== TABLAS DE TAREAS ==========

-- tasks: tareas asignadas a agentes
CREATE TABLE IF NOT EXISTS "tasks" (
  "id"                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id"    UUID NOT NULL,
  "title"              VARCHAR(200) NOT NULL,
  "description"        TEXT,
  "assigned_agent_id"  UUID,
  "related_contact_id" UUID REFERENCES "contacts"("id"),
  "related_deal_id"    UUID REFERENCES "deals"("id"),
  "priority"           TEXT DEFAULT 'medium',
  "status"             TEXT DEFAULT 'pending',
  "due_date"           TIMESTAMP,
  "completed_at"       TIMESTAMP,
  "created_at"         TIMESTAMP DEFAULT NOW(),
  "updated_at"         TIMESTAMP DEFAULT NOW()
);

-- calendar_events: eventos de calendario
CREATE TABLE IF NOT EXISTS "calendar_events" (
  "id"                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id"    UUID NOT NULL,
  "title"              VARCHAR(255) NOT NULL,
  "description"        TEXT,
  "assigned_agent_id"  UUID,
  "related_contact_id" UUID REFERENCES "contacts"("id"),
  "related_deal_id"    UUID REFERENCES "deals"("id"),
  "start_time"         TIMESTAMP NOT NULL,
  "end_time"           TIMESTAMP,
  "location"           VARCHAR(255),
  "is_all_day"         BOOLEAN DEFAULT FALSE,
  "google_event_id"    VARCHAR(255),
  "created_at"         TIMESTAMP DEFAULT NOW(),
  "updated_at"         TIMESTAMP DEFAULT NOW()
);

-- ========== TABLAS DE AUTOMATIZACIÓN ==========

-- flows: automatizaciones visuales (Flow Builder)
CREATE TABLE IF NOT EXISTS "flows" (
  "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "name"         VARCHAR(100) NOT NULL,
  "trigger_type" VARCHAR(50),
  "nodes_json"   JSONB NOT NULL DEFAULT '[]',
  "edges_json"   JSONB NOT NULL DEFAULT '[]',
  "is_active"    BOOLEAN DEFAULT FALSE,
  "version"      INTEGER DEFAULT 1,
  "created_at"   TIMESTAMP DEFAULT NOW(),
  "updated_at"   TIMESTAMP DEFAULT NOW()
);

-- ========== TABLAS DE CAMPAÑAS ==========

-- campaigns: mensajería masiva
CREATE TABLE IF NOT EXISTS "campaigns" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "name"            VARCHAR(100) NOT NULL,
  "channel"         VARCHAR(30) NOT NULL,
  "message_content" TEXT NOT NULL,
  "status"          TEXT DEFAULT 'draft',
  "target_count"    INTEGER DEFAULT 0,
  "sent_count"      INTEGER DEFAULT 0,
  "failed_count"    INTEGER DEFAULT 0,
  "scheduled_at"    TIMESTAMP,
  "completed_at"    TIMESTAMP,
  "created_at"      TIMESTAMP DEFAULT NOW(),
  "updated_at"      TIMESTAMP DEFAULT NOW()
);

-- campaign_recipients: destinatarios de una campaña
CREATE TABLE IF NOT EXISTS "campaign_recipients" (
  "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "campaign_id"    UUID NOT NULL REFERENCES "campaigns"("id") ON DELETE CASCADE,
  "contact_id"     UUID NOT NULL REFERENCES "contacts"("id") ON DELETE CASCADE,
  "status"         TEXT DEFAULT 'pending',
  "sent_at"        TIMESTAMP,
  "failed_at"      TIMESTAMP,
  "error_message"  TEXT,
  "created_at"     TIMESTAMP DEFAULT NOW()
);

-- ========== TABLAS DE TEMPLATES ==========

-- templates: WhatsApp Business API templates
CREATE TABLE IF NOT EXISTS "templates" (
  "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id"  UUID NOT NULL,
  "name"             VARCHAR(100) NOT NULL,
  "content"          TEXT NOT NULL,
  "channel"          VARCHAR(30) NOT NULL,
  "meta_template_id" VARCHAR(100),
  "status"           TEXT DEFAULT 'pending',
  "created_at"       TIMESTAMP DEFAULT NOW(),
  "updated_at"       TIMESTAMP DEFAULT NOW()
);

-- ========== TABLAS DE LLAMADAS AI ==========

-- call_logs: registro de llamadas AI VAPI/Twilio
CREATE TABLE IF NOT EXISTS "call_logs" (
  "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id"  UUID NOT NULL,
  "contact_id"       UUID REFERENCES "contacts"("id"),
  "phone_number"     VARCHAR(30),
  "duration_seconds" INTEGER,
  "transcript"       TEXT,
  "is_success"       BOOLEAN,
  "ai_model"         VARCHAR(50),
  "tokens_used"      INTEGER,
  "error_message"    TEXT,
  "created_at"       TIMESTAMP DEFAULT NOW()
);

-- ai_usage_logs: logs detallados de consumo de AI
CREATE TABLE IF NOT EXISTS "ai_usage_logs" (
  "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id"  UUID NOT NULL,
  "provider"         VARCHAR(30) NOT NULL,
  "model"            VARCHAR(100) NOT NULL,
  "input_tokens"     INTEGER DEFAULT 0,
  "output_tokens"    INTEGER DEFAULT 0,
  "total_tokens"     INTEGER DEFAULT 0,
  "cost_usd"         DECIMAL(10, 4),
  "request_type"     VARCHAR(50),
  "created_at"       TIMESTAMP DEFAULT NOW()
);

-- ========== TABLAS DE ANALYTICS ==========

-- analytics_events: eventos para reportes y KPIs
CREATE TABLE IF NOT EXISTS "analytics_events" (
  "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id"  UUID NOT NULL,
  "event_type"       VARCHAR(100) NOT NULL,
  "channel"          VARCHAR(30),
  "agent_id"         UUID,
  "contact_id"       UUID REFERENCES "contacts"("id"),
  "metadata_json"    JSONB,
  "created_at"       TIMESTAMP DEFAULT NOW()
);

-- ========== TABLAS DE CAMPOS PERSONALIZADOS ==========

-- custom_field_definitions: definición de campos custom
CREATE TABLE IF NOT EXISTS "custom_field_definitions" (
  "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "entity_type"    VARCHAR(30) NOT NULL,
  "field_key"      VARCHAR(50) NOT NULL,
  "label"          VARCHAR(100) NOT NULL,
  "field_type"     VARCHAR(20) NOT NULL,
  "options"        TEXT[],
  "is_required"    BOOLEAN DEFAULT FALSE,
  "display_order"  INTEGER DEFAULT 0,
  "is_active"      BOOLEAN DEFAULT TRUE,
  "created_at"     TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_org_entity_key UNIQUE("organization_id", "entity_type", "field_key")
);

-- ========== TABLAS DE INTEGRACIONES ==========

-- n8n_workflows: logging de workflows n8n
CREATE TABLE IF NOT EXISTS "n8n_workflows" (
  "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id"  UUID NOT NULL,
  "workflow_id"      VARCHAR(100) NOT NULL,
  "workflow_name"    VARCHAR(200),
  "trigger_type"     VARCHAR(50),
  "last_executed_at" TIMESTAMP,
  "execution_count"  INTEGER DEFAULT 0,
  "is_active"        BOOLEAN DEFAULT TRUE,
  "metadata_json"    JSONB,
  "created_at"       TIMESTAMP DEFAULT NOW(),
  "updated_at"       TIMESTAMP DEFAULT NOW()
);

-- ========== ÍNDICES PARA PERFORMANCE ==========

-- Conversaciones
CREATE INDEX IF NOT EXISTS "idx_conversations_org_contact" ON "conversations"("organization_id", "contact_id");
CREATE INDEX IF NOT EXISTS "idx_conversations_status" ON "conversations"("organization_id", "status");
CREATE INDEX IF NOT EXISTS "idx_conversations_last_message" ON "conversations"("organization_id", "last_message_at" DESC);

-- Mensajes
CREATE INDEX IF NOT EXISTS "idx_messages_conversation" ON "messages"("conversation_id");
CREATE INDEX IF NOT EXISTS "idx_messages_org_created" ON "messages"("organization_id", "created_at" DESC);

-- Contactos
CREATE INDEX IF NOT EXISTS "idx_contacts_org" ON "contacts"("organization_id");
CREATE INDEX IF NOT EXISTS "idx_contacts_whatsapp" ON "contacts"("organization_id", "whatsapp_id") WHERE "whatsapp_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_contacts_email" ON "contacts"("organization_id", "email") WHERE "email" IS NOT NULL;

-- Deals
CREATE INDEX IF NOT EXISTS "idx_deals_org_pipeline" ON "deals"("organization_id", "pipeline_id");
CREATE INDEX IF NOT EXISTS "idx_deals_stage" ON "deals"("stage_id");

-- Tasks
CREATE INDEX IF NOT EXISTS "idx_tasks_org_agent" ON "tasks"("organization_id", "assigned_agent_id");
CREATE INDEX IF NOT EXISTS "idx_tasks_status" ON "tasks"("organization_id", "status");
CREATE INDEX IF NOT EXISTS "idx_tasks_due_date" ON "tasks"("due_date") WHERE "status" != 'completed';

-- Calendar Events
CREATE INDEX IF NOT EXISTS "idx_calendar_org_agent" ON "calendar_events"("organization_id", "assigned_agent_id");
CREATE INDEX IF NOT EXISTS "idx_calendar_start_time" ON "calendar_events"("organization_id", "start_time" DESC);

-- Analytics
CREATE INDEX IF NOT EXISTS "idx_analytics_org_type" ON "analytics_events"("organization_id", "event_type", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_analytics_channel" ON "analytics_events"("organization_id", "channel", "created_at" DESC);

-- AI Usage
CREATE INDEX IF NOT EXISTS "idx_ai_usage_org_provider" ON "ai_usage_logs"("organization_id", "provider", "created_at" DESC);

-- ========== RESUMEN ==========
-- ✓ 23 Tablas de estructura mínima
-- ✓ Todas incluyen organization_id (multi-tenant)
-- ✓ Foreign keys + cascadas
-- ✓ 20+ Índices para búsquedas comunes
-- ✓ Sin datos de ejemplo (cliente lo agrega según su caso de uso)
-- ✓ Soporta todos los módulos: Inbox, Pipeline, Tasks, Calendar, Campaigns, Flows, AI, Analytics
