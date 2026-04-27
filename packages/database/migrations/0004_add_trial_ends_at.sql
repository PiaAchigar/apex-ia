-- Add trial_ends_at column to organizations table
ALTER TABLE organizations ADD COLUMN trial_ends_at TIMESTAMP;

-- Set trial_ends_at for existing organizations (14 days from creation)
UPDATE organizations SET trial_ends_at = created_at + INTERVAL '14 days' WHERE trial_ends_at IS NULL;
