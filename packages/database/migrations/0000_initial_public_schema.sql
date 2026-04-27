-- ============================================================
-- Apex IA — Migración inicial: schema público
-- Ejecutar en Supabase SQL Editor o via drizzle-kit migrate
-- ============================================================

-- organizations
CREATE TABLE IF NOT EXISTS "organizations" (
  "id"                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug"                  VARCHAR(50) UNIQUE NOT NULL,
  "name"                  VARCHAR(100) NOT NULL,
  "plan"                  TEXT DEFAULT 'free',
  "created_at"            TIMESTAMP DEFAULT NOW()
);

-- users (sincronizado con Supabase Auth)
CREATE TABLE IF NOT EXISTS "users" (
  "id"               UUID PRIMARY KEY,
  "organization_id"  UUID REFERENCES "organizations"("id") ON DELETE CASCADE,
  "email"            VARCHAR(255) NOT NULL,
  "full_name"        VARCHAR(100),
  "role"             TEXT DEFAULT 'agent',
  "permissions_json" JSONB,
  "created_at"       TIMESTAMP DEFAULT NOW()
);

-- audit_logs
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"         UUID,
  "action"          VARCHAR(100) NOT NULL,
  "resource_type"   VARCHAR(50),
  "resource_id"     UUID,
  "old_values_json" JSONB,
  "new_values_json" JSONB,
  "ip_address"      VARCHAR(45),
  "created_at"      TIMESTAMP DEFAULT NOW()
);

-- channel_index: maps (channelType, externalIdentifier) → organization for webhook routing
CREATE TABLE IF NOT EXISTS "channel_index" (
  "id"                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id"       UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "organization_slug"     VARCHAR(50) NOT NULL,
  "channel_type"          VARCHAR(30) NOT NULL,
  "external_identifier"   VARCHAR(255) NOT NULL,
  "is_active"             BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at"            TIMESTAMP DEFAULT NOW(),
  UNIQUE ("channel_type", "external_identifier")
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS "idx_users_organization_id" ON "users"("organization_id");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_user_id" ON "audit_logs"("user_id");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_created_at" ON "audit_logs"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_channel_index_lookup" ON "channel_index"("channel_type", "external_identifier") WHERE "is_active" = TRUE;
