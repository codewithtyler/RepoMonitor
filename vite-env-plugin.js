// Custom Vite plugin to handle environment variables
export default function envPlugin() {
  return {
    name: 'vite-plugin-env-fix',
    configResolved() {
      // This is a safer approach that doesn't expose sensitive values
      // It lets Vite handle the environment variables securely
      console.log('Environment plugin initialized');
    }
  };
}
