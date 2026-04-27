-- ============================================================
-- Apex IA — Schema del Cliente (ejecutado en Supabase del cliente)
-- Aplicado via setup flow cuando el cliente conecta su base de datos
-- ============================================================

-- contacts: clientes/prospectos
CREATE TABLE IF NOT EXISTS "contacts" (
  "id"                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"                VARCHAR(100),
  "email"               VARCHAR(255),
  "phone"               VARCHAR(30),
  "whatsapp_id"         VARCHAR(50),
  "instagram_id"        VARCHAR(50),
  "facebook_id"         VARCHAR(50),
  "telegram_id"         VARCHAR(50),
  "custom_fields_json"  JSONB,
  "tags"                TEXT[],
  "is_archived"         BOOLEAN DEFAULT FALSE,
  "created_at"          TIMESTAMP DEFAULT NOW()
);

-- conversations: cada conversación con un contacto
CREATE TABLE IF NOT EXISTS "conversations" (
  "id"                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "contact_id"          UUID NOT NULL REFERENCES "contacts"("id") ON DELETE CASCADE,
  "channel"             VARCHAR(30) NOT NULL,
  "status"              TEXT DEFAULT 'open',
  "assigned_agent_id"   UUID,
  "message_count"       INTEGER DEFAULT 0,
  "last_message_at"     TIMESTAMP,
  "created_at"          TIMESTAMP DEFAULT NOW()
);

-- messages: cada mensaje dentro de una conversación
CREATE TABLE IF NOT EXISTS "messages" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversation_id" UUID NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
  "sender_type"     TEXT NOT NULL,
  "content"         TEXT,
  "media_url"       VARCHAR(500),
  "media_type"      VARCHAR(50),
  "metadata_json"   JSONB,
  "is_read"         BOOLEAN DEFAULT FALSE,
  "created_at"      TIMESTAMP DEFAULT NOW()
);

-- pipelines: embudos de venta
CREATE TABLE IF NOT EXISTS "pipelines" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"       VARCHAR(100) NOT NULL,
  "is_default" BOOLEAN DEFAULT FALSE,
  "created_at" TIMESTAMP DEFAULT NOW()
);

-- pipeline_stages: columnas del kanban
CREATE TABLE IF NOT EXISTS "pipeline_stages" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "pipeline_id" UUID NOT NULL REFERENCES "pipelines"("id") ON DELETE CASCADE,
  "name"        VARCHAR(50) NOT NULL,
  "order"       INTEGER NOT NULL,
  "color"       VARCHAR(7)
);

-- deals: oportunidades de venta
CREATE TABLE IF NOT EXISTS "deals" (
  "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "contact_id"        UUID REFERENCES "contacts"("id"),
  "pipeline_id"       UUID NOT NULL REFERENCES "pipelines"("id"),
  "stage_id"          UUID NOT NULL REFERENCES "pipeline_stages"("id"),
  "title"             VARCHAR(200) NOT NULL,
  "amount"            DECIMAL(10, 2),
  "probability"       INTEGER DEFAULT 0,
  "closed_date"       TIMESTAMP,
  "assigned_agent_id" UUID,
  "created_at"        TIMESTAMP DEFAULT NOW()
);

-- tasks: tareas asignadas a agentes
CREATE TABLE IF NOT EXISTS "tasks" (
  "id"                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "title"               VARCHAR(200) NOT NULL,
  "description"         TEXT,
  "assigned_agent_id"   UUID,
  "related_contact_id"  UUID REFERENCES "contacts"("id"),
  "priority"            TEXT DEFAULT 'medium',
  "status"              TEXT DEFAULT 'pending',
  "due_date"            TIMESTAMP,
  "completed_at"        TIMESTAMP,
  "created_at"          TIMESTAMP DEFAULT NOW()
);

-- flows: automatizaciones visuales
CREATE TABLE IF NOT EXISTS "flows" (
  "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"         VARCHAR(100) NOT NULL,
  "trigger_type" VARCHAR(50),
  "nodes_json"   JSONB NOT NULL DEFAULT '[]',
  "edges_json"   JSONB NOT NULL DEFAULT '[]',
  "is_active"    BOOLEAN DEFAULT FALSE,
  "version"      INTEGER DEFAULT 1,
  "created_at"   TIMESTAMP DEFAULT NOW()
);

