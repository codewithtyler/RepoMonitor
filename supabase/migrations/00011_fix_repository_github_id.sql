-- Fix github_id column in repositories table
ALTER TABLE repositories
  ALTER COLUMN github_id TYPE TEXT,  -- Change from INTEGER to TEXT
  ALTER COLUMN github_id DROP NOT NULL;  -- Make it nullable since we'll be updating existing rows

-- Add is_private column if it doesn't exist
ALTER TABLE repositories
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;

-- Update existing rows to have a github_id in the correct format
UPDATE repositories
SET github_id = owner || '/' || name
WHERE github_id IS NULL OR github_id::text ~ '^\d+$';  -- Only update if NULL or if it's a number

-- Make github_id NOT NULL again now that we've fixed the data
ALTER TABLE repositories
  ALTER COLUMN github_id SET NOT NULL;