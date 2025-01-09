-- Drop existing function
DROP FUNCTION IF EXISTS find_similar_issues(uuid, float);

-- Create new function to find similar issues within a job
CREATE OR REPLACE FUNCTION find_similar_issues(
    p_job_id UUID,
    p_similarity_threshold FLOAT DEFAULT 0.9
)
RETURNS void AS $$
BEGIN
    -- Insert similar issue pairs into duplicates table
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
            AND b.embedding_status = 'completed'
            ORDER BY a.embedding <=> b.embedding
            LIMIT 5  -- Only check top 5 most similar issues
        ) b
        WHERE a.job_id = p_job_id
        AND a.embedding IS NOT NULL
        AND a.embedding_status = 'completed'
        AND (1 - (a.embedding <=> b.embedding)) >= p_similarity_threshold
    )
    INSERT INTO duplicate_issues (
        repository_id,
        source_issue_id,
        duplicate_issue_id,
        confidence_score,
        created_at
    )
    SELECT
        (SELECT repository_id FROM analysis_jobs WHERE id = p_job_id),
        original_id,
        duplicate_id,
        similarity,
        CURRENT_TIMESTAMP
    FROM issue_pairs;

    -- Update the job progress to 100%
    UPDATE analysis_jobs
    SET stage_progress = 100,
        last_processed_at = CURRENT_TIMESTAMP
    WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql;
