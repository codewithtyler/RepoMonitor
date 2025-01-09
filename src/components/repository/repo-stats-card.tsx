import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { StatCard } from '@/components/common/stat-card';

interface RepoStatsCardProps {
    id: string;
    title: string;
    value: string;
    description: string;
    icon: LucideIcon;
    onRefresh?: () => void;
    refreshing?: boolean;
    variant?: 'default' | 'compact';
}

export function RepoStatsCard(props: RepoStatsCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
        >
            <StatCard {...props} />
        </motion.div>
    );
}
