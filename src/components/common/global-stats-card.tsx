import { LucideIcon } from 'lucide-react';
import { StatCard } from './stat-card';

interface GlobalStatsCardProps {
  layoutId?: string;
  id: string;
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  onRefresh?: () => void;
  refreshing?: boolean;
  variant?: 'default' | 'compact';
}

export function GlobalStatsCard(props: GlobalStatsCardProps) {
  return <StatCard {...props} />;
}