-- Create enum for embedding status
DO $$ BEGIN
    CREATE TYPE embedding_status_type AS ENUM (
        'pending',
        'processing',
        'completed',
        'error',
        'rate_limited',
        'invalid_content',
        'timeout',
        'network_error',
        'api_error'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Add embedding_status column to analysis_job_items
ALTER TABLE analysis_job_items
ADD COLUMN IF NOT EXISTS embedding_status embedding_status_type NOT NULL DEFAULT 'pending';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_analysis_job_items_embedding_status ON analysis_job_items(embedding_status);
