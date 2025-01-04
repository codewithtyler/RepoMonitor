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