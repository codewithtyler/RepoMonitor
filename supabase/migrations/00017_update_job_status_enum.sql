-- Drop the existing enum type first
DO $$ BEGIN
    DROP TYPE IF EXISTS job_status CASCADE;
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- Create new job_status enum with correct states
CREATE TYPE job_status AS ENUM (
    'fetching',      -- Stage 1: Fetching issues from GitHub
    'processing',    -- Stage 2: Processing embeddings
    'analyzing',     -- Stage 3: Analyzing for duplicates
    'completed',     -- Job finished successfully
    'failed',        -- Job encountered an error
    'cancelled'      -- Job was manually cancelled
);

-- Update the analysis_jobs table to use the new enum
ALTER TABLE analysis_jobs
    ALTER COLUMN status TYPE job_status USING status::text::job_status;
