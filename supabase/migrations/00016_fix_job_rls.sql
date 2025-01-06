-- Drop existing policies
DROP POLICY IF EXISTS read_own_jobs ON analysis_jobs;
DROP POLICY IF EXISTS read_own_job_items ON analysis_job_items;

-- Create comprehensive policies for analysis_jobs
CREATE POLICY "Users can read their own jobs" ON analysis_jobs
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

CREATE POLICY "Users can insert jobs" ON analysis_jobs
    FOR INSERT
    WITH CHECK (
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

CREATE POLICY "Users can update their own jobs" ON analysis_jobs
    FOR UPDATE
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

CREATE POLICY "Users can delete their own jobs" ON analysis_jobs
    FOR DELETE
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

-- Create comprehensive policies for analysis_job_items
CREATE POLICY "Users can read their own job items" ON analysis_job_items
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

CREATE POLICY "Users can insert job items" ON analysis_job_items
    FOR INSERT
    WITH CHECK (
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

CREATE POLICY "Users can update their own job items" ON analysis_job_items
    FOR UPDATE
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

CREATE POLICY "Users can delete their own job items" ON analysis_job_items
    FOR DELETE
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

-- Create bypass policy for service role
CREATE POLICY "Service role has full access to jobs" ON analysis_jobs
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role has full access to job items" ON analysis_job_items
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
