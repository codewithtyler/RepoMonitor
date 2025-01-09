import { ReactNode } from 'react';

// Note: This project uses plain React + TailwindCSS.
// We intentionally avoid Next.js, Shadcn UI, and Radix UI.
// All components are built from scratch using TailwindCSS for styling.
// New reusable components should be added to src/components/common/
// Do not create a components/ui folder - use common instead.

interface DashboardContainerProps {
  children: ReactNode;
}

export function DashboardContainer({ children }: DashboardContainerProps) {
  console.log('[DashboardContainer] Starting render');

  try {
    console.log('[DashboardContainer] Checking children:', {
      hasChildren: !!children,
      childrenType: children?.toString(),
      childrenConstructor: children?.constructor?.name
    });

    const content = (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-6">
          {children}
        </div>
      </div>
    );

    console.log('[DashboardContainer] Successfully created content');
    return content;
  } catch (error) {
    console.error('[DashboardContainer] Error during render:', error);
    if (error instanceof Error) {
      console.error('[DashboardContainer] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    throw error;
  }
}
