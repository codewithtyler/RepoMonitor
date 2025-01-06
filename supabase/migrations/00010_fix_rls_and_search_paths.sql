-- Enable RLS for duplicate_issues table
ALTER TABLE public.duplicate_issues ENABLE ROW LEVEL SECURITY;

-- Enable RLS for repositories table
ALTER TABLE public.repositories ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS duplicate_issues_access ON public.duplicate_issues;

-- Create policy for duplicate_issues
CREATE POLICY duplicate_issues_access ON public.duplicate_issues
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.repositories r
            WHERE r.id = (
                SELECT repository_id FROM public.issues
                WHERE id = source_issue_id
            )
            AND (
                r.analyzed_by_user_id = auth.uid() OR
                r.repository_permissions->>'public' = 'true' OR
                r.repository_permissions->>'private' = 'true'
            )
        )
    );

-- Drop existing policies if they exist
DROP POLICY IF EXISTS repositories_insert_policy ON public.repositories;
DROP POLICY IF EXISTS repositories_update_policy ON public.repositories;
DROP POLICY IF EXISTS repositories_all_policy ON public.repositories;
DROP POLICY IF EXISTS repositories_read_access ON public.repositories;
DROP POLICY IF EXISTS repositories_read_policy ON public.repositories;

-- Create policy to allow authenticated users to insert repositories
CREATE POLICY repositories_insert_policy ON public.repositories
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Create policy to allow updates for authenticated users
CREATE POLICY repositories_update_policy ON public.repositories
    FOR UPDATE
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Create policy to control read access
CREATE POLICY repositories_read_access ON public.repositories
    FOR SELECT
    TO public
    USING (
        analyzed_by_user_id = (SELECT auth.uid()) OR 
        (repository_permissions->>'public') = 'true' OR 
        (repository_permissions->>'private') = 'true' OR 
        (SELECT auth.uid() IN (
            SELECT user_id
            FROM repository_permissions
            WHERE repository_permissions.repository_id = repositories.id 
            AND repository_permissions.can_read = true
        ))
    );

-- Drop existing triggers
DROP TRIGGER IF EXISTS update_repositories_updated_at ON public.repositories;
DROP TRIGGER IF EXISTS update_analyses_updated_at ON public.analyses;
DROP TRIGGER IF EXISTS update_issues_updated_at ON public.issues;
DROP TRIGGER IF EXISTS update_github_tokens_updated_at ON public.github_tokens;
DROP TRIGGER IF EXISTS cleanup_old_analysis_trigger ON public.analyses;
DROP TRIGGER IF EXISTS encrypt_github_token_trigger ON public.github_tokens;

-- Drop existing functions
DROP FUNCTION IF EXISTS public.release_job_lock(uuid);
DROP FUNCTION IF EXISTS public.update_job_progress(uuid, integer);
DROP FUNCTION IF EXISTS public.find_similar_issues(uuid, double precision);
DROP FUNCTION IF EXISTS public.update_updated_at_column();
DROP FUNCTION IF EXISTS public.cleanup_old_analysis();
DROP FUNCTION IF EXISTS public.acquire_job_lock(text, integer);
DROP FUNCTION IF EXISTS public.can_access_analysis(uuid, uuid);
DROP FUNCTION IF EXISTS public.decrypt_github_token(text);
DROP FUNCTION IF EXISTS public.encrypt_github_token();

-- Create release_job_lock function
CREATE OR REPLACE FUNCTION public.release_job_lock(lock_id uuid)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
AS $$
BEGIN
    DELETE FROM public.job_locks WHERE id = lock_id;
END;
$$;

-- Create update_job_progress function
CREATE OR REPLACE FUNCTION public.update_job_progress(job_id uuid, progress integer)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
AS $$
BEGIN
    UPDATE public.job_locks
    SET progress = progress,
        updated_at = NOW()
    WHERE id = job_id;
END;
$$;

-- Create find_similar_issues function
CREATE OR REPLACE FUNCTION public.find_similar_issues(issue_id uuid, similarity_threshold float)
    RETURNS TABLE (
        duplicate_issue_id uuid,
        similarity float
    )
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        i.id as duplicate_issue_id,
        1 - (i.embedding <=> (SELECT embedding FROM issues WHERE id = issue_id)) as similarity
    FROM issues i
    WHERE i.repository_id = (SELECT repository_id FROM issues WHERE id = issue_id)
    AND i.id != issue_id
    AND 1 - (i.embedding <=> (SELECT embedding FROM issues WHERE id = issue_id)) >= similarity_threshold
    ORDER BY similarity DESC;
END;
$$;

-- Create update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Create cleanup_old_analysis function
CREATE OR REPLACE FUNCTION public.cleanup_old_analysis()
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
AS $$
BEGIN
    DELETE FROM public.analysis_results
    WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$;

-- Create acquire_job_lock function
CREATE OR REPLACE FUNCTION public.acquire_job_lock(job_type text, timeout_seconds integer)
    RETURNS uuid
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
AS $$
DECLARE
    lock_id uuid;
BEGIN
    DELETE FROM public.job_locks
    WHERE created_at < NOW() - (timeout_seconds || ' seconds')::interval;

    lock_id := gen_random_uuid();

    INSERT INTO public.job_locks (id, job_type, progress)
    VALUES (lock_id, job_type, 0);
    RETURN lock_id;
END;
$$;

-- Create can_access_analysis function
CREATE OR REPLACE FUNCTION public.can_access_analysis(user_id uuid, repository_id uuid)
    RETURNS boolean
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.repositories r
        WHERE r.id = repository_id
        AND (
            r.analyzed_by_user_id = user_id OR
            r.repository_permissions->>'public' = 'true' OR
            r.repository_permissions->>'private' = 'true' OR
            user_id IN (
                SELECT user_id
                FROM public.repository_permissions
                WHERE repository_id = r.id
                AND can_read = true
            )
        )
    );
END;
$$;

-- Create decrypt_github_token function
CREATE OR REPLACE FUNCTION public.decrypt_github_token(encrypted_token text)
    RETURNS text
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
AS $$
DECLARE
    decrypted_token text;
BEGIN
    SELECT convert_from(
        decrypt(
            decode(encrypted_token, 'base64'),
            current_setting('app.jwt_secret'),
            'aes'
        ),
        'utf8'
    ) INTO decrypted_token;

    RETURN decrypted_token;
END;
$$;

-- Create encrypt_github_token function
CREATE OR REPLACE FUNCTION public.encrypt_github_token(token text)
    RETURNS text
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
AS $$
DECLARE
    encrypted_token text;
BEGIN
    SELECT encode(
        encrypt(
            convert_to(token, 'utf8'),
            current_setting('app.jwt_secret'),
            'aes'
        ),
        'base64'
    ) INTO encrypted_token;
    RETURN encrypted_token;
END;
$$;