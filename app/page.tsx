import React from 'react';
import { HomeContainer } from '../components/layout/home-container';
import { AuthButton } from '../components/layout/auth-button';
import { Github, Sparkles, Zap, Search, Bot, Heart } from 'lucide-react';

const features = [
  {
    icon: Sparkles,
    title: 'AI-Powered Analysis',
    description: 'Automatically detect duplicate issues and suggest relevant labels using advanced AI.',
    iconClassName: 'text-gray-300'
  },
  {
    icon: Zap,
    title: 'Batch Actions',
    description: 'Efficiently manage multiple issues at once with powerful batch operations.',
    iconClassName: 'text-gray-300'
  },
  {
    icon: Search,
    title: 'Smart Search',
    description: 'Find similar issues instantly with semantic search capabilities.',
    iconClassName: 'text-gray-300'
  },
  {
    icon: Bot,
    title: 'Automated Workflows',
    description: 'Set up custom automation rules to streamline your workflow.',
    iconClassName: 'text-gray-300'
  }
];

export default function Home() {
  return (
    <HomeContainer>
      <div className="w-full max-w-6xl space-y-12">
        <div className="text-center space-y-4">
          <Github className="h-12 w-12 text-gray-300 mx-auto" />
          <div className="space-y-4 max-w-2xl mx-auto">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
              RepoMonitor
            </h1>
            <p className="text-xl text-muted-foreground">
              Monitor and manage your GitHub repositories with AI-powered insights
              and automated workflows.
            </p>
          </div>
          <div className="pt-4">
            <AuthButton />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`group relative rounded-2xl border bg-card p-6 transition-all duration-300 hover:-translate-y-1 ${
                index === 0 ? 'hover:shadow-[0_0_30px_-5px_rgba(249,115,22,0.4)]' :
                index === 1 ? 'hover:shadow-[0_0_30px_-5px_rgba(245,158,11,0.4)]' :
                index === 2 ? 'hover:shadow-[0_0_30px_-5px_rgba(239,68,68,0.4)]' :
                'hover:shadow-[0_0_30px_-5px_rgba(236,72,153,0.4)]'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`flex items-center ${
                  index === 0 ? 'text-orange-500' :
                  index === 1 ? 'bg-amber-500/10 text-amber-500' :
                  index === 2 ? 'bg-red-600/10 text-red-500' :
                  'bg-pink-700/10 text-pink-500'
                }`} style={{ background: 'none' }}>
                  <feature.icon className={`h-6 w-6 ${feature.iconClassName}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground/80">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t pt-8 pb-16">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold tracking-tight">Support RepoMonitor</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              RepoMonitor is an open-source project that helps developers monitor and manage their repositories.
              Your support helps us continue development and keep the service running.
            </p>
            <div className="pt-2">
              <a
                href="https://github.com/sponsors/repomonitor"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary px-8 text-base"
              >
                <Heart className="w-6 h-6 mr-2" />
                Support this Project
              </a>
            </div>
          </div>
        </div>
      </div>
    </HomeContainer>
  );
}
