-- Add appName column to organizations table
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS app_name VARCHAR(100);

-- Increase logoUrl and faviconUrl length for base64 data URLs
ALTER TABLE public.organizations
ALTER COLUMN logo_url TYPE VARCHAR(5000);

ALTER TABLE public.organizations
ALTER COLUMN favicon_url TYPE VARCHAR(5000);
