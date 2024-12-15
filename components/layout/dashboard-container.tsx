import { Header } from '@/components/header';
import { Sidebar } from '@/components/sidebar';
import { cn } from '@/lib/utils';

export function DashboardContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn("flex min-h-screen flex-col")}>
      <Header />
      <div className={cn("flex flex-1", "container mx-auto")}>
        <Sidebar />
        <main className={cn("flex-1 px-4 py-6 md:px-6 lg:px-8")}>{children}</main>
      </div>
    </div>
  );
}