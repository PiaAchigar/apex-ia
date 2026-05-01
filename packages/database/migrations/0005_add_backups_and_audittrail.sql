-- Create backups table in public schema
CREATE TABLE IF NOT EXISTS public.backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  file_name varchar(255) NOT NULL,
  storage_bucket varchar(255) NOT NULL,
  storage_path varchar(500) NOT NULL,
  size_bytes integer,
  status varchar(20) NOT NULL DEFAULT 'completed',
  created_at timestamp DEFAULT now()
);

-- Create index on organization_id for efficient queries
CREATE INDEX IF NOT EXISTS backups_org_id_idx ON public.backups(organization_id);

-- Add organizationId column to audit_logs table (if not already present)
ALTER TABLE IF EXISTS public.audit_logs
ADD COLUMN IF NOT EXISTS organization_id uuid;
