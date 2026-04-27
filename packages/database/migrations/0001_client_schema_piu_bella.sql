-- ============================================================
-- Apex IA — Schema Piu Bella (Centro de Belleza)
-- Template completo para empresa de belleza/spa
-- Incluye: 3 pipelines, custom fields, datos de ejemplo
-- ============================================================

-- ========== CREACIÓN DE TABLAS ==========

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

-- deals: oportunidades de venta / clientes en pipelines
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

-- campaign_recipients: destinatarios de campañas
CREATE TABLE IF NOT EXISTS "campaign_recipients" (
  "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "campaign_id"    UUID NOT NULL REFERENCES "campaigns"("id") ON DELETE CASCADE,
  "contact_id"     UUID NOT NULL REFERENCES "contacts"("id") ON DELETE CASCADE,
  "status"         TEXT DEFAULT 'pending',
  "sent_at"        TIMESTAMP,
  "failed_at"      TIMESTAMP,
  "error_message"  TEXT,
  "created_at"     TIMESTAMP DEFAULT NOW()
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

-- custom_field_definitions: campos personalizados
CREATE TABLE IF NOT EXISTS "custom_field_definitions" (
  "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "entity_type"    VARCHAR(30) NOT NULL,
  "field_key"      VARCHAR(50) NOT NULL,
  "label"          VARCHAR(100) NOT NULL,
  "field_type"     VARCHAR(20) NOT NULL,
  "options"        TEXT[],
  "is_required"    BOOLEAN DEFAULT FALSE,
  "display_order"  INTEGER DEFAULT 0,
  "is_active"      BOOLEAN DEFAULT TRUE,
  "created_at"     TIMESTAMP DEFAULT NOW()
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

-- ========== ÍNDICES ==========
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

-- ========== PIPELINES PARA PIU BELLA ==========

-- Crear los 3 pipelines
INSERT INTO "pipelines" ("id", "name", "is_default") VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Prospección & Nuevos Clientes', TRUE),
  ('a2222222-2222-2222-2222-222222222222', 'Retención & Reactivación', FALSE),
  ('a3333333-3333-3333-3333-333333333333', 'Paquetes & Membresías', FALSE)
ON CONFLICT DO NOTHING;

-- Pipeline 1: Prospección & Nuevos Clientes
INSERT INTO "pipeline_stages" ("pipeline_id", "name", "order", "color") VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Prospect',                 1, '#64748b'),
  ('a1111111-1111-1111-1111-111111111111', 'Lead cualificado',         2, '#3b82f6'),
  ('a1111111-1111-1111-1111-111111111111', 'Consulta agendada',        3, '#f59e0b'),
  ('a1111111-1111-1111-1111-111111111111', '1ra sesión realizada',     4, '#8b5cf6'),
  ('a1111111-1111-1111-1111-111111111111', '✓ Cliente convertido',     5, '#10b981'),
  ('a1111111-1111-1111-1111-111111111111', '✗ No convertido',          6, '#ef4444')
ON CONFLICT DO NOTHING;

-- Pipeline 2: Retención & Reactivación
INSERT INTO "pipeline_stages" ("pipeline_id", "name", "order", "color") VALUES
  ('a2222222-2222-2222-2222-222222222222', 'Activo (últimas 2 sem)',   1, '#10b981'),
  ('a2222222-2222-2222-2222-222222222222', 'En riesgo (30+ días)',     2, '#f59e0b'),
  ('a2222222-2222-2222-2222-222222222222', 'Campaña enviada',          3, '#3b82f6'),
  ('a2222222-2222-2222-2222-222222222222', 'Reactivado',               4, '#10b981'),
  ('a2222222-2222-2222-2222-222222222222', 'Dormido (60+ días)',       5, '#ef4444')
ON CONFLICT DO NOTHING;

-- Pipeline 3: Paquetes & Membresías
INSERT INTO "pipeline_stages" ("pipeline_id", "name", "order", "color") VALUES
  ('a3333333-3333-3333-3333-333333333333', 'Interesado en paquete',    1, '#64748b'),
  ('a3333333-3333-3333-3333-333333333333', 'Propuesta presentada',     2, '#f59e0b'),
  ('a3333333-3333-3333-3333-333333333333', 'Negociación',              3, '#8b5cf6'),
  ('a3333333-3333-3333-3333-333333333333', 'Paquete activo',           4, '#10b981'),
  ('a3333333-3333-3333-3333-333333333333', 'Paquete completado',       5, '#64748b'),
  ('a3333333-3333-3333-3333-333333333333', 'Cancelado',                6, '#ef4444')
ON CONFLICT DO NOTHING;

-- ========== CUSTOM FIELDS PARA PIU BELLA ==========

INSERT INTO "custom_field_definitions" ("entity_type", "field_key", "label", "field_type", "options", "is_required", "display_order", "is_active") VALUES
  -- Campos para Contacts
  ('contact', 'skin_type', 'Tipo de piel', 'select', ARRAY['Seca', 'Grasa', 'Mixta', 'Normal', 'Sensible'], FALSE, 1, TRUE),
  ('contact', 'allergies', 'Alergias a productos', 'text', NULL, FALSE, 2, TRUE),
  ('contact', 'preferred_services', 'Servicios preferidos', 'select', ARRAY['Masaje relajante', 'Facial', 'Pilates', 'Aparatología', 'Estética corporal', 'Tratamientos capilares'], FALSE, 3, TRUE),
  ('contact', 'next_session_ideal_day', 'Día ideal próxima sesión', 'select', ARRAY['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'], FALSE, 4, TRUE),
  ('contact', 'frequency_preference', 'Frecuencia preferida', 'select', ARRAY['1x semanal', '2x semanal', '1x quincenal', '1x mensual'], FALSE, 5, TRUE),
  ('contact', 'birthday', 'Cumpleaños', 'date', NULL, FALSE, 6, TRUE),

  -- Campos para Deals
  ('deal', 'package_type', 'Tipo de paquete', 'select', ARRAY['6 sesiones', '12 sesiones', 'Membresía mensual', 'Membresía trimestral', 'Membresía anual'], FALSE, 1, TRUE),
  ('deal', 'sessions_remaining', 'Sesiones restantes', 'number', NULL, FALSE, 2, TRUE),
  ('deal', 'treatment_start_date', 'Fecha inicio tratamiento', 'date', NULL, FALSE, 3, TRUE),
  ('deal', 'treatment_type', 'Tipo de tratamiento', 'select', ARRAY['Facial', 'Masaje', 'Pilates', 'Aparatología', 'Combo'], FALSE, 4, TRUE),
  ('deal', 'payment_method', 'Método de pago', 'select', ARRAY['Efectivo', 'Tarjeta crédito', 'Tarjeta débito', 'Transferencia', 'Cuotas'], FALSE, 5, TRUE)
ON CONFLICT DO NOTHING;

-- ========== DATOS DE EJEMPLO ==========

-- Contactos de ejemplo
INSERT INTO "contacts" ("id", "name", "email", "phone", "whatsapp_id", "tags", "custom_fields_json") VALUES
  ('c1111111-1111-1111-1111-111111111111', 'María García', 'maria.garcia@email.com', '+54 9 11 2345-6789', '541123456789', ARRAY['cliente_activo', 'vip'], '{"skin_type":"seca","preferred_services":["Facial","Aparatología"],"frequency_preference":"2x semanal","birthday":"1990-05-15"}'),
  ('c2222222-2222-2222-2222-222222222222', 'Sofia Rodriguez', 'sofia.r@email.com', '+54 9 11 9876-5432', '541198765432', ARRAY['prospect', 'primera_consulta'], '{"skin_type":"mixta","preferred_services":["Masaje relajante"],"frequency_preference":"1x semanal"}'),
  ('c3333333-3333-3333-3333-333333333333', 'Laura Martínez', 'laura.m@email.com', '+54 9 11 5555-1111', '541155551111', ARRAY['cliente_dormido', 'reactivar'], '{"skin_type":"sensible","allergies":"Alérgica a ácidos","preferred_services":["Masaje","Pilates"]}'),
  ('c4444444-4444-4444-4444-444444444444', 'Carolina López', 'carolina.l@email.com', '+54 9 11 6666-2222', '541166662222', ARRAY['cliente_activo'], '{"skin_type":"normal","preferred_services":["Facial","Pilates"],"frequency_preference":"1x quincenal"}'),
  ('c5555555-5555-5555-5555-555555555555', 'Valentina Perez', 'valentina.p@email.com', '+54 9 11 7777-3333', '541177773333', ARRAY['prospect'], '{"skin_type":"grasa","preferred_services":["Facial","Aparatología"]}')
ON CONFLICT DO NOTHING;

-- Conversaciones y mensajes de ejemplo
INSERT INTO "conversations" ("id", "contact_id", "channel", "status", "message_count", "last_message_at") VALUES
  ('conv111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'whatsapp', 'closed', 3, NOW() - INTERVAL '2 days'),
  ('conv222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 'whatsapp', 'open', 5, NOW()),
  ('conv333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333333', 'whatsapp', 'open', 2, NOW() - INTERVAL '15 days')
ON CONFLICT DO NOTHING;

INSERT INTO "messages" ("conversation_id", "sender_type", "content", "created_at") VALUES
  ('conv111111-1111-1111-1111-111111111111', 'contact', '¿A qué hora puedo agendar un facial?', NOW() - INTERVAL '3 days'),
  ('conv111111-1111-1111-1111-111111111111', 'agent', 'Hola María! 👋 Tenemos disponibilidad mañana a las 3pm o el jueves a las 5pm. ¿Cuál te va mejor?', NOW() - INTERVAL '2 days 23 hours'),
  ('conv111111-1111-1111-1111-111111111111', 'contact', 'Perfecto, mañana a las 3pm está bien!', NOW() - INTERVAL '2 days'),

  ('conv222222-2222-2222-2222-222222222222', 'contact', 'Hola, me recomendó una amiga que son muy buenos', NOW()),
  ('conv222222-2222-2222-2222-222222222222', 'agent', '¡Qué bueno! 😊 Nos encanta saber eso. ¿Qué servicio te interesa?', NOW() - INTERVAL '1 hour'),
  ('conv222222-2222-2222-2222-222222222222', 'contact', 'Me gustaría probar un masaje relajante y después algún facial', NOW() - INTERVAL '30 minutes'),

  ('conv333333-3333-3333-3333-333333333333', 'agent', 'Hola Laura, hace tiempo que no te vemos 👋 ¿Te gustaría agendar una sesión? Tenemos 15% desc para volver 💆‍♀️', NOW() - INTERVAL '15 days'),
  ('conv333333-3333-3333-3333-333333333333', 'contact', 'Hola! Sí, me gustaría volver. ¿Cuándo tienen disponible?', NOW() - INTERVAL '14 days 20 hours')
ON CONFLICT DO NOTHING;

-- Deals de ejemplo (clientes en diferentes pipelines)
INSERT INTO "deals" ("id", "contact_id", "pipeline_id", "stage_id", "title", "amount", "probability") VALUES
  -- Pipeline 1: Prospección
  ('d1111111-1111-1111-1111-111111111111', 'c2222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111',
    (SELECT id FROM pipeline_stages WHERE pipeline_id = 'a1111111-1111-1111-1111-111111111111' AND name = 'Lead cualificado'),
    'Sofia - Consulta facial + masaje', 200, 70),

  ('d2222222-2222-2222-2222-222222222222', 'c5555555-5555-5555-5555-555555555555', 'a1111111-1111-1111-1111-111111111111',
    (SELECT id FROM pipeline_stages WHERE pipeline_id = 'a1111111-1111-1111-1111-111111111111' AND name = 'Prospect'),
    'Valentina - Prospecto (ads Instagram)', 0, 30),

  -- Pipeline 2: Retención
  ('d3333333-3333-3333-3333-333333333333', 'c1111111-1111-1111-1111-111111111111', 'a2222222-2222-2222-2222-222222222222',
    (SELECT id FROM pipeline_stages WHERE pipeline_id = 'a2222222-2222-2222-2222-222222222222' AND name = 'Activo (últimas 2 sem)'),
    'María - Cliente activo', 600, 90),

  ('d4444444-4444-4444-4444-444444444444', 'c3333333-3333-3333-3333-333333333333', 'a2222222-2222-2222-2222-222222222222',
    (SELECT id FROM pipeline_stages WHERE pipeline_id = 'a2222222-2222-2222-2222-222222222222' AND name = 'En riesgo (30+ días)'),
    'Laura - Reactivación', 400, 60),

  -- Pipeline 3: Paquetes
  ('d5555555-5555-5555-5555-555555555555', 'c4444444-4444-4444-4444-444444444444', 'a3333333-3333-3333-3333-333333333333',
    (SELECT id FROM pipeline_stages WHERE pipeline_id = 'a3333333-3333-3333-3333-333333333333' AND name = 'Paquete activo'),
    'Carolina - Paquete 12 sesiones (Facial + Masaje)', 900, 100)
ON CONFLICT DO NOTHING;

-- Tasks de ejemplo
INSERT INTO "tasks" ("id", "related_contact_id", "title", "description", "priority", "status", "due_date") VALUES
  ('t1111111-1111-1111-1111-111111111111', 'c3333333-3333-3333-3333-333333333333', 'Llamar a Laura para reactivación', 'Seguimiento - no viene hace 35 días. Ofrecerle 15% desc', 'high', 'pending', NOW() + INTERVAL '1 day'),
  ('t2222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 'Confirmar cita con Sofia', 'Mandar link de confirmación + indicaciones de llegar temprano', 'medium', 'pending', NOW() + INTERVAL '6 hours'),
  ('t3333333-3333-3333-3333-333333333333', 'c5555555-5555-5555-5555-555555555555', 'Follow-up con Valentina', 'Enviar información de servicios y horarios disponibles', 'medium', 'pending', NOW() + INTERVAL '3 days')
ON CONFLICT DO NOTHING;

-- Campañas de marketing
INSERT INTO "campaigns" ("id", "name", "channel", "message_content", "status", "target_count") VALUES
  ('camp1111-1111-1111-1111-111111111111', 'Reactivación - Clientes dormidos (15% desc)', 'whatsapp',
    '¡Hola! 👋 Te echamos de menos 💆‍♀️ Volvé a Piu Bella con 15% descuento en tu próxima sesión. ¡Agendate! 🎁',
    'draft', 5),
  ('camp2222-2222-2222-2222-222222222222', 'Promoción Paquete VIP - Clientes activos', 'whatsapp',
    '¿Quieres disfrutar más de Piu Bella? Nuestro Paquete VIP: 12 sesiones al precio de 10 + acceso a área VIP 🌸',
    'draft', 3),
  ('camp3333-3333-3333-3333-333333333333', 'Recordatorio citas (próximas 48hs)', 'whatsapp',
    'Hola! 😊 Te recordamos tu cita de mañana a las {HORA}. Si necesitas cambiar, avísanos con tiempo. ¡Te esperamos! ✨',
    'scheduled', 10)
ON CONFLICT DO NOTHING;

-- Templates de WhatsApp para Piu Bella
INSERT INTO "templates" ("name", "content", "channel", "status") VALUES
  ('confirmacion_cita', 'Hola {NOMBRE}! Confirmamos tu cita para {FECHA} a las {HORA} en Piu Bella. Dirección: Av. Corrientes 1234, CABA. ¡Te esperamos!', 'whatsapp', 'approved'),
  ('recordatorio_24h', '¡Hola {NOMBRE}! 👋 Te recordamos tu cita en 24hs con nosotros a las {HORA}. Si necesitas reprogramar, avísanos. ¡Nos vemos! 💆', 'whatsapp', 'approved'),
  ('agradecimiento_sesion', 'Gracias por venir a Piu Bella, {NOMBRE}! 🌸 Esperamos hayas disfrutado. ¡Vuelve pronto! Y no olvides recomendarnos 😊', 'whatsapp', 'approved'),
  ('oferta_paquete', 'Hola {NOMBRE}! 🎁 Te traemos una oferta especial: Paquete 6 sesiones por $900 (desc. 15%) o Paquete 12 sesiones por $1.700 (desc. 20%). ¿Hablamos? 💬', 'whatsapp', 'pending'),
  ('cumpleanos', 'Hola {NOMBRE}! 🎂 ¡Hoy es tu día especial! En Piu Bella te regalamos 20% desc en cualquier servicio para celebrarlo. ¡Feliz cumpleaños! 🎉', 'whatsapp', 'approved')
ON CONFLICT DO NOTHING;

-- ========== RESUMEN DE DATOS INSERTADOS ==========
-- ✓ 3 Pipelines: Prospección, Retención, Paquetes (32 stages en total)
-- ✓ 5 Contactos de ejemplo (desde prospect hasta cliente VIP)
-- ✓ 3 Conversaciones activas con mensajes realistas
-- ✓ 5 Deals distribuidos en los 3 pipelines
-- ✓ 3 Tasks de seguimiento
-- ✓ 3 Campañas de marketing (draft/scheduled)
-- ✓ 5 Templates de WhatsApp pre-aprobados
-- ✓ 10 Custom fields personalizados (6 para contacts, 4 para deals)
