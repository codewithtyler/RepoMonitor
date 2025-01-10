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
          bounce: 0.2,
          duration: 0.6
        }
      }}
    >
      <motion.div
        className="flex flex-col h-full"
        layout="position"
        transition={{
          layout: {
            type: "spring",
            bounce: 0.2,
            duration: 0.6
          }
        }}
      >
        <motion.div
          className="flex items-start justify-between"
          layout="position"
        >
          <div>
            <motion.div
              className="flex items-center gap-2"
              layout="position"
            >
              <motion.p
                className="text-sm"
                layout="position"
                style={{ color: theme.colors.text.secondary }}
              >
                {title}
              </motion.p>
              {onRefresh && (
                <motion.button
                  layout="position"
                  onClick={onRefresh}
                  disabled={refreshing}
                  className="p-1 rounded-full hover:bg-gray-500/10 transition-colors"
                  aria-label={`Refresh ${title.toLowerCase()}`}
                >
                  <RefreshCw
                    className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`}
                    style={{ color: theme.colors.text.secondary }}
                  />
                </motion.button>
              )}
            </motion.div>
            <motion.p
              className={`font-semibold mt-1 ${isCompact ? 'text-lg' : 'text-2xl'}`}
              layout="position"
              style={{ color: theme.colors.text.primary }}
            >
              {value}
            </motion.p>
          </div>
          <motion.div layout="position">
            <Icon
              className={isCompact ? 'h-6 w-6' : 'h-8 w-8'}
              style={{ color: theme.colors.text.secondary }}
            />
          </motion.div>
        </motion.div>
        <motion.p
          className="text-sm mt-auto"
          layout="position"
          style={{ color: theme.colors.text.secondary }}
        >
          {description}
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
