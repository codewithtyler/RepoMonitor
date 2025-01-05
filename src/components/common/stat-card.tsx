import { RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { theme } from '@/config/theme';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
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

export function StatCard({
  id,
  title,
  value,
  description,
  icon: Icon,
  onRefresh,
  refreshing,
  variant = 'default',
  layoutId
}: StatCardProps) {
  const isCompact = variant === 'compact';
  
  return (
    <motion.div
      layoutId={layoutId || `stat-card-${id}`}
      className={`p-4 rounded-lg ${isCompact ? 'h-28' : ''}`}
      style={{ backgroundColor: theme.colors.background.secondary }}
      transition={{
        layout: {
          type: "spring",
          bounce: 0,
          duration: 1.2
        }
      }}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
                {title}
              </p>
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  disabled={refreshing}
                  className="p-1 rounded-full hover:bg-gray-500/10 transition-colors"
                  aria-label={`Refresh ${title.toLowerCase()}`}
                >
                  <RefreshCw
                    className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`}
                    style={{ color: theme.colors.text.secondary }}
                  />
                </button>
              )}
            </div>
            <p 
              className={`font-semibold mt-1 ${isCompact ? 'text-lg' : 'text-2xl'}`}
              style={{ color: theme.colors.text.primary }}
            >
              {value}
            </p>
          </div>
          <Icon 
            className={isCompact ? 'h-6 w-6' : 'h-8 w-8'} 
            style={{ color: theme.colors.text.secondary }} 
          />
        </div>
        <p className="text-sm mt-auto" style={{ color: theme.colors.text.secondary }}>
          {description}
        </p>
      </div>
    </motion.div>
  );
} 