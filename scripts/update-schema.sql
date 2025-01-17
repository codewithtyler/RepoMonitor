-- Add new columns to store additional GitHub repository details
ALTER TABLE repositories
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS stargazers_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS forks_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS default_branch TEXT,
ADD COLUMN IF NOT EXISTS topics TEXT[],
ADD COLUMN IF NOT EXISTS language TEXT,
ADD COLUMN IF NOT EXISTS size INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS has_issues BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS license JSONB;

-- Update the repository_permissions JSONB schema comment for documentation
COMMENT ON COLUMN repositories.repository_permissions IS 'JSONB containing: public, private, admin, push, pull permissions';

-- Add indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_repositories_owner_name ON repositories(owner, name);
CREATE INDEX IF NOT EXISTS idx_repositories_github_id ON repositories(github_id);
CREATE INDEX IF NOT EXISTS idx_repositories_analyzed_by_user_id ON repositories(analyzed_by_user_id);
CREATE INDEX IF NOT EXISTS idx_repositories_language ON repositories(language);

-- Update RLS policies to include new fields
DROP POLICY IF EXISTS repositories_read_access ON repositories;
CREATE POLICY repositories_read_access ON repositories
    FOR SELECT
    TO public
    USING (
        analyzed_by_user_id = auth.uid() OR
        (repository_permissions->>'public')::boolean = true OR
        (repository_permissions->>'private')::boolean = true
    );
