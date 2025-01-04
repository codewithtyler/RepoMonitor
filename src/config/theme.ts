export const theme = {
  colors: {
    brand: {
      primary: '#0ea5e9', // sky-500
      secondary: '#0284c7', // sky-600
    },
    text: {
      primary: '#f8fafc', // slate-50
      secondary: '#94a3b8', // slate-400
    },
    background: {
      primary: '#0f172a', // slate-900
      secondary: '#1e293b', // slate-800
    },
    border: {
      primary: '#334155', // slate-700
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
        icon: '#eab308', // yellow-500
        background: 'rgba(234, 179, 8, 0.1)', // yellow-500/10
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