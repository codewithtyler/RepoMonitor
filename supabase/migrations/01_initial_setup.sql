-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pgsodium";

-- Create job_status enum type
DO $$ BEGIN
    DROP TYPE IF EXISTS job_status CASCADE;
EXCEPTION
    WHEN others THEN NULL;
END $$;

CREATE TYPE job_status AS ENUM (
    'pending',      -- Initial state
    'fetching',     -- Stage 1: Fetching issues from GitHub
    'processing',   -- Stage 2: Processing embeddings
    'analyzing',    -- Stage 3: Analyzing for duplicates
    'completed',    -- Job finished successfully
    'failed',       -- Job encountered an error
    'cancelled'     -- Job was manually cancelled
);

-- Create repositories table
CREATE TABLE public.repositories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    github_id INTEGER UNIQUE NOT NULL,
    name TEXT NOT NULL,
    owner TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_analysis_timestamp TIMESTAMP WITH TIME ZONE,
    analyzed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    repository_permissions JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create repository_collaborators table
CREATE TABLE public.repository_collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID REFERENCES public.repositories(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    can_read BOOLEAN DEFAULT true,
    can_write BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(repository_id, user_id)
);

-- Create analysis_jobs table
CREATE TABLE public.analysis_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID REFERENCES public.repositories(id) ON DELETE CASCADE,
    status job_status NOT NULL DEFAULT 'pending',
    stage_number INTEGER DEFAULT 1,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    last_processed_at TIMESTAMP WITH TIME ZONE,
    error TEXT,
    results JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create issues table
CREATE TABLE public.issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    github_id INTEGER NOT NULL,
    repository_id UUID REFERENCES public.repositories(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    labels JSONB,
    embedding vector(1536), -- For text-embedding-3-small model
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(github_id, repository_id)
);

-- Create duplicate_issues table
CREATE TABLE public.duplicate_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID REFERENCES public.repositories(id) ON DELETE CASCADE,
    original_issue_number INTEGER NOT NULL,
    duplicate_issue_number INTEGER NOT NULL,
    confidence_score FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(repository_id, original_issue_number, duplicate_issue_number)
);

-- Create notifications table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create github_tokens table
CREATE TABLE public.github_tokens (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    scopes TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Set up GitHub token encryption
DO $$
DECLARE
    encryption_key_id uuid;
BEGIN
    -- Try to get existing key first
    SELECT id INTO encryption_key_id
    FROM pgsodium.key
    WHERE name = 'github_token_key_v1';

    -- Create new key only if it doesn't exist
    IF encryption_key_id IS NULL THEN
        SELECT id INTO encryption_key_id
        FROM pgsodium.create_key(
            name => 'github_token_key_v1',
            raw_key => pgsodium.crypto_aead_det_keygen(),
            key_context => 'github_token',
            key_type => 'aead-det'
        );
    END IF;

    -- Create the encryption function
    EXECUTE
        'CREATE OR REPLACE FUNCTION encrypt_github_token() RETURNS trigger AS $body$
        BEGIN
            IF NEW.token IS NOT NULL THEN
                NEW.token = encode(
                    pgsodium.crypto_aead_det_encrypt(
                        convert_to(NEW.token, ''utf8''),
                        convert_to(''github_token'', ''utf8''),
                        ''' || encryption_key_id || '''::uuid
                    ),
                    ''base64''
                );
            END IF;
            RETURN NEW;
        END;
        $body$ LANGUAGE plpgsql SECURITY DEFINER';

    -- Create the decryption function
    EXECUTE
        'CREATE OR REPLACE FUNCTION decrypt_github_token(encrypted_token TEXT)
        RETURNS TEXT AS $body$
        BEGIN
            RETURN convert_from(
                pgsodium.crypto_aead_det_decrypt(
                    decode(encrypted_token, ''base64''),
                    convert_to(''github_token'', ''utf8''),
                    ''' || encryption_key_id || '''::uuid
                ),
                ''utf8''
            );
        END;
        $body$ LANGUAGE plpgsql SECURITY DEFINER';
END $$;

-- Create encryption trigger
CREATE TRIGGER encrypt_github_token_trigger
    BEFORE INSERT OR UPDATE ON github_tokens
    FOR EACH ROW
    EXECUTE FUNCTION encrypt_github_token();

-- Enable RLS on github_tokens
ALTER TABLE github_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY github_tokens_policy ON github_tokens
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create favorite repositories table
CREATE TABLE public.favorite_repositories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    repository_id UUID REFERENCES public.repositories(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, repository_id)
);

-- Create tracked repositories table
CREATE TABLE public.tracked_repositories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    repository_id UUID REFERENCES public.repositories(id) ON DELETE CASCADE,
    notification_settings JSONB DEFAULT '{"issues": true, "analysis": true}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, repository_id)
);

-- Create search history table
CREATE TABLE public.search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    filters JSONB DEFAULT '{}'::jsonb,
    result_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_repositories_analyzed_by_user ON public.repositories(analyzed_by_user_id);
CREATE INDEX idx_repositories_github_id ON public.repositories(github_id);
CREATE INDEX idx_repository_collaborators_repository_id ON public.repository_collaborators(repository_id);
CREATE INDEX idx_repository_collaborators_user_id ON public.repository_collaborators(user_id);
CREATE INDEX idx_analysis_jobs_repository_id ON public.analysis_jobs(repository_id);
CREATE INDEX idx_analysis_jobs_status ON public.analysis_jobs(status);
CREATE INDEX idx_analysis_jobs_created_at ON public.analysis_jobs(created_at DESC);
CREATE INDEX idx_issues_repository_id ON public.issues(repository_id);
CREATE INDEX idx_issues_embedding ON public.issues USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_duplicate_issues_repository_id ON public.duplicate_issues(repository_id);
CREATE INDEX idx_duplicate_issues_original_issue ON public.duplicate_issues(repository_id, original_issue_number);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_favorite_repositories_user_id ON public.favorite_repositories(user_id);
CREATE INDEX idx_tracked_repositories_user_id ON public.tracked_repositories(user_id);
CREATE INDEX idx_search_history_user_id ON public.search_history(user_id);
CREATE INDEX idx_search_history_created_at ON public.search_history(created_at DESC);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for updated_at timestamps
CREATE TRIGGER handle_repositories_updated_at
    BEFORE UPDATE ON public.repositories
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_repository_collaborators_updated_at
    BEFORE UPDATE ON public.repository_collaborators
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_analysis_jobs_updated_at
    BEFORE UPDATE ON public.analysis_jobs
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_issues_updated_at
    BEFORE UPDATE ON public.issues
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_notifications_updated_at
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_favorite_repositories_updated_at
    BEFORE UPDATE ON public.favorite_repositories
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_tracked_repositories_updated_at
    BEFORE UPDATE ON public.tracked_repositories
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Function to calculate similarity between issues
CREATE OR REPLACE FUNCTION public.calculate_similarity(vec1 vector, vec2 vector)
RETURNS float
LANGUAGE plpgsql
AS $$
DECLARE
    dot_product float;
    norm1 float;
    norm2 float;
BEGIN
    -- Calculate dot product
    SELECT vec1 <#> vec2 INTO dot_product;

    -- Calculate vector norms
    SELECT sqrt(vec1 <#> vec1) INTO norm1;
    SELECT sqrt(vec2 <#> vec2) INTO norm2;

    -- Return cosine similarity
    RETURN CASE
        WHEN norm1 = 0 OR norm2 = 0 THEN 0
        ELSE dot_product / (norm1 * norm2)
    END;
END;
$$;
