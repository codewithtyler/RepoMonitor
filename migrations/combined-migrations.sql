-- Combined migrations

-- Migration: 00001_initial_schema.sql
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

-- Migration: 00002_job_queue.sql
-- Enum for job status
CREATE TYPE job_status AS ENUM ('queued', 'processing', 'completed', 'failed');
CREATE TYPE job_step AS ENUM ('fetching_issues', 'generating_embeddings', 'finding_duplicates');

-- Jobs table
CREATE TABLE analysis_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
    status job_status NOT NULL DEFAULT 'queued',
    progress FLOAT DEFAULT 0,
    current_step job_step,
    error TEXT,
    last_processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    -- Lock mechanism
    locked_until TIMESTAMP WITH TIME ZONE,
    lock_identifier TEXT
);

-- Job items table (individual issues to process)
CREATE TABLE analysis_job_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES analysis_jobs(id) ON DELETE CASCADE,
    issue_number INTEGER NOT NULL,
    issue_title TEXT NOT NULL,
    issue_body TEXT,
    status job_status NOT NULL DEFAULT 'queued',
    embedding vector(1536),
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    -- For batching
    batch_number INTEGER,
    UNIQUE(job_id, issue_number)
);

-- Index for job processing
CREATE INDEX idx_jobs_status_locked ON analysis_jobs(status, locked_until)
WHERE status = 'queued' OR status = 'processing';

-- Function to acquire job lock
CREATE OR REPLACE FUNCTION acquire_job_lock(
    worker_id TEXT,
    lock_duration_seconds INTEGER DEFAULT 300
)
RETURNS TABLE (
    job_id UUID,
    repository_id UUID,
    current_step job_step
) AS $$
DECLARE
    now_timestamp TIMESTAMP WITH TIME ZONE := CURRENT_TIMESTAMP;
    lock_until TIMESTAMP WITH TIME ZONE := now_timestamp + (lock_duration_seconds || ' seconds')::INTERVAL;
BEGIN
    RETURN QUERY
    WITH next_job AS (
        SELECT id, repository_id, current_step
        FROM analysis_jobs
        WHERE (status = 'queued' OR (status = 'processing' AND locked_until < now_timestamp))
        AND (locked_until IS NULL OR locked_until < now_timestamp)
        ORDER BY created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
    )
    UPDATE analysis_jobs
    SET 
        status = CASE 
            WHEN status = 'queued' THEN 'processing'::job_status 
            ELSE status 
        END,
        locked_until = lock_until,
        lock_identifier = worker_id,
        last_processed_at = now_timestamp
    FROM next_job
    WHERE analysis_jobs.id = next_job.id
    RETURNING next_job.id, next_job.repository_id, next_job.current_step;
END;
$$ LANGUAGE plpgsql;

-- Function to release job lock
CREATE OR REPLACE FUNCTION release_job_lock(
    p_job_id UUID,
    p_worker_id TEXT,
    p_status job_status DEFAULT 'processing'
)
RETURNS VOID AS $$
BEGIN
    UPDATE analysis_jobs
    SET 
        locked_until = NULL,
        lock_identifier = NULL,
        status = p_status,
        completed_at = CASE 
            WHEN p_status = 'completed' THEN CURRENT_TIMESTAMP 
            ELSE completed_at 
        END
    WHERE id = p_job_id
    AND lock_identifier = p_worker_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update job progress
CREATE OR REPLACE FUNCTION update_job_progress(
    p_job_id UUID,
    p_progress FLOAT,
    p_worker_id TEXT,
    p_step job_step DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE analysis_jobs
    SET 
        progress = p_progress,
        current_step = COALESCE(p_step, current_step),
        last_processed_at = CURRENT_TIMESTAMP
    WHERE id = p_job_id
    AND lock_identifier = p_worker_id;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE analysis_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_job_items ENABLE ROW LEVEL SECURITY;

-- Users can read their own analysis jobs
CREATE POLICY read_own_jobs ON analysis_jobs
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

-- Users can read their own job items
CREATE POLICY read_own_job_items ON analysis_job_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM analysis_jobs aj
            JOIN repositories r ON r.id = aj.repository_id
            WHERE aj.id = job_id
            AND (
                r.analyzed_by_user_id = auth.uid() OR
                r.repository_permissions->>'public' = 'true' OR
                r.repository_permissions->>'private' = 'true'
            )
        )
    ); 

