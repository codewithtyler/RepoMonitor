-- Add is_active column to repositories table
ALTER TABLE repositories
ADD COLUMN is_active BOOLEAN DEFAULT TRUE;

-- Make is_active NOT NULL after setting defaults
UPDATE repositories SET is_active = TRUE WHERE is_active IS NULL;
ALTER TABLE repositories ALTER COLUMN is_active SET NOT NULL;
