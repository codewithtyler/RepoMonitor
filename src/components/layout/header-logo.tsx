import { Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { theme } from '../../config/theme';
import { useUser } from '../../lib/auth/hooks';

export function HeaderLogo() {
  const { user } = useUser();
  const homePath = user ? '/dashboard' : '/';

  return (
    <div className="mr-4 flex">
      <Link to={homePath} className="flex items-center space-x-2">
        <Activity className="h-5 w-5" style={{ color: theme.colors.brand.primary }} />
        <span className="text-sm font-medium" style={{ color: theme.colors.text.primary }}>RepoMonitor</span>
      </Link>
    </div>
  );
}