-- Migration: 00003_similarity_function.sql
-- Function to find similar issues using vector similarity
CREATE OR REPLACE FUNCTION find_similar_issues(
    p_job_id UUID,
    p_similarity_threshold FLOAT DEFAULT 0.9
)
RETURNS void AS $$
BEGIN
    -- Insert similar issue pairs into duplicates table
    INSERT INTO duplicates (
        analysis_id,
        original_issue_id,
        duplicate_issue_id,
        confidence_score
    )
    WITH issue_pairs AS (
        -- Find pairs of issues with high similarity
        SELECT 
            a.id as original_id,
            b.id as duplicate_id,
            1 - (a.embedding <=> b.embedding) as similarity  -- Convert distance to similarity
        FROM analysis_job_items a
        CROSS JOIN LATERAL (
            SELECT id, embedding
            FROM analysis_job_items b
            WHERE b.job_id = p_job_id
            AND b.id > a.id  -- Avoid comparing same issue and duplicates
            AND b.embedding IS NOT NULL
            ORDER BY a.embedding <=> b.embedding
            LIMIT 5  -- Only check top 5 most similar issues
        ) b
        WHERE a.job_id = p_job_id
        AND a.embedding IS NOT NULL
        AND (1 - (a.embedding <=> b.embedding)) >= p_similarity_threshold
    )
    SELECT 
        p_job_id,
        original_id,
        duplicate_id,
        similarity
    FROM issue_pairs;

    -- Update the analysis progress to 100%
    UPDATE analysis_jobs
    SET progress = 100
    WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql; 

-- Migration: 00005_vector_storage.sql
-- Enable pgvector extension
create extension if not exists vector;

-- Create issues table with vector storage
create table if not exists issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
  github_issue_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  labels JSONB,
  state TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  embedding vector(1536) NOT NULL,
  UNIQUE(repository_id, github_issue_id)
);

-- Create duplicates table for storing relationships
create table if not exists duplicate_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_issue_id UUID REFERENCES issues(id) ON DELETE CASCADE,
  duplicate_issue_id UUID REFERENCES issues(id) ON DELETE CASCADE,
  confidence_score FLOAT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source_issue_id, duplicate_issue_id)
);

-- Create index for vector similarity search
create index on issues using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Create function to find similar issues
create or replace function find_similar_issues(
  p_repository_id UUID,
  p_embedding vector,
  p_threshold float default 0.95,
  p_limit int default 5
) returns table (
  issue_id UUID,
  title TEXT,
  similarity float
) language plpgsql as $$
begin
  return query
  select
    i.id,
    i.title,
    1 - (i.embedding <=> p_embedding) as similarity
  from issues i
  where i.repository_id = p_repository_id
    and 1 - (i.embedding <=> p_embedding) >= p_threshold
  order by i.embedding <=> p_embedding
  limit p_limit;
end;
$$;

-- Migration: 00006_analysis_sharing.sql
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

-- Migration: 00007_github_tokens.sql
-- Create github_tokens table
CREATE TABLE github_tokens (
    user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    scopes TEXT NOT NULL,
    last_refresh TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Function to encrypt token
CREATE OR REPLACE FUNCTION encrypt_github_token() RETURNS trigger AS $$
BEGIN
    IF NEW.token IS NOT NULL THEN
        NEW.token = encode(
            encrypt(
                NEW.token::bytea,
                current_setting('app.jwt_secret')::bytea,
                'aes'
            ),
            'hex'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt token
CREATE OR REPLACE FUNCTION decrypt_github_token(encrypted_token TEXT) 
RETURNS TEXT AS $$
BEGIN
    RETURN convert_from(
        decrypt(
            decode(encrypted_token, 'hex'),
            current_setting('app.jwt_secret')::bytea,
            'aes'
        ),
        'utf8'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to encrypt token on insert/update
CREATE TRIGGER encrypt_token_trigger
    BEFORE INSERT OR UPDATE OF token ON github_tokens
    FOR EACH ROW
    EXECUTE FUNCTION encrypt_github_token();

-- Trigger for updated_at
CREATE TRIGGER update_github_tokens_updated_at
    BEFORE UPDATE ON github_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE github_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own tokens
CREATE POLICY github_tokens_user_access ON github_tokens
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id); 

