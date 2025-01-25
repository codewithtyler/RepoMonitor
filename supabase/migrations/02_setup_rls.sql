-- Enable RLS on all tables
DO $$
DECLARE
    t RECORD;
BEGIN
    FOR t IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public')
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t.tablename);
    END LOOP;
END $$;

-- Drop all existing policies
DO $$
DECLARE
    t RECORD;
    p RECORD;
BEGIN
    FOR t IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public')
    LOOP
        FOR p IN (
            SELECT policyname
            FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = t.tablename
        )
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', p.policyname, t.tablename);
        END LOOP;
    END LOOP;
END $$;

-- Helper functions for repository access
CREATE OR REPLACE FUNCTION public.can_read_repository(repository_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- User can read if they own the repository or are a collaborator
    RETURN EXISTS (
        SELECT 1 FROM public.repositories r
        WHERE r.id = repository_id
        AND (
            r.analyzed_by_user_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.repository_collaborators rc
                WHERE rc.repository_id = r.id
                AND rc.user_id = auth.uid()
            )
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.can_write_repository(repository_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- User can write if they own the repository or are a collaborator with write access
    RETURN EXISTS (
        SELECT 1 FROM public.repositories r
        WHERE r.id = repository_id
        AND (
            r.analyzed_by_user_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.repository_collaborators rc
                WHERE rc.repository_id = r.id
                AND rc.user_id = auth.uid()
                AND rc.can_write = true
            )
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.owns_repository(repository_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- User owns the repository
    RETURN EXISTS (
        SELECT 1 FROM public.repositories r
        WHERE r.id = repository_id
        AND r.analyzed_by_user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Repository policies
CREATE POLICY "Users can view repositories they own or collaborate on"
    ON public.repositories FOR SELECT
    USING (
        analyzed_by_user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.repository_collaborators rc
            WHERE rc.repository_id = id
            AND rc.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update repositories they own"
    ON public.repositories FOR UPDATE
    USING (analyzed_by_user_id = auth.uid());

CREATE POLICY "Users can delete repositories they own"
    ON public.repositories FOR DELETE
    USING (analyzed_by_user_id = auth.uid());

CREATE POLICY "Users can insert repositories"
    ON public.repositories FOR INSERT
    WITH CHECK (true);

-- Repository collaborator policies
CREATE POLICY "Users can view collaborators for repositories they can read"
    ON public.repository_collaborators FOR SELECT
    USING (can_read_repository(repository_id));

CREATE POLICY "Users can manage collaborators for repositories they own"
    ON public.repository_collaborators FOR ALL
    USING (owns_repository(repository_id))
    WITH CHECK (owns_repository(repository_id));

-- Analysis job policies
CREATE POLICY "Users can view analysis jobs for repositories they can read"
    ON public.analysis_jobs FOR SELECT
    USING (can_read_repository(repository_id));

CREATE POLICY "Users can create analysis jobs for repositories they can write to"
    ON public.analysis_jobs FOR INSERT
    WITH CHECK (can_write_repository(repository_id));

CREATE POLICY "Users can update analysis jobs for repositories they can write to"
    ON public.analysis_jobs FOR UPDATE
    USING (can_write_repository(repository_id));

CREATE POLICY "Users can delete analysis jobs for repositories they own"
    ON public.analysis_jobs FOR DELETE
    USING (owns_repository(repository_id));

-- Issue policies
CREATE POLICY "Users can view issues for repositories they can read"
    ON public.issues FOR SELECT
    USING (can_read_repository(repository_id));

CREATE POLICY "Users can manage issues for repositories they can write to"
    ON public.issues FOR ALL
    USING (can_write_repository(repository_id))
    WITH CHECK (can_write_repository(repository_id));

-- Duplicate issue policies
CREATE POLICY "Users can view duplicate issues for repositories they can read"
    ON public.duplicate_issues FOR SELECT
    USING (can_read_repository(repository_id));

CREATE POLICY "Users can manage duplicate issues for repositories they can write to"
    ON public.duplicate_issues FOR ALL
    USING (can_write_repository(repository_id))
    WITH CHECK (can_write_repository(repository_id));

-- Notification policies
CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
    ON public.notifications FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications"
    ON public.notifications FOR DELETE
    USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (true);

-- GitHub token policies
CREATE POLICY "Users can view their own GitHub tokens"
    ON public.github_tokens FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own GitHub tokens"
    ON public.github_tokens FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Favorite repositories policies
CREATE POLICY "Users can view their own favorite repositories"
    ON public.favorite_repositories FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can add their own favorite repositories"
    ON public.favorite_repositories FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove their own favorite repositories"
    ON public.favorite_repositories FOR DELETE
    USING (user_id = auth.uid());

-- Tracked repositories policies
CREATE POLICY "Users can view their own tracked repositories"
    ON public.tracked_repositories FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can add their own tracked repositories"
    ON public.tracked_repositories FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own tracked repositories"
    ON public.tracked_repositories FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can remove their own tracked repositories"
    ON public.tracked_repositories FOR DELETE
    USING (user_id = auth.uid());

-- Search history policies
CREATE POLICY "Users can view their own search history"
    ON public.search_history FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can add to their own search history"
    ON public.search_history FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own search history"
    ON public.search_history FOR DELETE
    USING (user_id = auth.uid());
