import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/auth/supabase-client';
import { HeaderLogo } from '@/components/layout/header-logo';
import { GitHubLoginButton } from '@/components/auth/github-login-button';
import { motion } from 'framer-motion';
import { Shield, Zap, LineChart, Check } from 'lucide-react';
import config from '../../config.json';

const plans = config.plans;

const features = [
  {
    icon: Shield,
    title: "Smart Issue Detection",
    description: "Automatically detect and group duplicate issues using AI-powered analysis"
  },
  {
    icon: Zap,
    title: "Real-time Monitoring",
    description: "Stay updated with instant notifications about your repositories' activity"
  },
  {
    icon: LineChart,
    title: "Advanced Analytics",
    description: "Track trends and patterns across all your repositories with detailed insights"
  }
];

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
          if (returnTo) {
            const url = new URL(returnTo, window.location.origin);
            if (url.origin === window.location.origin) {
              navigate(returnTo, { replace: true });
              return;
            }
          }
          navigate('/dashboard', { replace: true });
        }
      } catch (error) {
        console.error('Error checking session:', error);
      }
    };

    checkSession();
  }, [navigate, returnTo]);

  return (
    <div className="min-h-screen flex flex-col bg-[#0d1117]">
      {/* Header */}
      <header className="h-16 border-b border-[#30363d] bg-[#161b22]">
        <div className="flex items-center justify-between px-6 h-full max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <HeaderLogo />
          </motion.div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Text Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-8"
            >
              <div className="space-y-4">
                <h1 className="text-5xl font-bold text-[#c9d1d9] leading-tight">
                  Supercharge Your <span className="text-[#238636]">GitHub</span> Repository Management
                </h1>
                <p className="text-xl text-[#8b949e] leading-relaxed">
                  Harness the power of AI to detect duplicate issues, track repository health, and streamline your development workflow.
                </p>
              </div>

              <div>
                <GitHubLoginButton returnTo={returnTo} />
              </div>
            </motion.div>

            {/* Right Column - Feature Preview */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="aspect-video rounded-xl overflow-hidden border border-[#30363d] bg-[#161b22] shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1618477388954-7852f32655ec?auto=format&fit=crop&w=1200&q=80"
                  alt="Repository analytics dashboard preview"
                  className="w-full h-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-[#0d1117] via-transparent to-transparent" />
              </div>
            </motion.div>
          </div>
        </div>

        {/* Features Section */}
        <div id="features" className="bg-[#161b22] border-t border-[#30363d] py-24">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl font-bold text-[#c9d1d9] mb-4">
                Powerful Features for Modern Development
              </h2>
              <p className="text-[#8b949e] text-lg max-w-2xl mx-auto">
                RepoMonitor combines AI-powered analysis with intuitive tools to help you manage your GitHub repositories more effectively.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="p-6 rounded-xl border border-[#30363d] bg-[#0d1117] hover:border-[#238636] transition-colors group"
                >
                  <div className="w-12 h-12 rounded-lg bg-[#238636] bg-opacity-10 flex items-center justify-center mb-4 group-hover:bg-opacity-20 transition-colors">
                    <feature.icon className="w-6 h-6 text-[#238636]" />
                  </div>
                  <h3 className="text-xl font-semibold text-[#c9d1d9] mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-[#8b949e]">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="bg-[#0d1117] py-24">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl font-bold text-[#c9d1d9] mb-4">
                Simple, Transparent Pricing
              </h2>
              <p className="text-[#8b949e] text-lg max-w-2xl mx-auto">
                Choose the plan that best fits your needs. Start with our free tier and upgrade as you grow.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Free Plan */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="p-8 rounded-xl border border-[#30363d] bg-[#161b22] hover:border-[#238636] transition-colors"
              >
                <div className="text-center mb-8">
                  <h3 className="text-xl font-bold text-[#c9d1d9] mb-2">{plans.free.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-[#c9d1d9]">${plans.free.price}</span>
                    <span className="text-[#8b949e]">/month</span>
                  </div>
                </div>
                <div className="space-y-4 mb-8">
                  <div className="text-[#8b949e] text-center">
                    <span className="text-[#c9d1d9] font-semibold">{plans.free.analysesPerMonth}</span> analyses per month
                  </div>
                  <ul className="space-y-3">
                    {plans.free.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-3 text-[#8b949e]">
                        <Check className="w-5 h-5 text-[#238636]" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="text-center">
                  <GitHubLoginButton returnTo={returnTo} />
                </div>
              </motion.div>

              {/* Pro Plan */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                viewport={{ once: true }}
                className="p-8 rounded-xl border-2 border-[#238636] bg-[#161b22] relative"
              >
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-[#238636] text-white px-3 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
                <div className="text-center mb-8">
                  <h3 className="text-xl font-bold text-[#c9d1d9] mb-2">{plans.pro.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-[#c9d1d9]">${plans.pro.price}</span>
                    <span className="text-[#8b949e]">/month</span>
                  </div>
                </div>
                <div className="space-y-4 mb-8">
                  <div className="text-[#8b949e] text-center">
                    <span className="text-[#c9d1d9] font-semibold">{plans.pro.analysesPerMonth}</span> analyses per month
                  </div>
                  <ul className="space-y-3">
                    {plans.pro.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-3 text-[#8b949e]">
                        <Check className="w-5 h-5 text-[#238636]" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="text-center">
                  <GitHubLoginButton returnTo={returnTo} />
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#30363d] bg-[#161b22] py-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-6">
              <a
                href="https://github.com/codewithtyler/RepoMonitor"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#8b949e] hover:text-[#c9d1d9] transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                View on GitHub
              </a>
              <a
                href="https://github.com/codewithtyler/RepoMonitor/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#8b949e] hover:text-[#c9d1d9] transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Report an Issue
              </a>
            </div>
            <p className="text-[#8b949e] text-sm">
              Built with React, TypeScript, and OpenAI
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
