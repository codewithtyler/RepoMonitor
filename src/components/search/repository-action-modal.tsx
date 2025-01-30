import { theme } from '@/config/theme';
import { X, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        <div className="flex gap-2 relative" ref={dropdownRef}>
          <button
            onClick={onAnalyze}
            className="flex-1 rounded-l-lg px-4 py-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor: '#238636',
              color: '#ffffff'
            }}
          >
            Analyze
          </button>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="rounded-r-lg px-2 py-2 text-sm font-medium transition-colors border-l border-[#2ea043]"
            style={{
              backgroundColor: '#238636',
              color: '#ffffff'
            }}
            aria-label="Show more options"
          >
            <ChevronDown className="h-4 w-4" />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 rounded-lg shadow-lg z-50 overflow-hidden" style={{ backgroundColor: theme.colors.background.secondary }}>
              <button
                onClick={() => {
                  onTrack();
                  setIsDropdownOpen(false);
                }}
                className="w-full px-4 py-2 text-sm text-left transition-colors hover:bg-gray-500/10"
                style={{ color: theme.colors.text.primary }}
              >
                Track Repository
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
