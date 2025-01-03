import { theme } from '@/config/theme';

export function Footer() {
  return (
    <footer 
      className="w-full border-t py-6" 
      style={{ 
        backgroundColor: theme.colors.background.primary,
        borderColor: theme.colors.border.primary
      }}
    >
      <div className="container mx-auto text-center text-sm" style={{ color: theme.colors.text.secondary }}>
        <p>Copyright © 2025 RepoMonitor • Maintained by Tyler Hughes</p>
      </div>
    </footer>
  );
} 