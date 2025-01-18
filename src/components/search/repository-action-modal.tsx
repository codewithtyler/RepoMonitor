import { theme } from '@/config/theme';
import { X } from 'lucide-react';

interface RepositoryActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTrack: () => Promise<void>;
  onAnalyze: () => Promise<void>;
  repository: {
    owner: string;
    name: string;
    description?: string;
    stargazersCount?: number;
  };
}

export function RepositoryActionModal({
  isOpen,
  onClose,
  onTrack,
  onAnalyze,
  repository,
}: RepositoryActionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-50 w-full max-w-md rounded-lg p-6" style={{ backgroundColor: theme.colors.background.primary }}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100"
        >
          <X className="h-4 w-4" style={{ color: theme.colors.text.secondary }} />
        </button>

        {/* Header */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold" style={{ color: theme.colors.text.primary }}>
            {repository.owner}/{repository.name}
          </h2>
          {repository.description && (
            <p className="mt-2 text-sm" style={{ color: theme.colors.text.secondary }}>
              {repository.description}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={onTrack}
            className="w-full rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor: theme.colors.background.secondary,
              color: theme.colors.text.primary,
            }}
          >
            Track Repository
          </button>
          <button
            onClick={onAnalyze}
            className="w-full rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor: theme.colors.brand.primary,
              color: theme.colors.text.inverse,
            }}
          >
            Start Analysis
          </button>
        </div>
      </div>
    </div>
  );
}
