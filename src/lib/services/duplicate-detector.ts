// deno-lint-ignore-file
import { supabase } from '../auth/supabase-client';
import { openaiClient } from '../openai';

interface Issue {
  id: number;
  title: string;
  description: string | null;
  labels: string[];
}

interface DuplicateQueryResult {
  duplicate_issue_id: number;
  duplicate: {
    github_issue_id: number;
    title: string;
  }[];
  confidence_score: number;
}

export class DuplicateDetector {
  private repositoryId: number;
  private threshold: number;

  constructor(repositoryId: number, threshold: number = 0.95) {
    this.repositoryId = repositoryId;
    this.threshold = threshold;
  }

  private combineText(issue: Issue): string {
    const parts = [
      issue.title,
      issue.description || '',
      ...issue.labels
    ];
    return openaiClient.preprocessText(parts.join(' '));
  }

  async processIssues(issues: Issue[]): Promise<void> {
    // Generate embeddings for all issues
    const texts = issues.map(issue => this.combineText(issue));
    const embeddings = await openaiClient.createEmbeddings(texts);

    // Store issues and embeddings
    for (let i = 0; i < issues.length; i++) {
      const issue = issues[i];
      const embedding = embeddings[i];

      const { data: storedIssue, error: storeError } = await supabase
        .from('issues')
        .upsert({
          repository_id: this.repositoryId,
          github_issue_id: issue.id,
          title: issue.title,
          description: issue.description,
          labels: issue.labels,
          embedding
        })
        .select('id')
        .single();

      if (storeError || !storedIssue) {
        console.error('Failed to store issue:', storeError);
        continue;
      }

      // Find similar issues
      const { data: similarIssues, error: searchError } = await supabase
        .rpc('find_similar_issues', {
          p_repository_id: this.repositoryId,
          p_embedding: embedding,
          p_threshold: this.threshold
        });

      if (searchError) {
        console.error('Failed to find similar issues:', searchError);
        continue;
      }

      // Store duplicate relationships
      for (const similar of similarIssues) {
        if (similar.issue_id === storedIssue.id) continue;

        await supabase
          .from('duplicate_issues')
          .upsert({
            source_issue_id: storedIssue.id,
            duplicate_issue_id: similar.issue_id,
            confidence_score: similar.similarity
          });
      }
    }
  }

  async getDuplicates(issueId: number): Promise<Array<{ id: number; title: string; confidence: number }>> {
    const { data, error } = await supabase
      .from('duplicate_issues')
      .select(`
        duplicate_issue_id,
        duplicate:issues!duplicate_issue_id (
          github_issue_id,
          title
        ),
        confidence_score
      `)
      .eq('source_issue_id', issueId);

    if (error) {
      console.error('Failed to get duplicates:', error);
      return [];
    }

    return (data as DuplicateQueryResult[]).map(d => ({
      id: d.duplicate[0].github_issue_id,
      title: d.duplicate[0].title,
      confidence: d.confidence_score
    }));
  }
}
