import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    // The API is proxied rather than called on its own origin so that requests
    // stay same-origin in development: the session cookie is httpOnly and
    // SameSite, and a cross-origin call from :5173 to :8081 would not carry it.
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET ?? 'http://localhost:8081',
        changeOrigin: true,
      },
    },
  },
})
