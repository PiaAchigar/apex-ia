-- ============================================================
-- Apex IA — Migración dual-database
-- Aplicar en MI Supabase (base centralizada)
-- ============================================================

-- Agregar campos de Mercado Pago y setup timeline a organizations
ALTER TABLE "organizations"
  ADD COLUMN IF NOT EXISTS "mp_customer_id"      VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "mp_subscription_id"  VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "mp_status"            TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS "paid_at"              TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "setup_completed_at"   TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "setup_deadline"       TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "is_setup_blocked"     BOOLEAN DEFAULT FALSE;

-- Actualizar plan default de 'free' a 'starter'
UPDATE "organizations" SET "plan" = 'starter' WHERE "plan" = 'free';

-- Nueva tabla: organizations_db (credenciales encriptadas del Supabase del cliente)
CREATE TABLE IF NOT EXISTS "organizations_db" (
  "id"                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id"       UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "encrypted_database_url" TEXT NOT NULL,
  "supabase_project_url"  VARCHAR(255),
  "database_name"         VARCHAR(100),
  "is_active"             BOOLEAN DEFAULT TRUE,
  "last_connection_test"  TIMESTAMP,
  "last_connection_success" BOOLEAN,
  "created_at"            TIMESTAMP DEFAULT NOW(),
  "updated_at"            TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_organizations_db_org_id"
  ON "organizations_db"("organization_id");

CREATE UNIQUE INDEX IF NOT EXISTS "idx_organizations_db_org_unique"
  ON "organizations_db"("organization_id")
  WHERE "is_active" = TRUE;
