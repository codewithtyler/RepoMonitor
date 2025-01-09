import { Repository } from '../../types/repository';

// Note: This project uses plain React + TailwindCSS.
// We intentionally avoid Next.js, Shadcn UI, and Radix UI.
// All components are built from scratch using TailwindCSS for styling.
// New reusable components should be added to src/components/common/
// Do not create a components/ui folder - use common instead.

// Using global state pattern similar to auth state to prevent
// multiple repository fetches across components.
// This ensures all components share the same repository data.

interface RepositoryState {
  repositories: Repository[];
  loading: boolean;
  error: Error | null;
}

let state: RepositoryState = {
  repositories: [],
  loading: true,
  error: null
};

const subscribers = new Set<(state: RepositoryState) => void>();

function notifySubscribers() {
  subscribers.forEach(callback => callback(state));
}

export function getRepositoryState(): RepositoryState {
  return state;
}

export function updateRepositories(repositories: Repository[]) {
  console.log('[RepositoryState] Updating repositories:', repositories.length);
  state = {
    ...state,
    repositories,
    loading: false,
    error: null
  };
  notifySubscribers();
}

export function setLoading(loading: boolean) {
  state = {
    ...state,
    loading
  };
  notifySubscribers();
}

export function setError(error: Error) {
  state = {
    ...state,
    error,
    loading: false
  };
  notifySubscribers();
}

export function subscribeToRepositories(callback: (state: RepositoryState) => void): () => void {
  subscribers.add(callback);
  callback(state); // Initial state

  return () => {
    subscribers.delete(callback);
  };
}
