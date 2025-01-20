import { theme } from '@/config/theme';

interface GlobalStatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  layoutOrder?: number;
}

export function GlobalStatsCard({
  title,
  value,
  description,
  layoutOrder = 0
}: GlobalStatsCardProps) {
  return (
    <div
      className="p-4 rounded-lg border transition-colors"
      style={{
        backgroundColor: theme.colors.background.secondary,
        borderColor: theme.colors.border.primary,
        order: layoutOrder
      }}
    >
      <h3 className="text-sm font-medium" style={{ color: theme.colors.text.secondary }}>
        {title}
      </h3>
      <p className="mt-2 text-3xl font-semibold tracking-tight" style={{ color: theme.colors.text.primary }}>
        {value}
      </p>
      {description && (
        <p className="mt-2 text-sm" style={{ color: theme.colors.text.secondary }}>
          {description}
        </p>
      )}
    </div>
  );
}
