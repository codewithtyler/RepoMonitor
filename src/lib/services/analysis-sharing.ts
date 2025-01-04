import { supabase } from '../auth/supabase-client';
import { getGitHubClient } from '../github';

interface AnalysisMetadata {
  lastAnalysisTimestamp: Date;
  analyzedByUser: {
    id: string;
    name: string;
  };
  isPublic: boolean;
}

export class AnalysisSharingService {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  async checkRepositoryAccess(owner: string, repo: string) {
    const githubClient = await getGitHubClient(this.userId);
    const access = await githubClient.checkRepositoryAccess(owner, repo);

    // Get or create repository record
    const { data: repository, error: repoError } = await supabase
      .from('repositories')
      .select('id')
      .eq('full_name', `${owner}/${repo}`)
      .single();

    if (repoError && repoError.code !== 'PGRST116') {
      throw repoError;
    }

    let repositoryId: number;
    if (!repository) {
      const { data: newRepo, error: createError } = await supabase
        .from('repositories')
        .insert({
          full_name: `${owner}/${repo}`,
          is_public: !access.isPrivate,
          repository_permissions: access.permissions
        })
        .select('id')
        .single();

      if (createError) throw createError;
      repositoryId = newRepo.id;
    } else {
      repositoryId = repository.id;
    }

    // Update permissions cache
    await supabase.rpc('update_repository_permissions', {
      p_user_id: this.userId,
      p_repository_id: repositoryId,
      p_permissions: access.permissions
    });

    return {
      hasAccess: access.hasAccess,
      isPublic: !access.isPrivate,
      repositoryId
    };
  }

  async getExistingAnalysis(repositoryId: number): Promise<AnalysisMetadata | null> {
    // Check if user can access the analysis
    const { data: canAccess } = await supabase
      .rpc('can_access_analysis', {
        p_user_id: this.userId,
        p_repository_id: repositoryId
      });

    if (!canAccess) {
      return null;
    }

    // Get analysis metadata
    const { data: repository, error } = await supabase
      .from('repositories')
      .select('*, analyzed_by_user:analyzed_by_user_id(id, raw_user_meta_data)')
      .eq('id', repositoryId)
      .single();

    if (error || !repository?.last_analysis_timestamp) {
      return null;
    }

    return {
      lastAnalysisTimestamp: new Date(repository.last_analysis_timestamp),
      analyzedByUser: {
        id: repository.analyzed_by_user.id,
        name: repository.analyzed_by_user.raw_user_meta_data?.name || 'Unknown User'
      },
      isPublic: repository.is_public
    };
  }

  async updateAnalysisMetadata(repositoryId: number) {
    const { error } = await supabase
      .from('repositories')
      .update({
        last_analysis_timestamp: new Date().toISOString(),
        analyzed_by_user_id: this.userId
      })
      .eq('id', repositoryId);

    if (error) throw error;
  }
}