-- Enable the pgvector extension if not already enabled
create extension if not exists "vector";

-- Create repository_collaborators table
create table if not exists public.repository_collaborators (
    id uuid default gen_random_uuid() primary key,
    repository_id uuid references public.repositories(id) on delete cascade,
    user_id uuid references auth.users(id) on delete cascade,
    can_read boolean default true,
    can_write boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(repository_id, user_id)
);

-- Create the analysis_jobs table
create table if not exists public.analysis_jobs (
    id uuid default gen_random_uuid() primary key,
    repository_id uuid references public.repositories(id) on delete cascade,
    status text check (status in ('pending', 'fetching', 'processing', 'analyzing', 'completed', 'failed', 'cancelled')) not null default 'pending',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    last_processed_at timestamp with time zone,
    error text,
    results jsonb default '[]'::jsonb,
    metadata jsonb default '{}'::jsonb
);

-- Create the duplicate_issues table
create table if not exists public.duplicate_issues (
    id uuid default gen_random_uuid() primary key,
    repository_id uuid references public.repositories(id) on delete cascade,
    original_issue_number integer not null,
    duplicate_issue_number integer not null,
    confidence_score float,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    metadata jsonb default '{}'::jsonb,
    unique(repository_id, original_issue_number, duplicate_issue_number)
);

-- Add indexes for common queries
create index if not exists repository_collaborators_repository_id_idx on public.repository_collaborators(repository_id);
create index if not exists repository_collaborators_user_id_idx on public.repository_collaborators(user_id);
create index if not exists analysis_jobs_repository_id_idx on public.analysis_jobs(repository_id);
create index if not exists analysis_jobs_status_idx on public.analysis_jobs(status);
create index if not exists analysis_jobs_created_at_idx on public.analysis_jobs(created_at desc);
create index if not exists duplicate_issues_repository_id_idx on public.duplicate_issues(repository_id);
create index if not exists duplicate_issues_original_issue_idx on public.duplicate_issues(repository_id, original_issue_number);

-- Add RLS policies
alter table public.repository_collaborators enable row level security;
alter table public.analysis_jobs enable row level security;
alter table public.duplicate_issues enable row level security;

-- Policies for repository_collaborators
create policy "Users can view their own collaborations"
    on public.repository_collaborators for select
    using (user_id = auth.uid());

create policy "Repository owners can manage collaborators"
    on public.repository_collaborators for all
    using (
        exists (
            select 1 from public.repositories r
            where r.id = repository_collaborators.repository_id
            and r.analyzed_by_user_id = auth.uid()
        )
    );

-- Policies for analysis_jobs
create policy "Users can view analysis jobs for repositories they have access to"
    on public.analysis_jobs for select
    using (
        exists (
            select 1 from public.repositories r
            where r.id = analysis_jobs.repository_id
            and (
                r.analyzed_by_user_id = auth.uid()
                or r.repository_permissions->>'public' = 'true'
                or r.repository_permissions->>'private' = 'true'
                or exists (
                    select 1 from public.repository_collaborators rc
                    where rc.repository_id = r.id
                    and rc.user_id = auth.uid()
                )
            )
        )
    );

create policy "Users can create analysis jobs for repositories they have access to"
    on public.analysis_jobs for insert
    with check (
        exists (
            select 1 from public.repositories r
            where r.id = analysis_jobs.repository_id
            and (
                r.analyzed_by_user_id = auth.uid()
                or r.repository_permissions->>'public' = 'true'
                or r.repository_permissions->>'private' = 'true'
                or exists (
                    select 1 from public.repository_collaborators rc
                    where rc.repository_id = r.id
                    and rc.user_id = auth.uid()
                )
            )
        )
    );

create policy "Users can update analysis jobs for repositories they have access to"
    on public.analysis_jobs for update
    using (
        exists (
            select 1 from public.repositories r
            where r.id = analysis_jobs.repository_id
            and (
                r.analyzed_by_user_id = auth.uid()
                or r.repository_permissions->>'public' = 'true'
                or r.repository_permissions->>'private' = 'true'
                or exists (
                    select 1 from public.repository_collaborators rc
                    where rc.repository_id = r.id
                    and rc.user_id = auth.uid()
                )
            )
        )
    );

-- Policies for duplicate_issues
create policy "Users can view duplicate issues for repositories they have access to"
    on public.duplicate_issues for select
    using (
        exists (
            select 1 from public.repositories r
            where r.id = duplicate_issues.repository_id
            and (
                r.analyzed_by_user_id = auth.uid()
                or r.repository_permissions->>'public' = 'true'
                or r.repository_permissions->>'private' = 'true'
                or exists (
                    select 1 from public.repository_collaborators rc
                    where rc.repository_id = r.id
                    and rc.user_id = auth.uid()
                )
            )
        )
    );

create policy "Users can create duplicate issues for repositories they have access to"
    on public.duplicate_issues for insert
    with check (
        exists (
            select 1 from public.repositories r
            where r.id = duplicate_issues.repository_id
            and (
                r.analyzed_by_user_id = auth.uid()
                or r.repository_permissions->>'public' = 'true'
                or r.repository_permissions->>'private' = 'true'
                or exists (
                    select 1 from public.repository_collaborators rc
                    where rc.repository_id = r.id
                    and rc.user_id = auth.uid()
                )
            )
        )
    );

create policy "Users can update duplicate issues for repositories they have access to"
    on public.duplicate_issues for update
    using (
        exists (
            select 1 from public.repositories r
            where r.id = duplicate_issues.repository_id
            and (
                r.analyzed_by_user_id = auth.uid()
                or r.repository_permissions->>'public' = 'true'
                or r.repository_permissions->>'private' = 'true'
                or exists (
                    select 1 from public.repository_collaborators rc
                    where rc.repository_id = r.id
                    and rc.user_id = auth.uid()
                )
            )
        )
    );

-- Function to automatically update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the updated_at function
create trigger handle_analysis_jobs_updated_at
    before update on public.analysis_jobs
    for each row
    execute function public.handle_updated_at();

-- Function to check if a user can access an analysis
create or replace function public.can_access_analysis(user_id uuid, repository_id uuid)
    returns boolean
    language plpgsql
    security definer
    set search_path = public
as $$
begin
    return exists (
        select 1
        from public.repositories r
        where r.id = repository_id
        and (
            r.analyzed_by_user_id = user_id
            or r.repository_permissions->>'public' = 'true'
            or r.repository_permissions->>'private' = 'true'
            or exists (
                select 1 from public.repository_collaborators rc
                where rc.repository_id = r.id
                and rc.user_id = user_id
            )
        )
    );
end;
$$;
