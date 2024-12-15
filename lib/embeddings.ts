import { OpenAI } from 'openai';
import { supabase } from './supabase';
import { IssueEmbedding } from './types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    input: text,
    model: 'text-embedding-3-small',
  });

  return response.data[0].embedding;
}

export async function findSimilarIssues(
  embedding: number[],
  repository: string,
  threshold = 0.85
): Promise<IssueEmbedding[]> {
  const { data, error } = await supabase.rpc('match_issues', {
    query_embedding: embedding,
    similarity_threshold: threshold,
    match_count: 5,
    repository_filter: repository,
  });

  if (error) throw error;
  return data;
}