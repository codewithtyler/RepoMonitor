import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/auth/supabase-client';
import { HeaderLogo } from '@/components/layout/header-logo';
import { GitHubLoginButton } from '@/components/auth/github-login-button';
import { motion } from 'framer-motion';

export function Home() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo');

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (session?.user) {
          // If user is authenticated, redirect them
          if (returnTo) {
            // Validate the return path is internal
            const url = new URL(returnTo, window.location.origin);
            if (url.origin === window.location.origin) {
              navigate(returnTo, { replace: true });
              return;
            }
          }
          // Default to dashboard if no valid return path
          navigate('/dashboard', { replace: true });
        }
      } catch (error) {
        console.error('Error checking session:', error);
        // On error, stay on home page
      }
    };

    checkSession();
  }, [navigate, returnTo]);

  return (
    <div className="min-h-screen flex flex-col bg-[#0d1117]">
      <header className="h-14 border-b border-[#30363d] bg-[#161b22]">
        <div className="flex items-center justify-between px-4 h-full max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="w-48"
          >
            <HeaderLogo />
          </motion.div>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full mx-auto text-center space-y-8 px-4"
        >
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-[#c9d1d9]">
              Welcome to RepoMonitor
            </h1>
            <p className="text-lg text-[#8b949e]">
              Track and analyze your GitHub repositories
            </p>
          </div>

          <div className="flex justify-center">
            <GitHubLoginButton returnTo={returnTo} />
          </div>

          <div className="grid grid-cols-1 gap-6 mt-12">
            <Feature
              icon="🔍"
              title="Repository Insights"
              description="Get detailed insights into your repository's activity and performance"
            />
            <Feature
              icon="⚡"
              title="Real-time Updates"
              description="Stay informed with instant notifications about your repositories"
            />
            <Feature
              icon="📊"
              title="Advanced Analytics"
              description="Track trends and patterns across all your repositories"
            />
          </div>
        </motion.div>
      </main>
      <footer className="mt-auto border-t border-[#30363d] bg-[#161b22] py-4">
        <div className="text-center text-[#8b949e] text-sm">
          <p>Built with ❤️ for the GitHub community</p>
        </div>
      </footer>
    </div>
  );
}

function Feature({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="p-4 rounded-lg border border-[#30363d] bg-[#161b22] text-left">
      <div className="flex items-center gap-3">
        <div className="text-2xl">{icon}</div>
        <div>
          <h3 className="text-base font-semibold text-[#c9d1d9]">{title}</h3>
          <p className="text-sm text-[#8b949e] mt-1">{description}</p>
        </div>
      </div>
    </div>
  );
}