-- campaigns: mensajería masiva
CREATE TABLE IF NOT EXISTS "campaigns" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"            VARCHAR(100) NOT NULL,
  "channel"         VARCHAR(30) NOT NULL,
  "message_content" TEXT NOT NULL,
  "status"          TEXT DEFAULT 'draft',
  "target_count"    INTEGER DEFAULT 0,
  "sent_count"      INTEGER DEFAULT 0,
  "failed_count"    INTEGER DEFAULT 0,
  "scheduled_at"    TIMESTAMP,
  "completed_at"    TIMESTAMP,
  "created_at"      TIMESTAMP DEFAULT NOW()
);

-- templates: WhatsApp Business API templates
CREATE TABLE IF NOT EXISTS "templates" (
  "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"             VARCHAR(100) NOT NULL,
  "content"          TEXT NOT NULL,
  "channel"          VARCHAR(30) NOT NULL,
  "meta_template_id" VARCHAR(100),
  "status"           TEXT DEFAULT 'pending',
  "created_at"       TIMESTAMP DEFAULT NOW()
);

-- channel_credentials: credenciales encriptadas de cada canal
CREATE TABLE IF NOT EXISTS "channel_credentials" (
  "id"                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "channel_type"          VARCHAR(30) NOT NULL,
  "encrypted_credentials" TEXT NOT NULL,
  "is_active"             BOOLEAN DEFAULT TRUE,
  "created_at"            TIMESTAMP DEFAULT NOW()
);

-- call_logs: registro de llamadas AI
CREATE TABLE IF NOT EXISTS "call_logs" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "contact_id"  UUID REFERENCES "contacts"("id"),
  "duration"    INTEGER,
  "transcript"  TEXT,
  "is_success"  BOOLEAN,
  "ai_model"    VARCHAR(50),
  "tokens_used" INTEGER,
  "created_at"  TIMESTAMP DEFAULT NOW()
);

-- analytics_events: eventos de análisis
CREATE TABLE IF NOT EXISTS "analytics_events" (
  "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_type"    VARCHAR(100) NOT NULL,
  "channel"       VARCHAR(30),
  "agent_id"      UUID,
  "contact_id"    UUID REFERENCES "contacts"("id"),
  "metadata_json" JSONB,
  "created_at"    TIMESTAMP DEFAULT NOW()
);

-- n8m_workflows: logging de workflows n8n
CREATE TABLE IF NOT EXISTS "n8m_workflows" (
  "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workflow_id"      VARCHAR(100) NOT NULL,
  "workflow_name"    VARCHAR(200),
  "trigger_type"     VARCHAR(50),
  "last_executed_at" TIMESTAMP,
  "execution_count"  INTEGER DEFAULT 0,
  "is_active"        BOOLEAN DEFAULT TRUE,
  "metadata_json"    JSONB,
  "created_at"       TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS "idx_conversations_contact_id" ON "conversations"("contact_id");
CREATE INDEX IF NOT EXISTS "idx_conversations_status" ON "conversations"("status");
CREATE INDEX IF NOT EXISTS "idx_conversations_last_message" ON "conversations"("last_message_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_messages_conversation_id" ON "messages"("conversation_id");
CREATE INDEX IF NOT EXISTS "idx_contacts_whatsapp_id" ON "contacts"("whatsapp_id") WHERE "whatsapp_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_contacts_email" ON "contacts"("email") WHERE "email" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_deals_pipeline_id" ON "deals"("pipeline_id");
CREATE INDEX IF NOT EXISTS "idx_deals_stage_id" ON "deals"("stage_id");
CREATE INDEX IF NOT EXISTS "idx_tasks_assigned_agent" ON "tasks"("assigned_agent_id");
CREATE INDEX IF NOT EXISTS "idx_analytics_events_type" ON "analytics_events"("event_type", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_n8m_workflows_id" ON "n8m_workflows"("workflow_id");

-- Pipeline y stages por defecto
INSERT INTO "pipelines" ("id", "name", "is_default")
VALUES ('00000000-0000-0000-0000-000000000001', 'Pipeline Principal', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO "pipeline_stages" ("pipeline_id", "name", "order", "color") VALUES
  ('00000000-0000-0000-0000-000000000001', 'Prospecto',        1, '#64748b'),
  ('00000000-0000-0000-0000-000000000001', 'Contactado',       2, '#3b82f6'),
  ('00000000-0000-0000-0000-000000000001', 'Propuesta enviada',3, '#f59e0b'),
  ('00000000-0000-0000-0000-000000000001', 'Negociación',      4, '#8b5cf6'),
  ('00000000-0000-0000-0000-000000000001', 'Cerrado ganado',   5, '#10b981'),
  ('00000000-0000-0000-0000-000000000001', 'Cerrado perdido',  6, '#ef4444')
ON CONFLICT DO NOTHING;
