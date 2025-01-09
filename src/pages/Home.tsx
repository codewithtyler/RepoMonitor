import { Activity, Sparkles, Zap, Search, Box } from 'lucide-react';
import { Footer } from '../components/layout/footer';
import { theme } from '../config/theme';
import { supabase } from '../lib/auth/supabase-client';

export function Home() {
  const handleGitHubSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: 'repo read:user'
        }
      });

      if (error) {
        console.error('Error signing in:', error.message);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center" style={{ backgroundColor: theme.colors.background.primary, color: theme.colors.text.primary }}>
      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
        <Activity className="mb-6 h-16 w-16" style={{ color: theme.colors.brand.primary }} />
        <h1 className="mb-4 text-5xl font-bold">RepoMonitor</h1>
        <p className="mb-8 text-xl" style={{ color: theme.colors.text.secondary }}>
          Monitor and manage your GitHub repositories with AI-powered insights
          <br />
          and automated workflows.
        </p>
        <button
          onClick={handleGitHubSignIn}
          className="flex items-center gap-2 rounded-lg px-6 py-3 font-semibold transition-colors hover:opacity-80"
          style={{ backgroundColor: theme.colors.brand.primary, color: theme.colors.text.primary }}
        >
          <Activity className="h-5 w-5" />
          Sign in with GitHub
        </button>
      </div>

      {/* Features Grid */}
      <div className="grid w-full max-w-6xl grid-cols-1 gap-6 px-4 py-12 md:grid-cols-2">
        <div className="rounded-lg p-6" style={{ backgroundColor: theme.colors.background.secondary }}>
          <div className="mb-4 inline-block rounded-lg p-2" style={{ backgroundColor: theme.colors.features.analysis.background }}>
            <Sparkles className="h-6 w-6" style={{ color: theme.colors.features.analysis.icon }} />
          </div>
          <h2 className="mb-2 text-xl font-semibold">AI-Powered Analysis</h2>
          <p style={{ color: theme.colors.text.secondary }}>
            Automatically detect duplicate issues and suggest relevant labels using advanced AI.
          </p>
        </div>

        <div className="rounded-lg p-6" style={{ backgroundColor: theme.colors.background.secondary }}>
          <div className="mb-4 inline-block rounded-lg p-2" style={{ backgroundColor: theme.colors.features.batch.background }}>
            <Zap className="h-6 w-6" style={{ color: theme.colors.features.batch.icon }} />
          </div>
          <h2 className="mb-2 text-xl font-semibold">Batch Actions</h2>
          <p style={{ color: theme.colors.text.secondary }}>
            Efficiently manage multiple issues at once with powerful batch operations.
          </p>
        </div>

        <div className="rounded-lg p-6" style={{ backgroundColor: theme.colors.background.secondary }}>
          <div className="mb-4 inline-block rounded-lg p-2" style={{ backgroundColor: theme.colors.features.search.background }}>
            <Search className="h-6 w-6" style={{ color: theme.colors.features.search.icon }} />
          </div>
          <h2 className="mb-2 text-xl font-semibold">Smart Search</h2>
          <p style={{ color: theme.colors.text.secondary }}>
            Find similar issues instantly with semantic search capabilities.
          </p>
        </div>

        <div className="rounded-lg p-6" style={{ backgroundColor: theme.colors.background.secondary }}>
          <div className="mb-4 inline-block rounded-lg p-2" style={{ backgroundColor: theme.colors.features.workflows.background }}>
            <Box className="h-6 w-6" style={{ color: theme.colors.features.workflows.icon }} />
          </div>
          <h2 className="mb-2 text-xl font-semibold">Automated Workflows</h2>
          <p style={{ color: theme.colors.text.secondary }}>
            Set up custom automation rules to streamline your workflow.
          </p>
        </div>
      </div>

      {/* Support Section */}
      <div className="w-full px-4 py-16 text-center" style={{ backgroundColor: theme.colors.background.secondary }}>
        <h2 className="mb-4 text-3xl font-bold">Support RepoMonitor</h2>
        <p className="mx-auto mb-8 max-w-2xl" style={{ color: theme.colors.text.secondary }}>
          RepoMonitor is an open-source project that helps developers monitor and manage their repositories.
          Your support helps us continue development and keep the service running.
        </p>
        <a
          href="https://github.com/sponsors/yourusername"
          className="inline-flex items-center gap-2 rounded-lg px-6 py-3 font-semibold transition-colors hover:bg-[#2ea043]"
          style={{
            backgroundColor: theme.colors.brand.primary,
            color: theme.colors.text.primary
          }}
        >
          <span className="text-xl">♥</span>
          Support this Project
        </a>
      </div>

      <Footer />
    </div>
  );
}
