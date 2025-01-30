import { Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUser } from '../../lib/auth/hooks';

export function HeaderLogo() {
  const { user } = useUser();
  const homePath = user ? '/dashboard' : '/';

  return (
    <div className="mr-4 flex">
      <Link to={homePath} className="flex items-center space-x-2">
        <Activity className="h-5 w-5 text-[#238636]" />
        <span className="text-sm font-medium text-[#c9d1d9]">RepoMonitor</span>
      </Link>
    </div>
  );
}
