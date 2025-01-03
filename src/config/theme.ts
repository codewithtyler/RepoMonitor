export const theme = {
  colors: {
    // Background colors
    background: {
      primary: '#111827',
      secondary: '#1f2937',
    },
    // Text colors
    text: {
      primary: '#FFFFFF',
      secondary: '#9CA3AF', // gray-400
    },
    // Brand colors
    brand: {
      primary: '#238636',
      primaryHover: '#2ea043',
    },
    // Feature icons
    features: {
      analysis: {
        icon: '#F97316', // orange-500
        background: 'rgba(249, 115, 22, 0.1)', // orange-500/10
      },
      batch: {
        icon: '#EAB308', // yellow-500
        background: 'rgba(234, 179, 8, 0.1)', // yellow-500/10
      },
      search: {
        icon: '#EF4444', // red-500
        background: 'rgba(239, 68, 68, 0.1)', // red-500/10
      },
      workflows: {
        icon: '#EC4899', // pink-500
        background: 'rgba(236, 72, 153, 0.1)', // pink-500/10
      },
    },
    // Border colors
    border: {
      primary: '#30363D', // gray-800
    },
  },
} as const; 