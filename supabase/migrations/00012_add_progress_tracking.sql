-- Add progress tracking fields to analysis_jobs
ALTER TABLE analysis_jobs
ADD COLUMN IF NOT EXISTS last_processed_issue_number integer,
ADD COLUMN IF NOT EXISTS total_issues_count integer,
ADD COLUMN IF NOT EXISTS processed_issues_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS embedded_issues_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS processing_stage text CHECK (processing_stage IN ('fetching', 'embedding', 'analyzing', 'reporting')),
ADD COLUMN IF NOT EXISTS stage_progress integer DEFAULT 0;

-- Add tracking fields to analysis_job_items
ALTER TABLE analysis_job_items
ADD COLUMN IF NOT EXISTS embedding_status text CHECK (embedding_status IN ('pending', 'processing', 'completed', 'error')) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS processed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS error_message text; 