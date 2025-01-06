-- Add indexes for job tracking fields
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_status_stage ON analysis_jobs(status, processing_stage);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_repository_status ON analysis_jobs(repository_id, status);

-- Add indexes for job items tracking
CREATE INDEX IF NOT EXISTS idx_job_items_status_embedding ON analysis_job_items(job_id, embedding_status);
CREATE INDEX IF NOT EXISTS idx_job_items_retry ON analysis_job_items(job_id, retry_count);
CREATE INDEX IF NOT EXISTS idx_job_items_processed ON analysis_job_items(job_id, processed_at); 