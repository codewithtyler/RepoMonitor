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