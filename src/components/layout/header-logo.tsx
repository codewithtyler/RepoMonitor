import { Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

export function HeaderLogo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <Activity className="h-5 w-5 text-[#238636]" />
      <span className="text-sm font-medium text-[#c9d1d9]">RepoMonitor</span>
    </Link>
  );
}
