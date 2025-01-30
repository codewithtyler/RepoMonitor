# RepoMonitor

A modern web application for monitoring and analyzing GitHub repositories. Built with React, TypeScript, and Vite.

## Features

- 🔍 Smart repository search with infinite scroll
- 📊 Repository analysis and monitoring
- 🎨 Modern UI with dark theme support
- ⚡ Fast and responsive experience
- 🔄 Real-time updates
- 📱 Mobile-friendly design
- 🔐 Secure token storage with pgsodium encryption

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher
- GitHub account for API access
- Supabase project with pgsodium extension enabled

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/RepoMonitor.git
cd RepoMonitor
```

2. Install dependencies:
```bash
npm install
```

3. Copy the environment file and configure your settings:
```bash
cp .env.example .env
```

4. Run database migrations:
```bash
supabase db reset
```

5. Start the development server:
```bash
npm run dev
```

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run test` - Run tests

## Tech Stack

- React 18
- TypeScript
- Vite
- TailwindCSS
- GitHub API
- React Query
- Supabase with pgsodium encryption

## Documentation

Detailed documentation for features and components can be found in the `docs/` directory:
- [Token Encryption](docs/features/token-encryption.md)
- [Search Component](docs/features/search-component.md)
- [Favorites](docs/features/favorites.md)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
