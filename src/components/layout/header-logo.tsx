import { Github } from 'lucide-react';
import { Link } from 'react-router-dom';
import { theme } from '@/config/theme';

export function HeaderLogo() {
  return (
    <div className="mr-4 flex">
      <Link to="/" className="flex items-center space-x-2">
        <Github className="h-6 w-6" style={{ color: theme.colors.brand.primary }} />
        <span className="font-bold" style={{ color: theme.colors.text.primary }}>RepoMonitor</span>
      </Link>
    </div>
  );
} 