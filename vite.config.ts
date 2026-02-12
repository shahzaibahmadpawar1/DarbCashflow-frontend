import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Change to a function to access 'mode'
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // The third parameter '' loads all env vars regardless of prefix
  const env = loadEnv(mode, process.cwd(), '')

  return {
    base: '/',
    plugins: [react()],
    server: {
      port: 3000,
      proxy: {
        '/api': {
          // Use 'env' variable instead of process.env
          target: env.VITE_API_URL || 'http://localhost:5000',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  }
})