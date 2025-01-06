export const theme = {
  colors: {
    brand: {
      primary: '#238636',
      secondary: '#0284c7', // sky-600
    },
    text: {
      primary: '#c9d1d9',
      secondary: '#8b949e',
      error: '#f85149'
    },
    background: {
      primary: '#0d1117',
      secondary: '#161b22',
      tooltip: '#1c2128'
    },
    border: {
      primary: '#30363d',
      secondary: '#475569', // slate-600
    },
    error: {
      primary: '#ef4444', // red-500
      secondary: '#dc2626', // red-600
    },
    success: {
      primary: '#22c55e', // green-500
      secondary: '#16a34a', // green-600
    },
    warning: {
      primary: '#f59e0b', // amber-500
      secondary: '#d97706', // amber-600
    },
    features: {
      analysis: {
        icon: '#f97316', // orange-500
        background: 'rgba(249, 115, 22, 0.1)', // orange-500/10
      },
      batch: {
        icon: '#f59e0b', // yellow-500
        background: 'rgba(245, 158, 11, 0.1)', // yellow-500/10
      },
      search: {
        icon: '#ef4444', // red-500
        background: 'rgba(239, 68, 68, 0.1)', // red-500/10
      },
      workflows: {
        icon: '#ec4899', // pink-500
        background: 'rgba(236, 72, 153, 0.1)', // pink-500/10
      }
    }
  }
} as const; 