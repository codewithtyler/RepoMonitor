-- Add job_id column if it doesn't exist
ALTER TABLE duplicate_issues
ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES analysis_jobs(id) ON DELETE CASCADE;

-- Add repository_id column to duplicate_issues table
ALTER TABLE duplicate_issues
ADD COLUMN IF NOT EXISTS repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_duplicate_issues_repository_id ON duplicate_issues(repository_id);
CREATE INDEX IF NOT EXISTS idx_duplicate_issues_job_id ON duplicate_issues(job_id);

-- Update existing records to set repository_id based on analysis_jobs table
WITH job_repositories AS (
  SELECT id as job_id, repository_id
  FROM analysis_jobs
)
UPDATE duplicate_issues
SET repository_id = jr.repository_id
FROM job_repositories jr
WHERE duplicate_issues.job_id = jr.job_id
AND duplicate_issues.repository_id IS NULL;
