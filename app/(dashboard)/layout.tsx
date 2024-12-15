import { DashboardContainer } from '@/components/layout/dashboard-container';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardContainer>{children}</DashboardContainer>;
}