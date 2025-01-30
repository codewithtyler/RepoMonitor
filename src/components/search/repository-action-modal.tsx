import React from 'react';
import type { Repository } from '@/lib/hooks/use-repository-data';
import type { SearchResult } from '@/lib/contexts/search-context';
import { GitFork } from 'lucide-react';

interface RepositoryActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTrack: () => void;
  repository: Repository | SearchResult;
}

export function RepositoryActionModal({
  isOpen,
  onClose,
  onTrack,
  repository
}: RepositoryActionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[#0d1117] rounded-lg p-6 max-w-md w-full">
        <h2 className="text-lg font-medium mb-4">Track Repository</h2>
        <p className="text-sm mb-6">
          Do you want to track {repository.owner}/{repository.name}?
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-[#c9d1d9] hover:bg-[#21262d] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onTrack();
              onClose();
            }}
            className="px-4 py-2 rounded-lg flex items-center gap-2 bg-[#238636] text-white hover:bg-[#2ea043] transition-colors"
          >
            <GitFork className="h-4 w-4" />
            Track Repository
          </button>
        </div>
      </div>
    </div>
  );
}
