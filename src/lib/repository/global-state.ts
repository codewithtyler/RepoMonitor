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
  lastUpdated: number | null;
}

type StateSubscriber = (state: RepositoryState) => void;

let state: RepositoryState = {
  repositories: [],
  loading: true,
  error: null,
  lastUpdated: null
};

const subscribers = new Set<StateSubscriber>();
let cleanupTimeout: number | null = null;

// Helper to check if state has changed
function hasStateChanged(oldState: RepositoryState, newState: RepositoryState): boolean {
  return (
    oldState.loading !== newState.loading ||
    oldState.error !== newState.error ||
    oldState.lastUpdated !== newState.lastUpdated ||
    oldState.repositories.length !== newState.repositories.length ||
    JSON.stringify(oldState.repositories) !== JSON.stringify(newState.repositories)
  );
}

function notifySubscribers() {
  if (typeof window === 'undefined') return; // Don't notify during SSR
  subscribers.forEach(callback => callback(state));
}

// Cleanup old data after 5 minutes of inactivity
function scheduleCleanup() {
  if (cleanupTimeout) {
    window.clearTimeout(cleanupTimeout);
  }

  cleanupTimeout = window.setTimeout(() => {
    if (subscribers.size === 0) {
      console.log('[RepositoryState] Cleaning up stale data');
      state = {
        repositories: [],
        loading: true,
        error: null,
        lastUpdated: null
      };
    }
  }, 5 * 60 * 1000); // 5 minutes
}

export function getRepositoryState(): Readonly<RepositoryState> {
  return Object.freeze({ ...state });
}

export function updateRepositories(repositories: Repository[]) {
  console.log('[RepositoryState] Updating repositories:', repositories.length);
  const newState = {
    ...state,
    repositories,
    loading: false,
    error: null,
    lastUpdated: Date.now()
  };

  if (hasStateChanged(state, newState)) {
    state = newState;
    notifySubscribers();
    scheduleCleanup();
  }
}

export function setLoading(loading: boolean) {
  const newState = {
    ...state,
    loading
  };

  if (hasStateChanged(state, newState)) {
    state = newState;
    notifySubscribers();
    scheduleCleanup();
  }
}

export function setError(error: Error) {
  const newState = {
    ...state,
    error,
    loading: false,
    lastUpdated: Date.now()
  };

  if (hasStateChanged(state, newState)) {
    state = newState;
    notifySubscribers();
    scheduleCleanup();
  }
}

export function subscribeToRepositories(callback: StateSubscriber): () => void {
  subscribers.add(callback);
  callback(state); // Initial state

  // Return cleanup function
  return () => {
    subscribers.delete(callback);
    scheduleCleanup();
  };
}

// Expose a method to force cleanup (useful for testing)
export function __forceCleanup() {
  if (process.env.NODE_ENV === 'development') {
    if (cleanupTimeout) {
      window.clearTimeout(cleanupTimeout);
    }
    state = {
      repositories: [],
      loading: true,
      error: null,
      lastUpdated: null
    };
    notifySubscribers();
  }
}
