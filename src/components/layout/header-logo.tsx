import { Github } from 'lucide-react';
import { Link } from 'react-router-dom';

export function HeaderLogo() {
  return (
    <div className="mr-4 flex">
      <Link to="/" className="flex items-center space-x-2">
        <Github className="h-6 w-6 text-gray-300" />
        <span className="font-bold">RepoMonitor</span>
      </Link>
    </div>
  );
} 