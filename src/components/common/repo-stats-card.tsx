import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { StatCard } from './stat-card';

interface RepoStatsCardProps {
  id: string;
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  onRefresh?: () => void;
  refreshing?: boolean;
  variant?: 'default' | 'compact';
  layoutId?: string;
}

export function RepoStatsCard(props: RepoStatsCardProps) {
  return (
    <motion.div
      layoutId={props.layoutId}
      transition={{
        layout: {
          type: "spring",
          bounce: 0.2,
          duration: 2.5
        }
      }}
    >
      <StatCard {...props} />
    </motion.div>
  );
}
