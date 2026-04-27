
-- ============================================================
-- Apex IA — Migración 0003: sistema de roles
-- Reemplaza role TEXT + permissions_json JSONB en users
-- por una tabla roles con FK
-- ============================================================

-- 1. Tabla roles
CREATE TABLE IF NOT EXISTS "roles" (
  "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"             VARCHAR(50) UNIQUE NOT NULL,
  "display_name"     VARCHAR(100) NOT NULL,
  "permissions_json" JSONB NOT NULL,
  "is_system"        BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at"       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_roles_name" ON "roles"("name");

-- 2. Seed de roles del sistema (idempotente)
INSERT INTO "roles" ("name", "display_name", "permissions_json", "is_system") VALUES
(
  'admin',
  'Administrador',
  '{
    "inbox":        {"read": true,  "write": true},
    "contacts":     {"read": true,  "write": true},
    "pipeline":     {"read": true,  "write": true},
    "tasks":        {"read": true,  "write": true},
    "calendar":     {"read": true,  "write": true},
    "campaigns":    {"read": true,  "write": true},
    "flowBuilder":  {"read": true,  "write": true},
    "templates":    {"read": true,  "write": true},
    "analytics":    {"read": true},
    "reports":      {"read": true},
    "callLogs":     {"read": true},
    "settings":     {"read": true,  "write": true},
    "team":         {"read": true,  "write": true},
    "billing":      {"read": true,  "write": true},
    "apiAccess":    {"read": true,  "write": true},
    "aiCredentials":{"read": true,  "write": true}
  }',
  TRUE
),
(
  'prime',
  'Prime',
  '{
    "inbox":        {"read": true,  "write": true},
    "contacts":     {"read": true,  "write": true},
    "pipeline":     {"read": true,  "write": true},
    "tasks":        {"read": true,  "write": true},
    "calendar":     {"read": true,  "write": true},
    "campaigns":    {"read": true,  "write": true},
    "flowBuilder":  {"read": true,  "write": true},
    "templates":    {"read": true,  "write": true},
    "analytics":    {"read": true},
    "reports":      {"read": true},
    "callLogs":     {"read": true},
    "settings":     {"read": true,  "write": true},
    "team":         {"read": true,  "write": false},
    "billing":      {"read": true,  "write": false},
    "apiAccess":    {"read": true,  "write": true},
    "aiCredentials":{"read": true,  "write": false}
  }',
  TRUE
),
(
  'standard',
  'Estándar',
  '{
    "inbox":        {"read": true,  "write": true},
    "contacts":     {"read": true,  "write": false},
    "pipeline":     {"read": true,  "write": true},
    "tasks":        {"read": true,  "write": true},
    "calendar":     {"read": true,  "write": false},
    "campaigns":    {"read": false, "write": false},
    "flowBuilder":  {"read": false, "write": false},
    "templates":    {"read": true,  "write": false},
    "analytics":    {"read": false},
    "reports":      {"read": false},
    "callLogs":     {"read": false},
    "settings":     {"read": false, "write": false},
    "team":         {"read": false, "write": false},
    "billing":      {"read": false, "write": false},
    "apiAccess":    {"read": false, "write": false},
    "aiCredentials":{"read": false, "write": false}
  }',
  TRUE
),
(
  'ai_agent',
  'Agente IA',
  '{
    "inbox":        {"read": true,  "write": true},
    "contacts":     {"read": true,  "write": false},
    "pipeline":     {"read": false, "write": false},
    "tasks":        {"read": false, "write": false},
    "calendar":     {"read": false, "write": false},
    "campaigns":    {"read": false, "write": false},
    "flowBuilder":  {"read": false, "write": false},
    "templates":    {"read": false, "write": false},
    "analytics":    {"read": false},
    "reports":      {"read": false},
    "callLogs":     {"read": false},
    "settings":     {"read": false, "write": false},
    "team":         {"read": false, "write": false},
    "billing":      {"read": false, "write": false},
    "apiAccess":    {"read": false, "write": false},
    "aiCredentials":{"read": false, "write": false}
  }',
  TRUE
)
ON CONFLICT ("name") DO NOTHING;

-- 3. Agregar role_id a users (nullable inicialmente para la migración)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role_id" UUID REFERENCES "roles"("id");

-- 4. Migrar datos existentes: role TEXT → role_id FK
UPDATE "users" u
SET "role_id" = r.id
FROM "roles" r
WHERE (u.role = 'admin'     AND r.name = 'admin')
   OR (u.role = 'agent'     AND r.name = 'standard')
   OR (u.role NOT IN ('admin', 'agent') AND r.name = 'standard');

-- 5. Usuarios sin role (safety net) → standard
UPDATE "users"
SET "role_id" = (SELECT id FROM "roles" WHERE name = 'standard' LIMIT 1)
WHERE "role_id" IS NULL;

-- 6. Eliminar columnas obsoletas
ALTER TABLE "users" DROP COLUMN IF EXISTS "role";
ALTER TABLE "users" DROP COLUMN IF EXISTS "permissions_json";

-- Índice para joins frecuentes
CREATE INDEX IF NOT EXISTS "idx_users_role_id" ON "users"("role_id");
