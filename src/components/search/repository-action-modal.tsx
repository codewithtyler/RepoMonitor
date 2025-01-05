import { GitFork, GitPullRequest, X, Activity } from 'lucide-react';
import { theme } from '@/config/theme';

interface Repository {
  id: number;
  name: string;
  owner: {
    login: string;
  };
  description: string | null;
  private: boolean;
  stargazers_count: number;
}

interface RepositoryActionModalProps {
  repository: Repository | null;
  onClose: () => void;
  onTrack: (repo: Repository) => void;
  onAnalyze: (repo: Repository) => void;
}

export function RepositoryActionModal({ repository, onClose, onTrack, onAnalyze }: RepositoryActionModalProps) {
  if (!repository) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div 
        className="relative w-full max-w-md rounded-lg border p-6"
        style={{ 
          backgroundColor: theme.colors.background.secondary,
          borderColor: theme.colors.border.primary
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-500/10 transition-colors"
          style={{ color: theme.colors.text.secondary }}
        >
          <X className="h-5 w-5" />
        </button>

        {/* Repository info */}
        <div className="flex items-start gap-3 mb-6">
          <div className="flex-shrink-0 mt-1">
            {repository.private ? (
              <GitPullRequest className="h-5 w-5" style={{ color: theme.colors.text.secondary }} />
            ) : (
              <GitFork className="h-5 w-5" style={{ color: theme.colors.text.secondary }} />
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold" style={{ color: theme.colors.text.primary }}>
              {repository.owner.login}/{repository.name}
            </h3>
            {repository.description && (
              <p className="mt-1" style={{ color: theme.colors.text.secondary }}>
                {repository.description}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => onTrack(repository)}
            className="w-full px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors hover:opacity-80"
            style={{ backgroundColor: theme.colors.brand.primary, color: theme.colors.text.primary }}
          >
            <GitFork className="h-4 w-4" />
            Track Repository
          </button>
          <button
            onClick={() => onAnalyze(repository)}
            className="w-full px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors hover:opacity-80"
            style={{ backgroundColor: theme.colors.background.primary, color: theme.colors.text.primary }}
          >
            <Activity className="h-4 w-4" />
            Analyze Repository
          </button>
        </div>
      </div>
    </div>
  );
} 