-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "vector";

-- Repositories table
CREATE TABLE repositories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    github_id INTEGER UNIQUE NOT NULL,
    name TEXT NOT NULL,
    owner TEXT NOT NULL,
    last_analysis_timestamp TIMESTAMP WITH TIME ZONE,
    analyzed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    repository_permissions JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Analysis table
CREATE TABLE analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(repository_id) -- Ensure only one analysis per repository
);

-- Issues table
CREATE TABLE issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    github_id INTEGER NOT NULL,
    repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    labels JSONB,
    embedding vector(1536), -- For text-embedding-3-small model
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(github_id, repository_id)
);

-- Duplicates table
CREATE TABLE duplicates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID REFERENCES analyses(id) ON DELETE CASCADE,
    original_issue_id UUID REFERENCES issues(id) ON DELETE CASCADE,
    duplicate_issue_id UUID REFERENCES issues(id) ON DELETE CASCADE,
    confidence_score FLOAT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(analysis_id, original_issue_id, duplicate_issue_id)
);

-- Create indexes for performance
CREATE INDEX idx_repositories_analyzed_by_user ON repositories(analyzed_by_user_id);
CREATE INDEX idx_issues_repository_id ON issues(repository_id);
CREATE INDEX idx_duplicates_analysis_id ON duplicates(analysis_id);
CREATE INDEX idx_issues_embedding ON issues USING ivfflat (embedding vector_cosine_ops);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_repositories_updated_at
    BEFORE UPDATE ON repositories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analyses_updated_at
    BEFORE UPDATE ON analyses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_issues_updated_at
    BEFORE UPDATE ON issues
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up old analysis data
CREATE OR REPLACE FUNCTION cleanup_old_analysis()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete old duplicates for this repository
    DELETE FROM duplicates
    WHERE analysis_id IN (
        SELECT id FROM analyses
        WHERE repository_id = NEW.repository_id
        AND id != NEW.id
    );

    -- Delete old analyses for this repository
    DELETE FROM analyses
    WHERE repository_id = NEW.repository_id
    AND id != NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_old_analysis_trigger
    AFTER INSERT ON analyses
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_old_analysis();

-- RLS Policies
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE duplicates ENABLE ROW LEVEL SECURITY;

-- Repository access policies
CREATE POLICY repositories_read_access ON repositories
    FOR SELECT
    USING (
        analyzed_by_user_id = auth.uid() OR
        repository_permissions->>'public' = 'true' OR
        repository_permissions->>'private' = 'true'
    );

-- Analysis access policies
CREATE POLICY analyses_read_access ON analyses
    FOR SELECT
    USING (
        created_by = auth.uid() OR
        is_public = true OR
        EXISTS (
            SELECT 1 FROM repositories r
            WHERE r.id = repository_id
            AND (r.repository_permissions->>'private' = 'true')
        )
    );

-- Issues access follows repository access
CREATE POLICY issues_read_access ON issues
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM repositories r
            WHERE r.id = repository_id
            AND (
                r.analyzed_by_user_id = auth.uid() OR
                r.repository_permissions->>'public' = 'true' OR
                r.repository_permissions->>'private' = 'true'
            )
        )
    );

-- Duplicates access follows analysis access
CREATE POLICY duplicates_read_access ON duplicates
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM analyses a
            WHERE a.id = analysis_id
            AND (
                a.created_by = auth.uid() OR
                a.is_public = true OR
                EXISTS (
                    SELECT 1 FROM repositories r
                    WHERE r.id = a.repository_id
                    AND r.repository_permissions->>'private' = 'true'
                )
            )
        )
    );