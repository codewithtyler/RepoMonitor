-- Add is_public column to repositories
ALTER TABLE repositories ADD COLUMN is_public BOOLEAN DEFAULT FALSE;

-- Make is_public NOT NULL after setting defaults
ALTER TABLE repositories ALTER COLUMN is_public SET NOT NULL;

-- Create permissions table
CREATE TABLE repository_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    can_read BOOLEAN DEFAULT FALSE,
    can_write BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(repository_id, user_id)
);

-- Enable RLS
ALTER TABLE repository_permissions ENABLE ROW LEVEL SECURITY;

-- Create policy for repository permissions
CREATE POLICY "Users can read their own permissions"
    ON repository_permissions
    FOR SELECT
    USING (user_id = auth.uid());

-- Function to check if a user can access an analysis
CREATE OR REPLACE FUNCTION can_access_analysis(
    p_analysis_id UUID,
    p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_repository_id UUID;
    v_is_public BOOLEAN;
    v_has_permission BOOLEAN;
BEGIN
    -- Get repository info
    SELECT 
        r.id,
        r.is_public,
        EXISTS (
            SELECT 1 FROM repository_permissions p
            WHERE p.repository_id = r.id
            AND p.user_id = p_user_id
            AND p.can_read = true
        ) INTO v_repository_id, v_is_public, v_has_permission
    FROM analyses a
    JOIN repositories r ON r.id = a.repository_id
    WHERE a.id = p_analysis_id;

    -- Return true if public or has permission
    RETURN v_is_public OR v_has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;