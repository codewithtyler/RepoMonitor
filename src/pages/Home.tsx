import { useNavigate } from 'react-router-dom';
import { useUser } from '../lib/auth/hooks';

function AuthButton() {
  const navigate = useNavigate();
  const user = useUser();

  return (
    <button
      onClick={() => navigate(user ? '/logout' : '/login')}
      className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      {user ? 'Sign out' : 'Sign in'}
    </button>
  );
}

export function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center px-6">
        <h1 className="mb-4 text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white">
          RepoMonitor
        </h1>
        <p className="mb-8 text-lg text-gray-600 dark:text-gray-400">
          Monitor and manage your GitHub repositories with ease
        </p>
        <AuthButton />
      </div>
    </div>
  );
} 