import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    server: {
      port: 5174,
      host: '0.0.0.0',
    },

    build: {
      chunkSizeWarningLimit: 2000,
    },

    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },

    resolve: {
      // Prevent React duplication issues
      dedupe: ['react', 'react-dom'],
      alias: {
        react: path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
        '@': path.resolve(__dirname, '.'),
      },
    },

    optimizeDeps: {
      include: ['react', 'react-dom', 'react/jsx-runtime'],
    },
  };
});