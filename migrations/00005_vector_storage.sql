-- Enable pgvector extension
create extension if not exists vector;

-- Create issues table with vector storage
create table if not exists issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
  github_issue_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  labels JSONB,
  state TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  embedding vector(1536) NOT NULL,
  UNIQUE(repository_id, github_issue_id)
);

-- Create duplicates table for storing relationships
create table if not exists duplicate_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_issue_id UUID REFERENCES issues(id) ON DELETE CASCADE,
  duplicate_issue_id UUID REFERENCES issues(id) ON DELETE CASCADE,
  confidence_score FLOAT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source_issue_id, duplicate_issue_id)
);

-- Create index for vector similarity search
create index on issues using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Create function to find similar issues
create or replace function find_similar_issues(
  p_repository_id UUID,
  p_embedding vector,
  p_threshold float default 0.95,
  p_limit int default 5
) returns table (
  issue_id UUID,
  title TEXT,
  similarity float
) language plpgsql as $$
begin
  return query
  select
    i.id,
    i.title,
    1 - (i.embedding <=> p_embedding) as similarity
  from issues i
  where i.repository_id = p_repository_id
    and 1 - (i.embedding <=> p_embedding) >= p_threshold
  order by i.embedding <=> p_embedding
  limit p_limit;
end;
$$;