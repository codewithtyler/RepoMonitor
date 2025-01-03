import { useNavigate } from 'react-router-dom';
import { useUser } from '../../../lib/auth/hooks';

export function AuthButton() {
  const navigate = useNavigate();
  const user = useUser();

  return (
    <button
      onClick={() => navigate(user ? '/logout' : '/login')}
      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      {user ? 'Sign out' : 'Sign in'}
    </button>
  );
}