-- Add retry tracking fields to analysis_job_items
ALTER TABLE analysis_job_items
ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_retry_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS error_message text;

-- Add failure tracking to analysis_jobs
ALTER TABLE analysis_jobs
ADD COLUMN IF NOT EXISTS failed_items_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS error text; 