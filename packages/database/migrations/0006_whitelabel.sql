-- Add White-Label columns to organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS custom_domain varchar(255);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS whitelabel_enabled boolean NOT NULL DEFAULT false;
