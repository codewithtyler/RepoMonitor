-- Add stage number tracking
ALTER TABLE analysis_jobs
ADD COLUMN IF NOT EXISTS processing_stage_number integer DEFAULT 1; 