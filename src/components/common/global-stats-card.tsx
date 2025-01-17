import { Repository } from '@/types/repository';
import { GitPullRequest, GitMerge, GitBranch, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { StatCard } from './stat-card';
import { useMemo } from 'react';

interface GlobalStatsCardProps {
  repositories: Repository[];
  variant?: 'default' | 'compact';
  layoutOrder?: string[];
}

export function GlobalStatsCard({ repositories, variant = 'default', layoutOrder }: GlobalStatsCardProps) {
  const stats = useMemo(() => {
    const analyzedRepos = repositories.filter(repo => repo.lastAnalysisTimestamp).length;
    const openIssues = repositories.reduce((sum, repo) => sum + (repo.openIssuesCount || 0), 0);

    return {
      trackedRepos: repositories.length,
      analyzedRepos,
      openIssues,
      activeAutomations: 0 // Coming soon
    };
  }, [repositories]);

  const statsConfig = {
    trackedRepos: {
      title: "Tracked Repositories",
      description: "Total repositories being monitored",
      icon: GitBranch
    },
    analyzedRepos: {
      title: "Analyzed Repositories",
      description: "Repositories with completed analysis",
      icon: GitMerge
    },
    openIssues: {
      title: "Open Issues",
      description: "Across all repositories",
      icon: GitPullRequest
    },
    activeAutomations: {
      title: "Active Automations",
      description: "Currently running analyses",
      icon: AlertCircle
    }
  };

  return (
    <motion.div
      className={variant === 'compact' ? 'space-y-4' : 'grid grid-cols-1 lg:grid-cols-4 gap-4'}
      layout="position"
      transition={{
        layout: {
          type: "tween",
          duration: 5.5,
          ease: "easeInOut",
          delay: 0.3
        }
      }}
    >
      {layoutOrder.map((key) => {
        const config = statsConfig[key as keyof typeof statsConfig];
        return (
          <StatCard
            key={key}
            id={key}
            title={config.title}
            value={stats[key as keyof typeof stats].toString()}
            description={config.description}
            icon={config.icon}
            variant={variant}
            layoutId={`global-stats-${key}`}
          />
        );
      })}
    </motion.div>
  );
}
