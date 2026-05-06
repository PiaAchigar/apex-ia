-- Add branding columns to organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7) DEFAULT '#10B981';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS accent_color VARCHAR(7) DEFAULT '#10B981';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS favicon_url VARCHAR(500);
