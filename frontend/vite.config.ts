import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { defineConfig } from 'vite'

const AUTH_TARGET = process.env.VITE_AUTH_TARGET ?? 'http://localhost:8081'
const DOMAIN_TARGET = process.env.VITE_DOMAIN_TARGET ?? 'http://localhost:8085'
const USE_POLLING = process.env.VITE_USE_POLLING === 'true'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    watch: { usePolling: USE_POLLING, interval: 300 },
    proxy: {
      '/api/auth': {
        target: AUTH_TARGET,
        changeOrigin: true,
      },
      '/api': {
        target: DOMAIN_TARGET,
        changeOrigin: true,
      },
    },
  },
})