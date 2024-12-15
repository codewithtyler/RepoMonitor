'use client';

import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Something went wrong!</h2>
      <p className="text-muted-foreground">{error.message}</p>
      <button
        onClick={reset}
        className="btn btn-primary"
      >
        Try again
      </button>
    </div>
  );
}